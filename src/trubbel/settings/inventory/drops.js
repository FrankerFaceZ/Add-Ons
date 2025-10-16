import AutoClaimDrops from "../../modules/inventory/claim";
import CollapsibleDrops from "../../modules/inventory/collapsible";

const { ManagedStyle } = FrankerFaceZ.utilities.dom;

export class Inventory_Drops extends FrankerFaceZ.utilities.module.Module {
  constructor(...args) {
    super(...args);

    this.style = new ManagedStyle;

    this.inject("settings");
    this.inject("site");
    this.inject("site.router");

    this.autoClaimDrops = new AutoClaimDrops(this);
    this.collapsibleDrops = new CollapsibleDrops(this);

    // Inventory - Drops - Claim - Enable auto claim
    this.settings.add("addon.trubbel.inventory.drops.claim", {
      default: false,
      requires: ["context.session.user"],
      process(ctx, val) {
        return ctx.get("context.session.user") ? val : false;
      },
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Inventory > Drops >> Claim",
        title: "Enable auto claim",
        description: "Checks every 30 minutes for any available drops and claims them automatically for you.",
        component: "setting-check-box"
      },
      changed: val => this.autoClaimDrops.handleSettingChange(val)
    });

    // Inventory - Drops - Claim - Display notification when drops are claimed
    this.settings.add("addon.trubbel.inventory.drops.claim.notification", {
      default: false,
      requires: ["addon.trubbel.inventory.drops.claim"],
      process(ctx, val) {
        if (!ctx.get("addon.trubbel.inventory.drops.claim"))
          return false;
        return val;
      },
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Inventory > Drops >> Claim",
        title: "Display notification when drops are claimed",
        component: "setting-check-box"
      }
    });



    // Inventory - Drops - Collapse - Enable collapsible drops
    this.settings.add("addon.trubbel.inventory.drops.collapsible", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Inventory > Drops >> Collapse",
        title: "Enable collapsible drops",
        description: "Allows you to toggle the visibility of drops and rewards, helping you keep the page clean and clutter-free.",
        component: "setting-check-box"
      },
      changed: val => this.collapsibleDrops.handleSettingChange(val)
    });
  }

  onEnable() {
    this.router.on(":route", this.navigate, this);
    this.autoClaimDrops.initialize();
    this.collapsibleDrops.initialize();
  }

  async navigate() {
    this.collapsibleDrops.handleNavigation();
  }
}