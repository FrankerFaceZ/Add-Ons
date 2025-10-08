import WhisperSize from "../../modules/twilight/whispers/size";

const { ManagedStyle } = FrankerFaceZ.utilities.dom;

export class Twilight_Whispers extends FrankerFaceZ.utilities.module.Module {
  constructor(...args) {
    super(...args);

    this.style = new ManagedStyle;

    this.inject("settings");

    this.whisperSize = new WhisperSize(this);

    // Twilight - Whispers - Drop Down - Window height
    this.settings.add("addon.trubbel.twilight.whispers.drop_down", {
      default: 20,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall > Whispers >> Drop Down",
        title: "Window height",
        component: () => import("../../components/main_menu/setting-slider.vue"),
        min: 6,
        max: 120,
        step: 1,
        unit: "rem",
      },
      changed: () => this.whisperSize.updateCSS()
    });



    // Twilight - Whispers - Window - Window height
    this.settings.add("addon.trubbel.twilight.whispers.window.height", {
      default: 28,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall > Whispers >> Window",
        title: "Window height",
        component: () => import("../../components/main_menu/setting-slider.vue"),
        min: 20,
        max: 120,
        step: 1,
        unit: "rem",
      },
      changed: () => this.whisperSize.updateCSS()
    });

    // Twilight - Whispers - Window - Window width
    this.settings.add("addon.trubbel.twilight.whispers.window.width", {
      default: 32,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall > Whispers >> Window",
        title: "Window width",
        component: () => import("../../components/main_menu/setting-slider.vue"),
        min: 32,
        max: 300,
        step: 1,
        unit: "rem",
      },
      changed: () => this.whisperSize.updateCSS()
    });
  }

  onEnable() {
    this.whisperSize.enable();
  }
}