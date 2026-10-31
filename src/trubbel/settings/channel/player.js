import BackgroundTabs from "../../modules/channel/player/background-tabs";
import DisableHotkeys from "../../modules/channel/player/disable-hotkeys";
import PlayerPlayback from "../../modules/channel/player/playback";
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
    this.inject("site.player");

    this.backgroundTabs = new BackgroundTabs(this);
    this.disableHotkeys = new DisableHotkeys(this);
    this.playerPlayback = new PlayerPlayback(this);
    this.playerReset = new PlayerReset(this);

    // Channel - Player - Ads - Mute During Ads
    this.settings.add("addon.trubbel.channel.player.ads.mute", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Player >> Ads",
        title: "Mute During Ads",
        description: "Automatically mute the player when an ad break starts and unmute it when the ad break ends.\n\nIf you were already muted, or unmute during the ad yourself, it's left alone.\n\n**Note:** This relies on the player's ad break events, which may not fire for every type of ad.",
        component: "setting-check-box"
      },
      changed: () => this.playerPlayback.handleSettingChange()
    });



    // Channel - Player - Channel-Specific - Enable Channel-Specific Settings
    this.settings.add("addon.trubbel.channel.player.channel_specific.enabled", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Player >> Channel-Specific",
        title: "Enable Channel-Specific Settings",
        description: "Automatically apply a custom volume, quality, audio compressor and chat visibility for selected channels.\n\nSettings are applied when a channel's stream starts playing, and volume and quality again if the player is reset.",
        component: "setting-check-box"
      },
      changed: () => this.playerPlayback.handleSettingChange()
    });

    // Channel - Player - Channel-Specific - Manage Channel-Specific Settings
    this.settings.addUI("addon.trubbel.channel.player.channel_specific.manage", {
      sort: 1,
      path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Player >> Channel-Specific",
      title: "Manage Channel-Specific Settings",
      component: () => import("../../components/main_menu/setting-channel-specific.vue"),
      getChannelSettings: () => {
        const data = this.settings.provider.get("addon.trubbel.channel.player.channel_specific");
        return (data && typeof data === "object") ? data : {};
      },
      setChannelSettings: data => this.settings.provider.set("addon.trubbel.channel.player.channel_specific", data)
    });



    // Channel - Player - Keyboard Shortcuts - Disable Player Keyboard Shortcuts
    this.settings.add("addon.trubbel.channel.player.disable_hotkeys", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Player >> Keyboard Shortcuts",
        title: "Disable Player Keyboard Shortcuts",
        description: "Stops Twitch's player keyboard shortcuts from working on livestreams when chat isn't focused.\n\nThis includes `Space`/`K` (play/pause), `M` (mute), `F` (fullscreen), `J`/`L`/`←`/`→` (seek), `Shift+↑`/`Shift+↓` (volume), `,`/`.` (playback speed), `Esc` and `?` (shortcut overlay).",
        component: "setting-check-box"
      },
      changed: val => this.disableHotkeys.handleSettingChange(val)
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



    // Channel - Player - Quality - Always Best Quality
    this.settings.add("addon.trubbel.channel.player.quality.always_best", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Player >> Quality",
        title: "Always Best Quality",
        description: "Keep the player on the best available quality.\n\nChannels with a quality set in **Channel-Specific Settings** uses that instead.",
        component: "setting-check-box"
      },
      changed: () => this.playerPlayback.handleSettingChange()
    });

    // Channel - Player - Quality - Keep Quality in Background Tabs (experimental)
    this.settings.add("addon.trubbel.channel.player.quality.keep_visible", {
      default: false,
      ui: {
        sort: 1,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Player >> Quality",
        title: "Keep Quality in Background Tabs (experimental)",
        description: "Stop Twitch from lowering the stream quality when the tab or window isn't active.",
        component: "setting-check-box"
      },
      changed: () => this.playerPlayback.handleSettingChange()
    });



    // Channel - Player - Reset - Auto Reset on Errors
    this.settings.add("addon.trubbel.channel.player.auto_reset", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Player >> Reset",
        title: "Auto Reset on Errors",
        description: "Automatically reset the player when it reports a playback error, such as `#1000`, `#2000`, `#3000`, `#4000` or `#5000`.",
        component: "setting-check-box"
      },
      changed: () => this.playerReset.handleSettingChange()
    });

    // Channel - Player - Reset - Enable Latency-Based Reset
    this.settings.add("addon.trubbel.channel.player.latency_reset", {
      default: false,
      ui: {
        sort: 1,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Player >> Reset",
        title: "Enable Latency-Based Reset",
        description: "Automatically reset the player when you fall too far behind live: more than **10 seconds** on Low Latency streams, or more than **15 seconds** on Normal Latency streams.",
        component: "setting-check-box"
      },
      changed: () => this.playerReset.handleSettingChange()
    });
  }

  onEnable() {
    this.router.on(":route", this.navigate, this);
    this.backgroundTabs.initialize();
    this.disableHotkeys.initialize();
    this.playerReset.initialize();
    this.playerPlayback.initialize();
  }

  async navigate() {
    this.disableHotkeys.handleNavigation();
  }
}