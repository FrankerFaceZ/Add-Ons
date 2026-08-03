import { BAD_USERS } from "../../../utilities/constants/types";

export default class StopAutoRotate {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.router = parent.router;
    this.site = parent.site;
    this.log = parent.log;

    this.isActive = false;
    this.ErrorBoundaryComponent = null;

    this.prop_overrides = new Map();
    this.functional_wrappers = new Map();

    this.onMountLeaderboard = this.onMountLeaderboard.bind(this);
    this.onUpdateLeaderboard = this.onUpdateLeaderboard.bind(this);
  }

  initialize() {
    const enabled = this.settings.get("addon.trubbel.channel.chat.leaderboard.shouldAutoRotate");
    if (enabled) {
      this.handleNavigation();
    } else {
      this.disable();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.handleNavigation();
    } else {
      this.disable();
    }
  }

  handleNavigation() {
    const chatRoutes = this.site.constructor.CHAT_ROUTES;
    const currentRoute = this.router?.current?.name;

    let pathname;

    if (this.router?.match && this.router.match[1]) {
      pathname = this.router.match[1];
    } else {
      const location = this.router?.location;
      const segment = location?.split("/").filter(segment => segment.length > 0);
      pathname = segment?.[0];
    }

    if (chatRoutes.includes(currentRoute) && pathname && !BAD_USERS.includes(pathname)) {
      const previewType = this.settings.get("addon.trubbel.channel.chat.leaderboard.shouldAutoRotate");
      if (previewType > 0 && !this.isActive) {
        this.log.info("[StopAutoRotate] enable()");
        this.enable();
      }
    } else {
      if (this.isActive) {
        this.log.info("[StopAutoRotate] disable()");
        this.disable();
      }
    }
  }

  enable() {
    if (this.isActive) return;
    this.isActive = true;

    if (!this.ErrorBoundaryComponent) {
      this.ErrorBoundaryComponent = this.site.children.fine.define(
        "trubbel-leaderboard-error-boundary",
        n =>
          n.props?.name &&
          n.props?.onError &&
          n.props?.children &&
          n.onErrorBoundaryTestEmit
      );
    }

    this.setPropOverride("ChannelLeaderboard", "shouldAutoRotate", false);

    this.ErrorBoundaryComponent.on("mount", this.onMountLeaderboard);
    this.ErrorBoundaryComponent.on("update", this.onUpdateLeaderboard);
    this.ErrorBoundaryComponent.each(inst => this.apply(inst));
  }

  disable() {
    if (!this.isActive) return;

    this.isActive = false;
    this.log.info("[StopAutoRotate] disable()");

    if (this.ErrorBoundaryComponent) {
      this.ErrorBoundaryComponent.off("mount", this.onMountLeaderboard);
      this.ErrorBoundaryComponent.off("update", this.onUpdateLeaderboard);
    }

    this.clearAllPropOverrides("ChannelLeaderboard");
  }

  onMountLeaderboard(inst) {
    if (!this.prop_overrides.has(inst.props?.name))
      return;

    this.apply(inst);
  }

  onUpdateLeaderboard(inst) {
    if (!this.prop_overrides.has(inst.props?.name))
      return;

    this.apply(inst);
  }

  apply(inst) {
    const replaced = this.applyFiberOverrides(inst);

    if (replaced)
      inst.forceUpdate();
  }

  walkFiber(root, callback) {
    let node = root.child;

    while (node && node !== root) {
      try {
        callback(node);
      } catch (err) {
        this.log.error("[StopAutoRotate] walkFiber callback error", err);
      }
      try {
        if (node.child) {
          node = node.child;
        } else {
          while (node && node !== root) {
            if (node.sibling) {
              node = node.sibling;
              break;
            }
            node = node.return;
          }
        }
      } catch (err) {
        this.log.error("[StopAutoRotate] walkFiber traversal error, aborting walk", err);
        break;
      }
    }
  }

  applyFiberOverrides(inst) {
    const name = inst.props?.name;

    if (!name || !this.prop_overrides.has(name))
      return false;

    const fiber = inst._reactInternals ?? inst._reactInternalFiber;
    if (!fiber)
      return false;

    const overrides = this.prop_overrides.get(name);
    const overrideKeys = Object.keys(overrides);
    let replaced = false;

    this.walkFiber(fiber, node => {
      const isFunctionComponent = typeof node.type === "function" && !node.type?.prototype?.render;

      if (!isFunctionComponent)
        return;

      if (node.type.__trubbelWrapped)
        return;

      const nodeProps = node.memoizedProps ?? {};
      const matchesOverrideKey = overrideKeys.some(k => k in nodeProps);

      if (!matchesOverrideKey)
        return;

      const originalFn = node.type;

      if (!this.functional_wrappers.has(originalFn)) {
        const t = this;
        function TrubbelFunctionalWrapper(props) {
          try {
            const extra = t.prop_overrides.get(name);
            return originalFn(extra ? Object.assign({}, props, extra) : props);
          } catch (err) {
            t.log.error(`[StopAutoRotate] FunctionalWrapper error for "${name}", falling back to original props`, err);
            try {
              return originalFn(props);
            } catch (fallbackErr) {
              t.log.error(`[StopAutoRotate] FunctionalWrapper fallback also failed for "${name}"`, fallbackErr);
              return null;
            }
          }
        }
        TrubbelFunctionalWrapper.__trubbelWrapped = true;
        TrubbelFunctionalWrapper.__trubbelOriginal = originalFn;
        TrubbelFunctionalWrapper.displayName = `TrubbelWrapper(${name})`;
        this.functional_wrappers.set(originalFn, TrubbelFunctionalWrapper);

        this.log.info("[StopAutoRotate] applyFiberOverrides() created new FunctionalWrapper", {
          name,
          componentName: originalFn.name || originalFn.displayName
        });
      }

      const wrapper = this.functional_wrappers.get(originalFn);
      node.type = wrapper;
      if (node.alternate)
        node.alternate.type = wrapper;

      replaced = true;
    });

    return replaced;
  }

  clearFiberOverrides(name) {
    this.log.info("[StopAutoRotate] clearFiberOverrides() called", { name });

    if (this.ErrorBoundaryComponent) {
      for (const inst of this.ErrorBoundaryComponent.instances) {
        if (inst.props?.name !== name)
          continue;

        const fiber = inst._reactInternals ?? inst._reactInternalFiber;
        if (!fiber)
          continue;

        this.walkFiber(fiber, node => {
          const wrapper = node.type;
          if (typeof wrapper === "function" && wrapper.__trubbelWrapped && wrapper.__trubbelOriginal) {
            const originalFn = wrapper.__trubbelOriginal;
            node.type = originalFn;
            if (node.alternate)
              node.alternate.type = originalFn;

            this.log.info("[StopAutoRotate] clearFiberOverrides() restored original fiber.type", {
              name,
              componentName: originalFn.name || originalFn.displayName
            });
          }
        });

        inst.forceUpdate();
      }
    }

    for (const [originalFn, wrapper] of this.functional_wrappers) {
      if (wrapper.displayName === `TrubbelWrapper(${name})`)
        this.functional_wrappers.delete(originalFn);
    }
  }

  setPropOverride(cmp, key, value) {
    this.log.info("[StopAutoRotate] setPropOverride() called", { cmp, key, value });

    let existing = this.prop_overrides.get(cmp);
    if (!existing) {
      existing = {};
      this.prop_overrides.set(cmp, existing);
    }
    existing[key] = value;

    this.log.info("[StopAutoRotate] setPropOverride() prop_overrides now", {
      cmp,
      current: { ...existing }
    });

    this.update(cmp);
  }

  clearPropOverride(cmp, key) {
    this.log.info("[StopAutoRotate] clearPropOverride() called", { cmp, key });

    const existing = this.prop_overrides.get(cmp);
    if (!existing)
      return;
    delete existing[key];
    if (Object.keys(existing).length === 0) {
      this.prop_overrides.delete(cmp);
      this.clearFiberOverrides(cmp);
    }
    this.update(cmp);
  }

  clearAllPropOverrides(cmp) {
    this.log.info("[StopAutoRotate] clearAllPropOverrides() called", { cmp });

    if (this.prop_overrides.has(cmp)) {
      this.prop_overrides.delete(cmp);
      this.clearFiberOverrides(cmp);
      this.update(cmp);
    }
  }

  update(cmp) {
    if (!this.ErrorBoundaryComponent) {
      this.log.info("[StopAutoRotate] update() called but ErrorBoundaryComponent not yet resolved", { cmp });
      return;
    }

    for (const inst of this.ErrorBoundaryComponent.instances) {
      if (inst.props?.name === cmp)
        this.apply(inst);
    }
  }
}