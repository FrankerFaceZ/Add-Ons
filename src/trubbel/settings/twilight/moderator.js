import { ModeratedChannels } from "../../modules/twilight/moderator/moderated-channels";

const { ManagedStyle } = FrankerFaceZ.utilities.dom;

export class Twilight_Moderator extends FrankerFaceZ.utilities.module.Module {
  constructor(...args) {
    super(...args);

    this.style = new ManagedStyle;

    this.inject("settings");
    this.inject("site.router");
    this.inject("site");

    this.moderatedChannels = new ModeratedChannels(this);

    // Twilight - Moderator - Live - Display Live Moderated Channels
    this.settings.add("addon.trubbel.twilight.moderator.channels", {
      default: false,
      requires: ["context.session.user"],
      process(ctx, val) {
        return ctx.get("context.session.user") ? val : false;
      },
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall > Moderator >> Live",
        title: "Display Live Moderated Channels",
        description: "This adds a sword icon to the top navigation bar, which shows any live channels you're a moderator in.\n\n**Note:** Information updates every 5 minutes.",
        component: "setting-check-box"
      },
      changed: val => this.moderatedChannels.handleSettingChange(val)
    });
  }

  onEnable() {
    this.moderatedChannels.initialize();
  }
}