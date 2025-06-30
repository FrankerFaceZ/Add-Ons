import { COLLAPSIBLE_DROPS_KEY_CONFIG } from "../../utilities/constants/config";

const { createElement } = FrankerFaceZ.utilities.dom;

export class CollapsibleDrops {
  constructor(parent) {
    this.parent = parent;
    this.hasInitialized = false;

    this.loadCollapsedState = this.loadCollapsedState.bind(this);
    this.saveCollapsedState = this.saveCollapsedState.bind(this);
    this.cleanupStorage = this.cleanupStorage.bind(this);
    this.createCollapseButton = this.createCollapseButton.bind(this);
    this.makeCollapsible = this.makeCollapsible.bind(this);
    this.waitForElements = this.waitForElements.bind(this);
    this.handleNavigation = this.handleNavigation.bind(this);
    this.init = this.init.bind(this);
  }

  initialize() {
    const enabled = this.parent.settings.get("addon.trubbel.inventory.collapsible-drops_rewards");
    if (enabled) {
      this.handleNavigation();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.parent.log.info("[Collapsible Drops] Enabling collapsible drops");
      this.init();
    } else {
      this.parent.log.info("[Collapsible Drops] Disabling collapsible drops");
      this.disable();
    }
  }

  disable() {
    this.parent.settings.provider.delete(COLLAPSIBLE_DROPS_KEY_CONFIG);
    this.hasInitialized = false;

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
  }

  loadCollapsedState() {
    try {
      const stored = this.parent.settings.provider.get(COLLAPSIBLE_DROPS_KEY_CONFIG);
      return stored ? stored : {};
    } catch (e) {
      this.parent.log.error("[Collapsible Drops] Error loading collapsed state:", e);
      return {};
    }
  }

  saveCollapsedState(state) {
    try {
      this.parent.settings.provider.set(COLLAPSIBLE_DROPS_KEY_CONFIG, state);
    } catch (e) {
      this.parent.log.error("[Collapsible Drops] Error saving collapsed state:", e);
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
        this.parent.log.info(`[Collapsible Drops] Removing stale campaign state: ${campaignName}`);
        delete state[campaignName];
        hasChanges = true;
      }
    });

    if (hasChanges) {
      this.saveCollapsedState(state);
    }
  }

  createCollapseButton() {
    const button = (
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
      >
      </div>
    );

    button.onmouseover = () => (button.style.backgroundColor = "var(--color-background-button-text-hover)");
    button.onmouseout = () => (button.style.backgroundColor = "transparent");
    return button;
  }

  makeCollapsible(infoElement) {
    if (infoElement.dataset.collapsibleProcessed) return;

    infoElement.dataset.collapsibleProcessed = "true";
    const nameLink = infoElement.querySelector(".tw-link");
    if (!nameLink) return;

    const campaignName = nameLink.textContent;
    const parentElement = infoElement.parentElement;

    this.parent.log.info(`[Collapsible Drops] Making campaign collapsible: ${campaignName}`);

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

      this.parent.log.info(`[Collapsible Drops] Toggling campaign: ${campaignName}, collapsed: ${newCollapsed}`);

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
        this.parent.log.warn("[Collapsible Drops] Timeout waiting for inventory elements");
        reject(new Error("[Collapsible Drops] Timeout waiting for inventory elements"));
      }, 10000);

      const checkElements = () => {
        const elements = document.querySelectorAll(".inventory-campaign-info");
        if (elements.length > 0) {
          clearTimeout(timeoutId);
          this.parent.log.info(`[Collapsible Drops] Found ${elements.length} inventory elements`);
          resolve(elements);
        } else {
          animFrameId = requestAnimationFrame(checkElements);
        }
      };
      animFrameId = requestAnimationFrame(checkElements);
    });
  }

  handleNavigation() {
    const currentLocation = this.parent.router?.location;
    const oldLocation = this.parent.router?.old_location;

    const isCurrentInventory = currentLocation === "/drops/inventory" || currentLocation === "/inventory";
    const wasInventory = oldLocation === "/drops/inventory" || oldLocation === "/inventory";

    if (isCurrentInventory || wasInventory) {
      if (wasInventory && !isCurrentInventory) {
        this.parent.log.info("[Collapsible Drops] Leaving inventory page");
        this.hasInitialized = false;
      }

      if (isCurrentInventory && this.parent.settings.get("addon.trubbel.inventory.collapsible-drops_rewards")) {
        this.parent.log.info("[Collapsible Drops] Entering inventory page");
        this.init();
      }
    }
  }

  async init() {
    const currentLocation = this.parent.router?.location;
    if (currentLocation !== "/drops/inventory" && currentLocation !== "/inventory") {
      this.parent.log.info("[Collapsible Drops] Not on inventory page, skipping initialization");
      return;
    }

    if (this.hasInitialized) {
      this.parent.log.info("[Collapsible Drops] Already initialized, skipping");
      return;
    }

    if (!this.parent.settings.get("addon.trubbel.inventory.collapsible-drops_rewards")) {
      this.parent.log.info("[Collapsible Drops] Feature disabled, skipping initialization");
      return;
    }

    try {
      this.parent.log.info("[Collapsible Drops] Initializing collapsible drops");
      const infoElements = await this.waitForElements();
      this.cleanupStorage();
      infoElements.forEach(element => this.makeCollapsible(element));
      this.hasInitialized = true;
      this.parent.log.info("[Collapsible Drops] Successfully initialized");
    } catch (error) {
      this.parent.log.error("[Collapsible Drops] Failed to find inventory elements:", error);
      this.hasInitialized = false;
    }
  }
}