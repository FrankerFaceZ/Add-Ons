import Declutter from "../../modules/appearance/declutter/index";

const { ManagedStyle } = FrankerFaceZ.utilities.dom;

export class Appearance_Declutter extends FrankerFaceZ.utilities.module.Module {
  constructor(...args) {
    super(...args);

    this.style = new ManagedStyle;

    this.inject("settings");
    this.inject("site.loadable");

    this.declutter = new Declutter(this);

    // Appearance - Declutter - Channel - Hide Combos
    this.settings.add("addon.trubbel.appearance.declutter.channel.combos", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Declutter >> Channel",
        title: "Hide Combos",
        description: "Remove the combo button below and within the player. And in chat.",
        component: "setting-check-box"
      },
      changed: (val) => {
        this.declutter.loadable.toggle("CombosIngressButton_Available", !val);
        this.declutter.loadable.toggle("OneTapStreakPills", !val);
      }
    });



    // Appearance - Declutter - Chat - Hide stream chat header
    this.settings.add("addon.trubbel.appearance.declutter.chat.stream_header", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Declutter >> Chat",
        title: "Hide stream chat header",
        description: "**Note:** This also hides the collapse and viewer list buttons.",
        component: "setting-check-box"
      },
      changed: val => this.declutter.toggleHide("hide-stream-chat-header", val)
    });



    // Appearance - Declutter - Channel - Hide "Following"-title
    this.settings.add("addon.trubbel.appearance.declutter.directory.following_title", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Declutter >> Directory",
        title: "Hide \"Following\"-title",
        description: "Hides the giant \"Following\" title in the [following](https://twitch.tv/directory/following)-pages.",
        component: "setting-check-box"
      },
      changed: val => this.declutter.toggleHide("hide-following-title", val)
    });



    // Appearance - Declutter - Left Navigation - Hide the "For You"-text
    this.settings.add("addon.trubbel.appearance.declutter.sidebar.for_you", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Declutter >> Left Navigation",
        title: "Hide the \"For You\"-text",
        component: "setting-check-box"
      },
      changed: val => this.declutter.toggleHide("hide-sidebar-for-you", val)
    });

    // Appearance - Declutter - Left Navigation - Hide the "Viewers (High to Low)"-text
    this.settings.add("addon.trubbel.appearance.declutter.sidebar.sort_paragraph", {
      default: false,
      ui: {
        sort: 1,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Declutter >> Left Navigation",
        title: "Hide the \"Viewers (High to Low)\"-text",
        component: "setting-check-box"
      },
      changed: val => this.declutter.toggleHide("hide-sidebar-sort-paragraph", val)
    });

    // Appearance - Declutter - Left Navigation - Hide the guest avatars
    this.settings.add("addon.trubbel.appearance.declutter.sidebar.guest_avatar", {
      default: false,
      ui: {
        sort: 2,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Declutter >> Left Navigation",
        title: "Hide the guest avatars",
        component: "setting-check-box"
      },
      changed: val => this.declutter.toggleHide("hide-sidebar-guest-avatar", val)
    });

    // Appearance - Declutter - Left Navigation - Hide the guest +number text
    this.settings.add("addon.trubbel.appearance.declutter.sidebar.guest_number", {
      default: false,
      ui: {
        sort: 3,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Declutter >> Left Navigation",
        title: "Hide the guest +number text",
        component: "setting-check-box"
      },
      changed: val => this.declutter.toggleHide("hide-sidebar-guest-number", val)
    });



    // Appearance - Declutter - Left Navigation - Hide All-Time High Train
    this.settings.add("addon.trubbel.appearance.declutter.sidebar.all_time_high_train", {
      default: false,
      ui: {
        sort: 4,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Declutter >> Left Navigation",
        title: "Hide All-Time High Train",
        component: "setting-check-box"
      },
      changed: val => this.declutter.toggleHide("hide-sidebar-all-time-high-train", val)
    });

    // Appearance - Declutter - Left Navigation - Hide Golden Kappa Train
    this.settings.add("addon.trubbel.appearance.declutter.sidebar.golden_kappa_train", {
      default: false,
      ui: {
        sort: 5,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Declutter >> Left Navigation",
        title: "Hide Golden Kappa Train",
        component: "setting-check-box"
      },
      changed: val => this.declutter.toggleHide("hide-sidebar-golden-kappa-train", val)
    });

    // Appearance - Declutter - Left Navigation - Hide Shared Hype Train
    this.settings.add("addon.trubbel.appearance.declutter.sidebar.shared_hype_train", {
      default: false,
      ui: {
        sort: 6,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Declutter >> Left Navigation",
        title: "Hide Shared Hype Train",
        component: "setting-check-box"
      },
      changed: val => this.declutter.toggleHide("hide-sidebar-shared-hype-train", val)
    });

    // Appearance - Declutter - Left Navigation - Hide Treasure Train
    this.settings.add("addon.trubbel.appearance.declutter.sidebar.treasure_train", {
      default: false,
      ui: {
        sort: 7,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Declutter >> Left Navigation",
        title: "Hide Treasure Train",
        component: "setting-check-box"
      },
      changed: val => this.declutter.toggleHide("hide-sidebar-treasure-train", val)
    });

    // Appearance - Declutter - Left Navigation - Hide Hype Train
    this.settings.add("addon.trubbel.appearance.declutter.sidebar.hype_train", {
      default: false,
      ui: {
        sort: 8,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Declutter >> Left Navigation",
        title: "Hide Hype Train",
        component: "setting-check-box"
      },
      changed: val => this.declutter.toggleHide("hide-sidebar-hype-train", val)
    });

    // Appearance - Declutter - Left Navigation - Hide Gift Discount
    this.settings.add("addon.trubbel.appearance.declutter.sidebar.gift_discount", {
      default: false,
      ui: {
        sort: 9,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Declutter >> Left Navigation",
        title: "Hide Gift Discount",
        component: "setting-check-box"
      },
      changed: val => this.declutter.toggleHide("hide-sidebar-gift-discount", val)
    });



    // Appearance - Declutter - Player - Hide the "Closed Captions"-button within the settings menu
    this.settings.add("addon.trubbel.appearance.declutter.player.cc", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Declutter >> Player",
        title: "Hide the \"Closed Captions\"-button within the settings menu",
        component: "setting-check-box"
      },
      changed: val => this.declutter.toggleHide("hide-player-cc", val)
    });

    // Appearance - Declutter - Player - Hide the Disclosure overlay
    this.settings.add("addon.trubbel.appearance.declutter.player.disclosure", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Declutter >> Player",
        title: "Hide the Disclosure overlay",
        description: "This removes the \"Intended for certain audiences\", \"Includes Paid Promotion\" etc. from the player.",
        component: "setting-check-box"
      },
      changed: val => this.declutter.toggleHide("hide-player-disclosure", val)
    });

    // Appearance - Declutter - Player - Hide the Most Recent Video overlay
    this.settings.add("addon.trubbel.appearance.declutter.player.most_recent_video", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Declutter >> Player",
        title: "Hide the Most Recent Video overlay",
        component: "setting-check-box"
      },
      changed: val => this.declutter.toggleHide("hide-player-mrv", val)
    });

    // Appearance - Declutter - Player - Hide the top gradient
    this.settings.add("addon.trubbel.appearance.declutter.player.top_gradient", {
      default: false,
      ui: {
        sort: 1,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Declutter >> Player",
        title: "Hide the top gradient",
        component: "setting-check-box"
      },
      changed: () => this.declutter.updateCSS()
    });

    // Appearance - Declutter - Player - Hide the bottom gradient
    this.settings.add("addon.trubbel.appearance.declutter.player.bottom_gradient", {
      default: false,
      ui: {
        sort: 2,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Declutter >> Player",
        title: "Hide the bottom gradient",
        component: "setting-check-box"
      },
      changed: () => this.declutter.updateCSS()
    });



    // Appearance - Declutter - Stream - Hide the about section and panels
    this.settings.add("addon.trubbel.appearance.declutter.stream.about_panels", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Declutter >> Stream",
        title: "Hide the about section and panels",
        component: "setting-check-box"
      },
      changed: () => this.declutter.updateCSS()
    });

    // Appearance - Declutter - Stream - Hide monthly recaps below the stream
    this.settings.add("addon.trubbel.appearance.declutter.stream.monthly_recap", {
      default: false,
      ui: {
        sort: 1,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Declutter >> Stream",
        title: "Hide monthly recaps below the stream",
        component: "setting-check-box"
      },
      changed: val => this.declutter.toggleHide("hide-stream-monthly-recap", val)
    });

    // Appearance - Declutter - Stream - Hide power-ups within the rewards popup
    this.settings.add("addon.trubbel.appearance.declutter.stream.power_ups", {
      default: false,
      ui: {
        sort: 2,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Declutter >> Stream",
        title: "Hide power-ups within the rewards popup",
        component: "setting-check-box"
      },
      changed: () => this.declutter.updateCSS()
    });

    // Appearance - Declutter - Stream - Hide sponsored banner above chat
    this.settings.add("addon.trubbel.appearance.declutter.stream.ChannelSkinsBanner", {
      default: false,
      ui: {
        sort: 3,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Declutter >> Stream",
        title: "Hide sponsored banner above chat",
        component: "setting-check-box"
      },
      changed: val => this.declutter.loadable.toggle("ChannelSkinsBanner", !val)
    });

    // Appearance - Declutter - Stream - Hide sponsored logo within player
    this.settings.add("addon.trubbel.appearance.declutter.stream.ChannelSkinsOverlay", {
      default: false,
      ui: {
        sort: 4,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Declutter >> Stream",
        title: "Hide sponsored logo within player",
        component: "setting-check-box"
      },
      changed: val => this.declutter.loadable.toggle("ChannelSkinsOverlay", !val)
    });

    // Appearance - Declutter - Stream - Hide sponsored banner below player
    this.settings.add("addon.trubbel.appearance.declutter.stream.ChannelSkinsRibbon", {
      default: false,
      ui: {
        sort: 5,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Declutter >> Stream",
        title: "Hide sponsored banner below player",
        component: "setting-check-box"
      },
      changed: val => this.declutter.loadable.toggle("ChannelSkinsRibbon", !val)
    });



    // Appearance - Declutter - VODs - Hide muted segments alerts popups
    this.settings.add("addon.trubbel.appearance.declutter.vods.muted_segment_popup", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Declutter >> VODs",
        title: "Hide muted segments alerts popups",
        component: "setting-check-box"
      },
      changed: val => this.declutter.toggleHide("hide-vod-muted-segment-popup", val)
    });
  }

  onEnable() {
    this.declutter.onEnable();
  }
}