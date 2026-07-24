import InstantTooltips from "../../modules/twilight/tooltips/instant";

export class Twilight_Tooltip extends FrankerFaceZ.utilities.module.Module {
  constructor(...args) {
    super(...args);

    this.inject("settings");

    this.instantTooltips = new InstantTooltips(this);

    // Twilight - Tooltips - Behaviour - Instant Twitch tooltips
    this.settings.add("addon.trubbel.twilight.tooltips.behaviour.instant", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall > Tooltips >> Behaviour",
        title: "Instant Twitch tooltips",
        description: "Twitch added an obnoxious delay to their tooltips and they don't disappear when your cursor moves over them. This fixes that.",
        component: "setting-check-box"
      },
      changed: val => this.instantTooltips.handleSettingChange(val)
    });
  }

  onEnable() {
    this.instantTooltips.initialize();
  }
}