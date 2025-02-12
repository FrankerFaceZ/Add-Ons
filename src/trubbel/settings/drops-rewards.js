import { STORAGE_KEY_CONFIG } from "../utils/constants/config";
const { createElement } = FrankerFaceZ.utilities.dom;

export class DropsRewards extends FrankerFaceZ.utilities.module.Module {
  constructor(...args) {
    super(...args);

    this.inject("settings");
    this.inject("site");
    this.inject("site.router");

    this.BUTTON_CLASS = "drops-collapse-button";
    this.hasInitialized = false;

    // Drops & Rewards - Inventory - Enable Collapsible Inventory Drops
    this.settings.add("addon.trubbel.drops-rewards.collapsible", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Drops & Rewards >> Inventory",
        title: "Enable Collapsible Inventory Drops",
        description: "Allows you to toggle the visibility of Drops, helping you keep the Drops page clean and clutter-free.",
        component: "setting-check-box"
      },
      changed: () => this.handleCollapsibleDrops()
    });

    this.init = this.init.bind(this);
  }

  onEnable() {
    this.settings.getChanges("addon.trubbel.drops-rewards.collapsible", () => this.handleCollapsibleDrops());
    this.router.on(":route", this.checkNavigation, this);
    this.checkNavigation();
  }

  loadCollapsedState() {
    try {
      const stored = this.settings.provider.get(STORAGE_KEY_CONFIG);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      this.log.error("[Collapsible Drops] Error loading collapsed state:", e);
      return {};
    }
  }

  saveCollapsedState(state) {
    try {
      this.settings.provider.set(STORAGE_KEY_CONFIG, JSON.stringify(state));
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
        delete state[campaignName];
        hasChanges = true;
      }
    });

    if (hasChanges) {
      this.saveCollapsedState(state);
    }
  }

  createCollapseButton() {
    const button = createElement("div", {
      class: this.BUTTON_CLASS,
      style: `
        background: none;
        border: none;
        color: var(--color-text-alt-2);
        cursor: pointer;
        padding: 4px 8px;
        margin-left: 8px;
        border-radius: 4px;
        font-size: 14px;
      `
    });

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

    parentElement.style.position = "relative";
    const titleHeight = 27;

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
    return new Promise((resolve) => {
      const checkElements = () => {
        const elements = document.querySelectorAll(".inventory-campaign-info");
        if (elements.length > 0) {
          resolve(elements);
        } else {
          requestAnimationFrame(checkElements);
        }
      };
      checkElements();
    });
  }

  checkNavigation() {
    const currentLocation = this.router?.location;
    const oldLocation = this.router?.old_location;

    const isCurrentInventory = currentLocation === "/drops/inventory" || currentLocation === "/inventory";
    const wasInventory = oldLocation === "/drops/inventory" || oldLocation === "/inventory";

    if (isCurrentInventory || wasInventory) {
      if (wasInventory && !isCurrentInventory) {
        this.log.info("[Collapsible Drops] Leaving inventory page");
        this.hasInitialized = false;
      }

      if (isCurrentInventory && this.settings.get("addon.trubbel.drops-rewards.collapsible")) {
        this.log.info("[Collapsible Drops] Entering inventory page");
        this.init();
      }
    }
  }

  async init() {
    const currentLocation = this.router?.location;
    if (currentLocation !== "/drops/inventory" && currentLocation !== "/inventory") return;
    if (this.hasInitialized) return;

    const infoElements = await this.waitForElements();
    this.cleanupStorage();

    infoElements.forEach(element => this.makeCollapsible(element));

    this.hasInitialized = true;
  }

  handleCollapsibleDrops() {
    const enabled = this.settings.get("addon.trubbel.drops-rewards.collapsible");
    if (enabled) {
      this.init();
    } else {
      this.settings.provider.delete(STORAGE_KEY_CONFIG);
      this.hasInitialized = false;
    }
  }
}