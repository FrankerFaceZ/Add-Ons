import { EPPO_OVERRIDES_KEY_CONFIG } from "../../../utilities/constants/config";

export class EppoManager {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.site = parent.site;
    this.log = parent.log;

    this._cache = new Map();

    this._hookEppoConfig();
  }

  initialize() {
    this._applyOverridesToExistingConfig();

    this.log.info("[Eppo Manager] Initialized with config hook active");
  }

  _hookEppoConfig() {
    const self = this;
    const existing = window.__setEppoConfig;

    function wrapFn(fn) {
      return (config) => {
        self.log.info("[Eppo Manager] Intercepted Eppo config reload, injecting overrides...");
        const modified = self._injectOverridesIntoConfig(config);
        fn(modified);
        self._cache.clear();
      };
    }

    Object.defineProperty(window, "__setEppoConfig", {
      configurable: true,
      get() {
        return undefined;
      },
      set(fn) {
        Object.defineProperty(window, "__setEppoConfig", {
          configurable: true,
          writable: true,
          value: wrapFn(fn),
        });
      },
    });

    if (existing) {
      window.__setEppoConfig = existing;
    }

    this.log.info("[Eppo Manager] Hooked __setEppoConfig to inject overrides");
  }

  _applyOverridesToExistingConfig() {
    if (!window.__eppoConfig) {
      this.log.warn("[Eppo Manager] No existing Eppo config found");
      return;
    }

    const overrides = this._getOverrides();
    if (!Object.keys(overrides).length) {
      this.log.info("[Eppo Manager] No overrides to apply");
      return;
    }

    this.log.info("[Eppo Manager] Applying overrides to existing config...");
    this._injectOverridesIntoConfig(window.__eppoConfig);
    this.log.info(`[Eppo Manager] Applied ${Object.keys(overrides).length} overrides to existing config`);
  }

  _injectOverridesIntoConfig(config) {
    if (!config?.flags) return config;

    const overrides = this._getOverrides();
    if (!Object.keys(overrides).length) return config;

    for (const [flagKey, overrideValue] of Object.entries(overrides)) {
      this._injectOverrideForKey(config, flagKey, overrideValue);
    }

    return config;
  }

  _injectOverrideForKey(config, flagKey, overrideValue) {
    if (!config?.flags) return;

    const flag = config.flags[flagKey];
    if (!flag) {
      this.log.warn(`[Eppo Manager] Flag ${flagKey} not found in config`);
      return;
    }

    flag.allocations = flag.allocations.filter(
      (a) => a.key !== `ffz-override-${flagKey}`
    );

    if (overrideValue === undefined) return;

    let targetVariationKey = null;
    for (const [varKey, varData] of Object.entries(flag.variations)) {
      if (varData.value === overrideValue) {
        targetVariationKey = varKey;
        break;
      }
    }

    if (!targetVariationKey) {
      this.log.warn(
        `[Eppo Manager] No variation matches override value for ${flagKey}:`,
        overrideValue
      );
      return;
    }

    flag.allocations.unshift({
      key: `ffz-override-${flagKey}`,
      startAt: new Date(0).toISOString(),
      endAt: "9999-12-31T00:00:00.000Z",
      splits: [{ variationKey: targetVariationKey, shards: [] }],
      doLog: false,
    });

    this.log.info(
      `[Eppo Manager] Injected override for ${flagKey} = ${overrideValue} (variation: ${targetVariationKey})`
    );
  }

  getEppoFlags() {
    return window.__eppoConfig?.flags ?? {};
  }

  getFlag(key) {
    return this.getEppoFlags()[key] ?? null;
  }

  getAssignment(key) {
    if (this._cache.has(key)) return this._cache.get(key);

    const value = this._computeAssignment(key);
    this._cache.set(key, value);
    return value;
  }

  _computeAssignment(key) {
    const overrides = this._getOverrides();
    if (overrides[key] !== undefined) return overrides[key];

    const flag = this.getFlag(key);
    if (!flag || !flag.enabled) return null;

    for (const allocation of flag.allocations ?? []) {
      for (const split of allocation.splits ?? []) {
        if (!split.shards || split.shards.length === 0) {
          const variation = flag.variations[split.variationKey];
          return variation ? variation.value : split.variationKey;
        }
      }
    }

    const firstKey = Object.keys(flag.variations ?? {})[0];
    if (firstKey) {
      const variation = flag.variations[firstKey];
      return variation ? variation.value : firstKey;
    }

    return null;
  }

  _invalidateKey(key) {
    this._cache.delete(key);
  }

  getVariationType(key) {
    return this.getFlag(key)?.variationType ?? null;
  }

  getVariations(key) {
    const flag = this.getFlag(key);
    if (!flag?.variations) return [];

    return Object.entries(flag.variations).map(([varKey, varData]) => ({
      key: varKey,
      value: varData.value,
    }));
  }

  hasOverride(key) {
    const overrides = this._getOverrides();
    return overrides[key] !== undefined;
  }

  setOverride(key, value) {
    const overrides = this._getOverrides();

    const variationType = this.getVariationType(key);
    const parsedValue = this._parseValueByType(value, variationType);

    overrides[key] = parsedValue;
    this._saveOverrides(overrides);

    if (window.__eppoConfig) {
      this._injectOverrideForKey(window.__eppoConfig, key, parsedValue);
    }

    this._invalidateKey(key);
    const newValue = this.getAssignment(key);

    this.log.info(`[Eppo Manager] Override set: ${key} = ${parsedValue}`);
    this.log.warn("[Eppo Manager] May need to refresh for some features to update.");

    this.parent.emit(`:eppo-changed:${key}`, newValue);
    this.parent.emit(":eppo-changed", key, newValue);
  }

  deleteOverride(key) {
    const overrides = this._getOverrides();
    if (overrides[key] === undefined) return;

    delete overrides[key];
    this._saveOverrides(overrides);

    if (window.__eppoConfig) {
      this._injectOverrideForKey(window.__eppoConfig, key, undefined);
    }

    this._invalidateKey(key);
    const newValue = this.getAssignment(key);

    this.log.info(`[Eppo Manager] Override deleted: ${key}`);
    this.log.warn("[Eppo Manager] May need to refresh for some features to update.");

    this.parent.emit(`:eppo-changed:${key}`, newValue);
    this.parent.emit(":eppo-changed", key, newValue);
  }

  _parseValueByType(value, variationType) {
    switch (variationType) {
      case "BOOLEAN":
        return value === true || value === "true";

      case "INTEGER":
        return parseInt(value, 10);

      case "JSON":
        if (typeof value === "string") {
          try {
            return JSON.parse(value);
          } catch (e) {
            this.log.warn("[Eppo Manager] Invalid JSON value:", value);
            return value;
          }
        }
        return value;

      case "STRING":
      default:
        return String(value);
    }
  }

  _getOverrides() {
    try {
      return this.settings.provider.get(EPPO_OVERRIDES_KEY_CONFIG) ?? {};
    } catch (e) {
      this.log.error("[Eppo Manager] Error loading overrides:", e);
      return {};
    }
  }

  _saveOverrides(overrides) {
    try {
      if (!overrides || !Object.keys(overrides).length) {
        this.settings.provider.delete(EPPO_OVERRIDES_KEY_CONFIG);
      } else {
        this.settings.provider.set(EPPO_OVERRIDES_KEY_CONFIG, overrides);
      }
    } catch (e) {
      this.log.error("[Eppo Manager] Error saving overrides:", e);
    }
  }

  generateLog() {
    const out = ["Eppo Flags:", ""];
    const flags = this.getEppoFlags();

    for (const [key, flag] of Object.entries(flags)) {
      if (!flag.enabled) continue;

      const assignment = this.getAssignment(key);
      const hasOverride = this.hasOverride(key);
      const type = flag.variationType;

      out.push(
        `${key}: ${assignment}${hasOverride ? " (Override)" : ""} (type: ${type})`
      );
    }

    return out.join("\n");
  }
}