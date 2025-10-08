import { COLLAPSIBLE_DROPS_KEY_CONFIG } from "../../utilities/constants/config";

const { createElement } = FrankerFaceZ.utilities.dom;

export default class CollapsibleDrops {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.router = parent.router;
    this.log = parent.log;

    this.isActive = false;

    this.handleNavigation = this.handleNavigation.bind(this);
    this.handleSettingChange = this.handleSettingChange.bind(this);
  }

  initialize() {
    const enabled = this.settings.get("addon.trubbel.inventory.drops.collapsible");
    if (enabled) {
      this.handleNavigation();
    } else {
      this.disableCollapsibleDrops();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.log.info("[Collapsible Drops] Enabling collapsible drops");
      this.handleNavigation();
    } else {
      this.log.info("[Collapsible Drops] Disabling collapsible drops");
      this.disableCollapsibleDrops();
    }
  }

  handleNavigation() {
    const currentLocation = this.router?.location;
    const oldLocation = this.router?.old_location;

    const isCurrentInventory = currentLocation === "/drops/inventory" || currentLocation === "/inventory";
    const wasInventory = oldLocation === "/drops/inventory" || oldLocation === "/inventory";

    if (isCurrentInventory && this.settings.get("addon.trubbel.inventory.drops.collapsible")) {
      if (!this.isActive) {
        this.log.info("[Collapsible Drops] Entering inventory page, enabling collapsible drops");
        this.enableCollapsibleDrops();
      }
    } else if (wasInventory && !isCurrentInventory) {
      if (this.isActive) {
        this.log.info("[Collapsible Drops] Leaving inventory page");
        this.cleanupCollapsibleDrops();
        this.isActive = false;
      }
    }
  }

  enableCollapsibleDrops() {
    if (this.isActive) return;

    this.log.info("[Collapsible Drops] Setting up collapsible drops functionality");
    this.isActive = true;

    this.setupCollapsibleDrops();
  }

  async setupCollapsibleDrops() {
    if (!this.isActive) {
      this.log.info("[Collapsible Drops] Not active, skipping setup");
      return;
    }

    const currentLocation = this.router?.location;
    if (currentLocation !== "/drops/inventory" && currentLocation !== "/inventory") {
      this.log.info("[Collapsible Drops] Not on inventory page, skipping setup");
      return;
    }

    try {
      this.log.info("[Collapsible Drops] Setting up collapsible drops for inventory");
      const infoElements = await this.waitForElements();

      if (!this.isActive) return;

      this.cleanupStorage();
      infoElements.forEach(element => this.makeCollapsible(element));
      this.log.info("[Collapsible Drops] Successfully set up collapsible drops");
    } catch (error) {
      this.log.error("[Collapsible Drops] Error setting up collapsible drops:", error);
    }
  }

  cleanupCollapsibleDrops() {
    this.removeExistingCollapsibleElements(false);
  }

  disableCollapsibleDrops() {
    if (!this.isActive) return;

    this.log.info("[Collapsible Drops] Removing collapsible drops functionality");
    this.isActive = false;

    this.removeExistingCollapsibleElements(true);
  }

  removeExistingCollapsibleElements(clearStorage = false) {
    const processedElements = document.querySelectorAll("[data-collapsible-processed=\"true\"]");
    processedElements.forEach(element => {
      delete element.dataset.collapsibleProcessed;

      const parentElement = element.parentElement;
      if (parentElement) {
        parentElement.style.height = "";
        parentElement.style.overflow = "";
        parentElement.style.marginBottom = "";
        parentElement.style.position = "";

        const collapseBtn = parentElement.querySelector(".drops-collapse-button");
        if (collapseBtn) {
          collapseBtn.remove();
        }
      }
    });

    if (clearStorage) {
      this.settings.provider.delete(COLLAPSIBLE_DROPS_KEY_CONFIG);
    }
  }

  loadCollapsedState() {
    try {
      const stored = this.settings.provider.get(COLLAPSIBLE_DROPS_KEY_CONFIG);
      return stored ? stored : {};
    } catch (e) {
      this.log.error("[Collapsible Drops] Error loading collapsed state:", e);
      return {};
    }
  }

  saveCollapsedState(state) {
    try {
      this.settings.provider.set(COLLAPSIBLE_DROPS_KEY_CONFIG, state);
    } catch (e) {
      this.log.error("[Collapsible Drops] Error saving collapsed state:", e);
    }
  }

  cleanupStorage() {
    const campaigns = document.querySelectorAll(".inventory-campaign-info .tw-link");
    if (campaigns.length === 0) return;

    const state = this.loadCollapsedState();
    const currentCampaigns = new Set(Array.from(campaigns).map(link => link.textContent));

    let hasChanges = false;
    Object.keys(state).forEach(campaignName => {
      if (!currentCampaigns.has(campaignName)) {
        this.log.info(`[Collapsible Drops] Removing stale campaign state: ${campaignName}`);
        delete state[campaignName];
        hasChanges = true;
      }
    });

    if (hasChanges) {
      this.saveCollapsedState(state);
    }
  }

  createCollapseButton() {
    return (
      <div
        className="drops-collapse-button"
        style={{
          background: "none",
          border: "none",
          color: "var(--color-text-alt-2)",
          cursor: "pointer",
          padding: "2px",
          borderRadius: "0.4rem",
          fontSize: "14px",
          userSelect: "none",
          transition: "background-color 0.2s ease"
        }}
        onMouseEnter={(e) => Object.assign(e.target.style, {
          backgroundColor: "var(--color-background-button-text-hover)"
        })}
        onMouseLeave={(e) => Object.assign(e.target.style, {
          backgroundColor: "transparent"
        })}
      >
      </div>
    );
  }

  makeCollapsible(infoElement) {
    if (!this.isActive) return;
    if (infoElement.dataset.collapsibleProcessed) return;

    infoElement.dataset.collapsibleProcessed = "true";
    const nameLink = infoElement.querySelector(".tw-link");
    if (!nameLink) return;

    const campaignName = nameLink.textContent;
    const parentElement = infoElement.parentElement;

    this.log.info(`[Collapsible Drops] Making campaign collapsible: ${campaignName}`);

    parentElement.style.position = "relative";
    const titleHeight = 23;

    const collapseBtn = this.createCollapseButton();
    const collapsedState = this.loadCollapsedState();

    collapseBtn.style.position = "absolute";
    collapseBtn.style.top = "-1px";
    collapseBtn.style.right = "0px";

    const isCollapsed = collapsedState[campaignName] || false;
    collapseBtn.textContent = isCollapsed ? `▼ Show: ${campaignName}` : "▲ Hide";

    if (isCollapsed) {
      parentElement.style.height = `${titleHeight}px`;
      parentElement.style.overflow = "hidden";
      parentElement.style.marginBottom = "10px";
    }

    collapseBtn.onclick = (e) => {
      e.stopPropagation();
      const newCollapsed = collapseBtn.textContent.includes("Hide");

      this.log.info(`[Collapsible Drops] Toggling campaign: ${campaignName}, collapsed: ${newCollapsed}`);

      if (newCollapsed) {
        parentElement.style.height = `${titleHeight}px`;
        parentElement.style.overflow = "hidden";
        parentElement.style.marginBottom = "10px";
        collapseBtn.textContent = `▼ Show: ${campaignName}`;
      } else {
        parentElement.style.height = "";
        parentElement.style.overflow = "";
        parentElement.style.marginBottom = "";
        collapseBtn.textContent = "▲ Hide";
      }

      const state = this.loadCollapsedState();
      state[campaignName] = newCollapsed;
      this.saveCollapsedState(state);
    };

    parentElement.appendChild(collapseBtn);
  }

  async waitForElements() {
    let timeoutId;
    let animFrameId;

    return new Promise((resolve, reject) => {
      timeoutId = setTimeout(() => {
        cancelAnimationFrame(animFrameId);
        this.log.warn("[Collapsible Drops] Timeout waiting for inventory elements");
        reject(new Error("[Collapsible Drops] Timeout waiting for inventory elements"));
      }, 10000);

      const checkElements = () => {
        const elements = document.querySelectorAll(".inventory-campaign-info");
        if (elements.length > 0) {
          clearTimeout(timeoutId);
          this.log.info(`[Collapsible Drops] Found ${elements.length} inventory elements`);
          resolve(elements);
        } else {
          animFrameId = requestAnimationFrame(checkElements);
        }
      };
      animFrameId = requestAnimationFrame(checkElements);
    });
  }
}