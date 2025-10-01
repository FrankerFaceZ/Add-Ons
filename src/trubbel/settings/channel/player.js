import BackgroundTabs from "../../modules/channel/player/background-tabs";
import PlayerReset from "../../modules/channel/player/reset";

const { ManagedStyle } = FrankerFaceZ.utilities.dom;

export class Channel_Player extends FrankerFaceZ.utilities.module.Module {
  constructor(...args) {
    super(...args);

    this.style = new ManagedStyle;

    this.inject("settings");
    this.inject("site");
    this.inject("site.fine");
    this.inject("site.router");

    this.backgroundTabs = new BackgroundTabs(this);
    this.playerReset = new PlayerReset(this);

    // Channel - Player - Errors - Auto Reset on Errors
    this.settings.add("addon.trubbel.channel.player.auto_reset", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Player >> Errors",
        title: "Auto Reset on Errors",
        description: "Automatically detects and resets the player when encountering errors like `#1000`, `#2000`, `#3000`, `#4000` or `#5000`.",
        component: "setting-check-box"
      },
      changed: val => this.playerReset.handleSettingChange(val)
    });



    // Channel - Player - Livestream - Enable Auto Mute or Pause Stream
    this.settings.add("addon.trubbel.channel.player.livestream.auto_pause_mute", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Player >> Livestream",
        title: "Enable Auto Mute or Pause Stream",
        description: "Automatically mute or pause the livestream when browsing the **Home**, **About**, **Schedule**, or **Videos**-tabs.",
        component: "setting-check-box"
      },
      changed: val => this.backgroundTabs.handleSettingChange(val)
    });

    // Channel - Player - Livestream - Enable Auto Mute or Pause Stream (Options)
    this.settings.add("addon.trubbel.channel.player.livestream.auto_pause_mute_option1", {
      default: "mute",
      ui: {
        sort: 1,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Player >> Livestream",
        title: "Options",
        component: "setting-select-box",
        data: [
          { title: "Auto Mute", value: "mute" },
          { title: "Auto Pause", value: "pause" }
        ]
      }
    });

    // Channel - Player - Livestream - Auto resume/unmute
    this.settings.add("addon.trubbel.channel.player.livestream.auto_pause_mute_option2", {
      default: false,
      ui: {
        sort: 2,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Player >> Livestream",
        title: "Auto resume/unmute",
        description: "This will automatically resume or unmute the livestream when you go back.",
        component: "setting-check-box"
      }
    });
  }

  onEnable() {
    this.router.on(":route", this.navigate, this);
    this.backgroundTabs.initialize();
    this.playerReset.initialize();
  }

  async navigate() {
    this.playerReset.handleNavigation();
  }
}