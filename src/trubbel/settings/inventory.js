import { AutoClaimDrops } from "../modules/inventory/auto-claim-drops";
import { CollapsibleDrops } from "../modules/inventory/collapsible-drops";

export class Inventory extends FrankerFaceZ.utilities.module.Module {
  constructor(...args) {
    super(...args);

    this.inject("settings");
    this.inject("site");
    this.inject("site.router");

    this.autoClaimDrops = new AutoClaimDrops(this);
    this.collapsibleDrops = new CollapsibleDrops(this);

    // Inventory - Drops & Rewards - Enable Auto Claim
    this.settings.add("addon.trubbel.inventory.auto-claim", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Inventory >> Drops & Rewards",
        title: "Enable Auto Claim (Experimental)",
        description: "Every 30 minutes this will automatically check if there is any drops available and claim them for you.",
        component: "setting-check-box"
      },
      changed: (val) => {
        this.log.info("[AutoClaimDrops] Auto claim setting changed to:", val);
        this.autoClaimDrops.handleSettingChange(val);
      }
    });

    // Inventory - Drops & Rewards - Show Auto Claim Notifications
    this.settings.add("addon.trubbel.inventory.auto-claim-notification", {
      default: false,
      ui: {
        sort: 1,
        path: "Add-Ons > Trubbel\u2019s Utilities > Inventory >> Drops & Rewards",
        title: "Show Auto Claim Notifications",
        description: "Display a notification when drops are claimed.",
        component: "setting-check-box"
      }
    });

    // Inventory - Drops & Rewards - Enable Collapsible Drops
    this.settings.add("addon.trubbel.inventory.collapsible-drops_rewards", {
      default: false,
      ui: {
        sort: 3,
        path: "Add-Ons > Trubbel\u2019s Utilities > Inventory >> Drops & Rewards",
        title: "Enable Collapsible Drops",
        description: "Allows you to toggle the visibility of drops and rewards, helping you keep the page clean and clutter-free.",
        component: "setting-check-box"
      },
      changed: val => {
        this.log.info("[Inventory] Collapsible drops setting changed:", val);
        this.collapsibleDrops.handleSettingChange(val);
      }
    });
  }

  onEnable() {
    this.router.on(":route", this.navigate, this);
    this.autoClaimDrops.initialize();
    this.collapsibleDrops.initialize();
    this.navigate();
  }

  navigate() {
    this.collapsibleDrops.handleNavigation();
  }
}