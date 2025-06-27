import { autoChangeTheme } from "../modules/twilight/theme/system";

const { createElement, ManagedStyle } = FrankerFaceZ.utilities.dom;
const { has } = FrankerFaceZ.utilities.object;

const CLASSES = {
  "hide-channel-combos": "div:has(> .tw-transition-group [class*=\"oneTapStreakPill--\"]),div:has(> [aria-controls=\"one-tap-store-id\"]),div:has(> #one-tap-store-id),div:has(> .user-notice-line [src*=\"cloudfront.net/one-tap/\"])",
  "hide-stream-chat-header": ".stream-chat-header,.toggle-visibility__right-column--expanded",
  "hide-side-nav-for-you": ".side-nav--expanded [aria-label] :is(.side-nav__title):has(h3[class*=\"tw-title\"]:first-child)",
  "hide-side-nav-sort-paragraph": "[data-a-target=\"side-nav-header-expanded\"] p",
  "hide-side-nav-guest-avatar": ".side-nav-card :is(.primary-with-small-avatar__mini-avatar)",
  "hide-side-nav-guest-number": ".side-nav-card [data-a-target=\"side-nav-card-metadata\"] :is(p):nth-child(2)",
  "hide-side-nav-hype-train": "div:has(> .hype-train-icon)",
  "hide-side-nav-gift-discount": "div:has(> [class*=\"giftGradient--\"])",
  "hide-player-disclosure": ".disclosure-tool",
  "hide-player-live-badge": ".video-player .top-bar .tw-channel-status-text-indicator",
  "hide-stream-monthly-recap": "div > div:has(> article a[href*=\"/recaps/\"])",
  "hide-stream-sponsored-content-chat-banner": ".stream-chat div :is(.channel-skins-banner__interactive)",
  "hide-stream-sponsored-content-within-player": ".video-player :is(.channel-skins-overlay__background)",
  "hide-stream-sponsored-content-below-player": ".channel-info-content div[style]:has(.channel-skins-ribbon__container)",
  "hide-vod-muted-segment-popup": ".video-player .muted-segments-alert__scroll-wrapper",
};

export class Appearance extends FrankerFaceZ.utilities.module.Module {
  constructor(...args) {
    super(...args);

    this.style = new ManagedStyle;

    this.inject("settings");
    this.inject("site.router");

    // Appearance - Notifications
    // Appearance - Notifications - Custom Notifications - Position
    this.settings.add("addon.trubbel.appearance.notifications-position", {
      default: "bottom-left",
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Notifications >> Custom Notifications",
        title: "Position",
        description: "Choose where notifications will appear on the screen. Player options will show notifications inside the Twitch player when available.",
        component: "setting-select-box",
        data: [
          { title: "Bottom Left", value: "bottom-left" },
          { title: "Bottom Right", value: "bottom-right" },
          { title: "Top Left", value: "top-left" },
          { title: "Top Right", value: "top-right" },
          { title: "Bottom Left Player", value: "player-bottom-left" },
          { title: "Bottom Right Player", value: "player-bottom-right" },
          { title: "Top Left Player", value: "player-top-left" },
          { title: "Top Right Player", value: "player-top-right" }
        ],
        buttons: () => import("../components/main_menu/preview-notification.vue")
      }
    });

    // Appearance - Notifications - Custom Notifications - Font Size
    this.settings.add("addon.trubbel.appearance.notifications-font-size", {
      default: "16",
      process(ctx, val) {
        if (typeof val !== "number")
          try {
            val = parseFloat(val);
          } catch (err) { val = null; }
        if (!val || val < 1 || isNaN(val) || !isFinite(val) || val > 25)
          val = 16;
        return val;
      },
      ui: {
        sort: 1,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Notifications >> Custom Notifications",
        title: "Font Size",
        description: "**Minimum:** `1`, **Maximum:** `25`.",
        component: "setting-text-box",
        type: "number"
      }
    });

    // Appearance - Notifications - Custom Notifications - Text
    this.settings.add("addon.trubbel.appearance.notifications-text-color", {
      default: "#ffffff",
      ui: {
        sort: 3,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Notifications >> Custom Notifications",
        title: "Text",
        component: "setting-color-box",
        alpha: true
      }
    });

    // Appearance - Notifications - Custom Notifications - Background
    this.settings.add("addon.trubbel.appearance.notifications-background-color", {
      default: "#000000",
      ui: {
        sort: 4,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Notifications >> Custom Notifications",
        title: "Background",
        component: "setting-color-box",
        alpha: true
      }
    });

    // Appearance - Notifications - Custom Notifications - Less Padding
    this.settings.add("addon.trubbel.appearance.notifications-padding", {
      default: false,
      ui: {
        sort: 5,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Notifications >> Custom Notifications",
        title: "Less Padding",
        component: "setting-check-box"
      }
    });


    // Appearance - Remove/Hide Things
    // Appearance - Remove/Hide Things - Channel - Remove Combos
    this.settings.add("addon.trubbel.appearance.hide.channel-combos", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Remove/Hide Things >> Channel",
        title: "Remove Combos",
        description: "Remove the Combo button below and within the player. And in chat.",
        component: "setting-check-box"
      },
      changed: val => this.toggleHide("hide-channel-combos", val)
    });

    // Appearance - Remove/Hide Things - Chat - Remove Stream Chat Header
    this.settings.add("addon.trubbel.appearance.hide.chat-stream-chat-header", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Remove/Hide Things >> Chat",
        title: "Remove Stream Chat Header",
        description: "**Note:** This also hides the collapse and viewer list buttons.",
        component: "setting-check-box"
      },
      changed: val => this.toggleHide("hide-stream-chat-header", val)
    });


    // Appearance - Remove/Hide Things - Left Navigation - Remove the "For You"-text
    this.settings.add("addon.trubbel.appearance.hide.left-nav-for-you", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Remove/Hide Things >> Left Navigation",
        title: "Remove the \"For You\"-text",
        component: "setting-check-box"
      },
      changed: val => this.toggleHide("hide-side-nav-for-you", val)
    });

    // Appearance - Remove/Hide Things - Left Navigation - Remove the "Viewers (High to Low)"-text
    this.settings.add("addon.trubbel.appearance.hide.left-nav-sort-paragraph", {
      default: false,
      ui: {
        sort: 1,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Remove/Hide Things >> Left Navigation",
        title: "Remove the \"Viewers (High to Low)\"-text",
        component: "setting-check-box"
      },
      changed: val => this.toggleHide("hide-side-nav-sort-paragraph", val)
    });

    // Appearance - Remove/Hide Things - Left Navigation - Remove the Guest avatars
    this.settings.add("addon.trubbel.appearance.hide.left-nav-guest-avatar", {
      default: false,
      ui: {
        sort: 2,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Remove/Hide Things >> Left Navigation",
        title: "Remove the Guest avatars",
        component: "setting-check-box"
      },
      changed: val => this.toggleHide("hide-side-nav-guest-avatar", val)
    });

    // Appearance - Remove/Hide Things - Left Navigation - Remove the Guest +number text
    this.settings.add("addon.trubbel.appearance.hide.left-nav-guest-number", {
      default: false,
      ui: {
        sort: 3,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Remove/Hide Things >> Left Navigation",
        title: "Remove the Guest +number text",
        component: "setting-check-box"
      },
      changed: val => this.toggleHide("hide-side-nav-guest-number", val)
    });

    // Appearance - Remove/Hide Things - Left Navigation - Remove Hype Train
    this.settings.add("addon.trubbel.appearance.hide.left-nav-hype-train", {
      default: false,
      ui: {
        sort: 4,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Remove/Hide Things >> Left Navigation",
        title: "Remove Hype Train",
        component: "setting-check-box"
      },
      changed: val => this.toggleHide("hide-side-nav-hype-train", val)
    });

    // Appearance - Remove/Hide Things - Left Navigation - Remove Gift Discount
    this.settings.add("addon.trubbel.appearance.hide.left-nav-gift-discount", {
      default: false,
      ui: {
        sort: 5,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Remove/Hide Things >> Left Navigation",
        title: "Remove Gift Discount",
        component: "setting-check-box"
      },
      changed: val => this.toggleHide("hide-side-nav-gift-discount", val)
    });


    // Appearance - Remove/Hide Things - Player - Remove the Disclosure overlay from Player
    this.settings.add("addon.trubbel.appearance.hide.player-disclosure", {
      default: false,
      ui: {
        sort: 1,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Remove/Hide Things >> Player",
        title: "Remove the Disclosure overlay from Player",
        description: "This removes the \"Intended for certain audiences\", \"Includes Paid Promotion\" etc. from the player.",
        component: "setting-check-box"
      },
      changed: val => this.toggleHide("hide-player-disclosure", val)
    });

    // Appearance - Remove/Hide Things - Player - Remove Top Gradient from Player
    this.settings.add("addon.trubbel.appearance.hide.top-player-gradient", {
      default: false,
      ui: {
        sort: 2,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Remove/Hide Things >> Player",
        title: "Remove Top Gradient from Player",
        component: "setting-check-box"
      },
      changed: () => this.updateCSS()
    });

    // Appearance - Remove/Hide Things - Player - Remove Bottom Gradient from Player
    this.settings.add("addon.trubbel.appearance.hide.bottom-player-gradient", {
      default: false,
      ui: {
        sort: 3,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Remove/Hide Things >> Player",
        title: "Remove Bottom Gradient from Player",
        component: "setting-check-box"
      },
      changed: () => this.updateCSS()
    });

    // Appearance - Remove/Hide Things - Player - Remove the "LIVE"-badge from Player
    this.settings.add("addon.trubbel.appearance.hide.player-live", {
      default: false,
      ui: {
        sort: 4,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Remove/Hide Things >> Player",
        title: "Remove the \"LIVE\"-badge from Player",
        component: "setting-check-box"
      },
      changed: val => this.toggleHide("hide-player-live-badge", val)
    });


    // Appearance - Remove/Hide Things - Stories - Remove Stories
    this.settings.add("addon.trubbel.appearance.hide.stories", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Remove/Hide Things >> Stories",
        title: "Remove Stories",
        component: "setting-check-box"
      },
      changed: () => this.updateCSS()
    });


    // Appearance - Remove/Hide Things - Stream - Remove Remove About Section and Panels
    this.settings.add("addon.trubbel.appearance.hide.stream-about-panels", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Remove/Hide Things >> Stream",
        title: "Remove About Section and Panels",
        component: "setting-check-box"
      },
      changed: () => this.updateCSS()
    });

    // Appearance - Remove/Hide Things - Stream - Remove Monthly Recap below Streams
    this.settings.add("addon.trubbel.appearance.hide.stream-monthly-recap", {
      default: false,
      ui: {
        sort: 1,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Remove/Hide Things >> Stream",
        title: "Remove Monthly Recap below Streams",
        component: "setting-check-box"
      },
      changed: val => this.toggleHide("hide-stream-monthly-recap", val)
    });

    // Appearance - Remove/Hide Things - Stream - Remove Power-ups within the Rewards popup
    this.settings.add("addon.trubbel.appearance.hide.stream-power-ups", {
      default: false,
      ui: {
        sort: 2,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Remove/Hide Things >> Stream",
        title: "Remove Power-ups within the Rewards popup",
        component: "setting-check-box"
      },
      changed: () => this.updateCSS()
    });

    // Appearance - Remove/Hide Things - Stream - Remove Sponsored content above stream chat
    this.settings.add("addon.trubbel.appearance.hide.stream-sponsored-content-chat-banner", {
      default: false,
      ui: {
        sort: 3,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Remove/Hide Things >> Stream",
        title: "Remove Sponsored content above stream chat",
        component: "setting-check-box"
      },
      changed: val => this.toggleHide("hide-stream-sponsored-content-chat-banner", val)
    });

    // Appearance - Remove/Hide Things - Stream - Remove Sponsored content within the Player
    this.settings.add("addon.trubbel.appearance.hide.stream-sponsored-content-within-player", {
      default: false,
      ui: {
        sort: 4,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Remove/Hide Things >> Stream",
        title: "Remove Sponsored content within the Player",
        component: "setting-check-box"
      },
      changed: val => this.toggleHide("hide-stream-sponsored-content-within-player", val)
    });

    // Appearance - Remove/Hide Things - Stream - Remove Sponsored content below the Player
    this.settings.add("addon.trubbel.appearance.hide.stream-sponsored-content-below-player", {
      default: false,
      ui: {
        sort: 5,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Remove/Hide Things >> Stream",
        title: "Remove Sponsored content below the Player",
        component: "setting-check-box"
      },
      changed: val => this.toggleHide("hide-stream-sponsored-content-below-player", val)
    });


    // Appearance - Remove/Hide Things - VODs - Remove Muted Segments Alerts popups
    this.settings.add("addon.trubbel.appearance.hide.vod-muted-segment-popup", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Remove/Hide Things >> VODs",
        title: "Remove Muted Segments Alerts popups",
        component: "setting-check-box"
      },
      changed: val => this.toggleHide("hide-vod-muted-segment-popup", val)
    });


    // Appearance - UI Tweaks
    // Appearance - UI Tweaks - Buttons - Use old buttons with less border-radius
    this.settings.add("addon.trubbel.appearance.tweaks.button-border-radius", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > UI Tweaks >> Buttons",
        title: "Use old buttons with less border-radius",
        component: "setting-check-box"
      },
      changed: () => this.updateCSS()
    });


    // Appearance - UI Tweaks - Chat - Reduce padding in Viewer List
    this.settings.add("addon.trubbel.appearance.tweaks.chat-viewer-list-padding", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > UI Tweaks >> Chat",
        title: "Reduce padding in Viewer List",
        component: "setting-check-box"
      },
      changed: () => this.updateCSS()
    });


    // Appearance - UI Tweaks - Chat - Show Full Messages /w Expanded Replies
    this.settings.add("addon.trubbel.appearance.tweaks.chat-show-full-message", {
      default: false,
      ui: {
        sort: 1,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > UI Tweaks >> Chat",
        title: "Show Full Messages /w Expanded Replies",
        description: "Allows you to see the entire message someone is replying to in chat, instead of it being cut off.\n\n**Note:** Twitch settings needs to be \"**Expanded**\" in \`Chat Settings > Chat Appearance > Replies in Chat > Expanded\`,\n\n& FFZ settings needs to be \"**Twitch (Default)**\" in [Chat > Appearance > Replies](~chat.appearance.replies).",
        component: "setting-check-box"
      },
      changed: () => this.updateCSS()
    });


    // Appearance - UI Tweaks - System Theme - Enable System Theme
    this.settings.add("addon.trubbel.appearance.tweaks.system-theme", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > UI Tweaks >> System Theme",
        title: "Enable System Theme",
        description: "Automatically sets Twitch theme based on system preferences.",
        component: "setting-check-box"
      },
      changed: () => this.getCurrentTheme()
    });


    // Appearance - UI Tweaks - Titles - Show full titles for Stream Tooltips
    this.settings.add("addon.trubbel.appearance.tweaks.full-side-nav-tooltip", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > UI Tweaks >> Titles",
        title: "Show full titles for Stream Tooltips",
        description: "Show the full title tooltip when hovering over a stream in the left side navigation.",
        component: "setting-check-box"
      },
      changed: () => this.updateCSS()
    });

    // Appearance - UI Tweaks - Titles - Show full titles in Stream Previews
    this.settings.add("addon.trubbel.appearance.tweaks.titles-full-stream", {
      default: false,
      ui: {
        sort: 1,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > UI Tweaks >> Titles",
        title: "Show full titles in Stream Previews",
        component: "setting-check-box"
      },
      changed: () => this.updateCSS()
    });

    // Appearance - UI Tweaks - Titles - Show full titles in Clip Previews
    this.settings.add("addon.trubbel.appearance.tweaks.titles-full-clip", {
      default: false,
      ui: {
        sort: 2,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > UI Tweaks >> Titles",
        title: "Show full titles in Clip Previews",
        component: "setting-check-box"
      },
      changed: () => this.updateCSS()
    });

    // Appearance - UI Tweaks - Titles - Show full titles in VOD Previews
    this.settings.add("addon.trubbel.appearance.tweaks.titles-full-vod", {
      default: false,
      ui: {
        sort: 3,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > UI Tweaks >> Titles",
        title: "Show full titles in VOD Previews",
        component: "setting-check-box"
      },
      changed: () => this.updateCSS()
    });

    // Appearance - UI Tweaks - Titles - Show full titles for Games in Directory
    this.settings.add("addon.trubbel.appearance.tweaks.titles-full-game", {
      default: false,
      ui: {
        sort: 4,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > UI Tweaks >> Titles",
        title: "Show full titles for Games in Directory",
        component: "setting-check-box"
      },
      changed: () => this.updateCSS()
    });

    // Appearance - UI Tweaks - Titles - Show full titles for Most Recent Videos
    this.settings.add("addon.trubbel.appearance.tweaks.titles-most-recent-video", {
      default: false,
      ui: {
        sort: 5,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > UI Tweaks >> Titles",
        title: "Show full titles for Most Recent Videos",
        component: "setting-check-box"
      },
      changed: () => this.updateCSS()
    });


    // Appearance - UI Tweaks - Unban Requests - Hide Mod Actions in Unban Requests
    this.settings.add("addon.trubbel.appearance.tweaks.unban-requests-hide", {
      default: false,
      ui: {
        sort: 1,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > UI Tweaks >> Unban Requests",
        title: "Hide Mod Actions in Unban Requests",
        description: "Hide all mod actions taken in the **Unban Requests popout window**.",
        component: "setting-check-box"
      },
      changed: () => this.updateCSS()
    });

    // Appearance - UI Tweaks - Unban Requests - Remove line-through text in Unban Requests & User Cards
    this.settings.add("addon.trubbel.appearance.tweaks.unban-requests-deleted-message", {
      default: false,
      ui: {
        sort: 2,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > UI Tweaks >> Unban Requests",
        title: "Remove line-through text in Unban Requests & User Cards",
        description: "Remove the line-through text in Unban Requests and within user cards moderated messages.",
        component: "setting-check-box"
      },
      changed: () => this.updateCSS()
    });


    // Appearance - UI Tweaks - VOD - Show black background behind current and duration time
    this.settings.add("addon.trubbel.appearance.tweaks.vod-time-background", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > UI Tweaks >> VOD",
        title: "Show black background behind current and duration time",
        description: "Show a black background behind VODs seekbar, for current time and duration. Making it easier to see the white text.",
        component: "setting-check-box"
      },
      changed: () => this.updateCSS()
    });
  }

  onEnable() {
    this.settings.getChanges("addon.trubbel.appearance.tweaks.system-theme", () => this.getCurrentTheme());
    this.router.on(":route", () => { this.getCurrentTheme(); });
    this.getCurrentTheme();
    this.toggleHide("hide-channel-combos", this.settings.get("addon.trubbel.appearance.hide.channel-combos"));
    this.toggleHide("hide-stream-chat-header", this.settings.get("addon.trubbel.appearance.hide.chat-stream-chat-header"));
    this.toggleHide("hide-side-nav-for-you", this.settings.get("addon.trubbel.appearance.hide.left-nav-for-you"));
    this.toggleHide("hide-side-nav-sort-paragraph", this.settings.get("addon.trubbel.appearance.hide.left-nav-sort-paragraph"));
    this.toggleHide("hide-side-nav-guest-avatar", this.settings.get("addon.trubbel.appearance.hide.left-nav-guest-avatar"));
    this.toggleHide("hide-side-nav-guest-number", this.settings.get("addon.trubbel.appearance.hide.left-nav-guest-number"));
    this.toggleHide("hide-side-nav-hype-train", this.settings.get("addon.trubbel.appearance.hide.left-nav-hype-train"));
    this.toggleHide("hide-side-nav-gift-discount", this.settings.get("addon.trubbel.appearance.hide.left-nav-gift-discount"));
    this.toggleHide("hide-player-disclosure", this.settings.get("addon.trubbel.appearance.hide.player-disclosure"));
    this.toggleHide("hide-player-live-badge", this.settings.get("addon.trubbel.appearance.hide.player-live"));
    this.toggleHide("hide-stream-monthly-recap", this.settings.get("addon.trubbel.appearance.hide.stream-monthly-recap"));
    this.toggleHide("hide-stream-sponsored-content-chat-banner", this.settings.get("addon.trubbel.appearance.hide.stream-sponsored-content-chat-banner"));
    this.toggleHide("hide-stream-sponsored-content-within-player", this.settings.get("addon.trubbel.appearance.hide.stream-sponsored-content-within-player"));
    this.toggleHide("hide-stream-sponsored-content-below-player", this.settings.get("addon.trubbel.appearance.hide.stream-sponsored-content-below-player"));
    this.toggleHide("hide-vod-muted-segment-popup", this.settings.get("addon.trubbel.appearance.hide.vod-muted-segment-popup"));
    this.updateCSS();
  }

  getCurrentTheme() {
    const enabled = this.settings.get("addon.trubbel.appearance.tweaks.system-theme");
    if (enabled) {
      autoChangeTheme(this);
    }
  }

  toggleHide(key, val) {
    const k = `hide--${key}`;
    if (!val) {
      this.style.delete(k);
      return;
    }
    if (!has(CLASSES, key)) {
      throw new Error(`cannot find class for "${key}"`);
    }
    this.style.set(k, `${CLASSES[key]} {display: none !important}`);
  }

  updateCSS() {
    // Appearance - Remove/Hide Things
    // Appearance - Remove/Hide Things - Player - Remove Top Gradient from Player
    if (this.settings.get("addon.trubbel.appearance.hide.top-player-gradient")) {
      this.style.set("hide-top-player-gradient", ".video-player .top-bar { background: transparent !important; }");
    } else {
      this.style.delete("hide-top-player-gradient");
    }
    // Appearance - Remove/Hide Things - Player - Remove Bottom Gradient from Player
    if (this.settings.get("addon.trubbel.appearance.hide.bottom-player-gradient")) {
      this.style.set("hide-bottom-player-gradient", ".video-player .player-controls { background: transparent !important; }");
    } else {
      this.style.delete("hide-bottom-player-gradient");
    }
    // Appearance - Remove/Hide Things - Stream - Remove Remove About Section and Panels
    if (this.settings.get("addon.trubbel.appearance.hide.stream-about-panels")) {
      this.style.set("hide-stream-about-panels1", "[id=\"live-channel-about-panel\"], .channel-panels { display: none !important; }");
      this.style.set("hide-stream-about-panels2", ".channel-info-content:not(:has(.timestamp-metadata__bar)) :is(div[style^=\"min-height:\"]) { min-height: 0px !important; }");
      this.style.set("hide-stream-about-panels3", ".channel-info-content:not(:has(.timestamp-metadata__bar)) :is(.tw-tower:has(.tw-placeholder-wrapper)) { display: none !important; }");
    } else {
      this.style.delete("hide-stream-about-panels1");
      this.style.delete("hide-stream-about-panels2");
      this.style.delete("hide-stream-about-panels3");
    }
    // Appearance - Remove/Hide Things - Stream - Remove Power-ups within the Rewards popup
    if (this.settings.get("addon.trubbel.appearance.hide.stream-power-ups")) {
      this.style.set("hide-stream-power-ups1", ".rewards-list :is([class*=\"bitsRewardListItem--\"]) { display: none !important; }");
      this.style.set("hide-stream-power-ups2", ".rewards-list > div:first-child:has(p) { display: none !important; }");
      this.style.set("hide-stream-power-ups3", ".rewards-list > :is(div:has(> div > .tw-title)) { padding: 0rem 0.5rem 1rem !important; }");
    } else {
      this.style.delete("hide-stream-power-ups1");
      this.style.delete("hide-stream-power-ups2");
      this.style.delete("hide-stream-power-ups3");
    }
    // Appearance - Remove/Hide Things - Stories - Remove Stories
    if (this.settings.get("addon.trubbel.appearance.hide.stories")) {
      this.style.set("hide-stories-left-nav-expanded", "#side-nav [class*=\"storiesLeftNavSection--\"] { display: none !important; }");
      this.style.set("hide-stories-left-nav-collapsed", "#side-nav :is([style]) :has([class*=\"storiesLeftNavSectionCollapsedButton--\"]) { display: none !important; }");
      this.style.set("hide-stories-following-page", "div[class^=\"Layout-sc-\"]:has(> [data-simplebar=\"init\"] > .simplebar-scroll-content > .simplebar-content[style] h2.sr-only) { display: none !important; }");
    } else {
      this.style.delete("hide-stories-left-nav-expanded");
      this.style.delete("hide-stories-left-nav-collapsed");
      this.style.delete("hide-stories-following-page");
    }
    // Appearance - UI Tweaks
    // Appearance - UI Tweaks - Buttons - Use old buttons with less border-radius
    if (this.settings.get("addon.trubbel.appearance.tweaks.button-border-radius")) {
      this.style.set("button-border-radius", `
          button[class*="ScCoreButton-sc-"],
          a[class*="ScCoreButton-sc-"],
          div:has(> button[data-test-selector="follow-button"]),
          div:has(> div [style] button[data-test-selector="follow-button"]),
          div:has(> button[data-test-selector="unfollow-button"]),
          div:has(> div [style] button[data-test-selector="unfollow-button"]),
          div:has(> button[data-a-target="notifications-toggle"]) {
            border-radius: 0.4rem !important;
          }
        `);
    } else {
      this.style.delete("button-border-radius");
    }
    // Appearance - UI Tweaks - Chat - Reduce padding in Viewer List
    if (this.settings.get("addon.trubbel.appearance.tweaks.chat-viewer-list-padding")) {
      this.style.set("viewer-list-padding1", "#community-tab-content > div {padding: 1rem !important;}");
      this.style.set("viewer-list-padding2", ".chatter-list-item {padding: .2rem 0!important;}");
    } else {
      this.style.delete("viewer-list-padding1");
      this.style.delete("viewer-list-padding2");
    }
    // Appearance - UI Tweaks - Chat - Show Full Messages /w Expanded Replies
    if (this.settings.get("addon.trubbel.appearance.tweaks.chat-show-full-message")) {
      this.style.set("show-full-message", ".chat-line__message-container .tw-svg + div p {white-space: break-spaces !important;}");
    } else {
      this.style.delete("show-full-message");
    }
    // Appearance - UI Tweaks - Titles - Show full titles for Stream Tooltips
    if (this.settings.get("addon.trubbel.appearance.tweaks.full-side-nav-tooltip")) {
      this.style.set("show-full-side-nav-tooltip1", ".tw-balloon :has(.online-side-nav-channel-tooltip__body) { max-width: none !important; }");
      this.style.set("show-full-side-nav-tooltip2", ".online-side-nav-channel-tooltip__body :is(p) { display: block !important; -webkit-line-clamp: unset !important; -webkit-box-orient: unset !important; overflow: visible !important; text-overflow: unset !important; }");
      this.style.set("show-full-side-nav-tooltip3", ".tw-balloon :has(.side-nav-guest-star-tooltip__body) { max-width: none !important; }");
      this.style.set("show-full-side-nav-tooltip4", ".side-nav-guest-star-tooltip__body :is(p) { display: block !important; -webkit-line-clamp: unset !important; -webkit-box-orient: unset !important; overflow: visible !important; text-overflow: unset !important; }");
    } else {
      this.style.delete("show-full-side-nav-tooltip1");
      this.style.delete("show-full-side-nav-tooltip2");
      this.style.delete("show-full-side-nav-tooltip3");
      this.style.delete("show-full-side-nav-tooltip4");
    }
    // Appearance - UI Tweaks - Titles - Show full titles in Clip Previews
    if (this.settings.get("addon.trubbel.appearance.tweaks.titles-full-clip")) {
      this.style.set("titles-full-clip", "article [href*=\"/clip/\"] :is(h4[title]) {white-space: unset;}");
    } else {
      this.style.delete("titles-full-clip");
    }
    // Appearance - UI Tweaks - Titles - Show full titles in Stream Previews
    if (this.settings.get("addon.trubbel.appearance.tweaks.titles-full-stream")) {
      this.style.set("titles-full-stream", "[data-a-target=\"preview-card-channel-link\"] :is(h4[title]) {white-space: unset;}");
    } else {
      this.style.delete("titles-full-stream");
    }
    // Appearance - UI Tweaks - Titles - Show full titles in VOD Previews
    if (this.settings.get("addon.trubbel.appearance.tweaks.titles-full-vod")) {
      this.style.set("titles-full-vod", "article [href^=\"/videos/\"] :is(h4[title]) {white-space: unset;}");
    } else {
      this.style.delete("titles-full-vod");
    }
    // Appearance - UI Tweaks - Titles - Show full titles for Games in Directory
    if (this.settings.get("addon.trubbel.appearance.tweaks.titles-full-game")) {
      this.style.set("titles-full-game", ".game-card .tw-card-body :is([data-a-target=\"tw-card-title\"]) {white-space: unset;}.game-card .tw-card-body :is(h2[title]) {white-space: unset;}");
    } else {
      this.style.delete("titles-full-game");
    }
    // Appearance - UI Tweaks - Titles - Show full titles for Most Recent Videos
    if (this.settings.get("addon.trubbel.appearance.tweaks.titles-most-recent-video")) {
      this.style.set("titles-most-recent-video", ".player-overlay-background p[title] {white-space: unset;}");
    } else {
      this.style.delete("titles-most-recent-video");
    }
    // Appearance - UI Tweaks - Unban Requests - Hide Mod Actions in Unban Requests
    if (this.settings.get("addon.trubbel.appearance.tweaks.unban-requests-hide")) {
      // Hides the "Banned By"-text
      this.style.set("unban-requests-hide1", `
        .tw-root--theme-dark .mod-view-widget-popout .unban-requests-item-header-tab__banned-by-item button {
          color: transparent !important;
          background-color: #adadb8 !important;
          -webkit-user-select: none !important;
          user-select: none !important;
          pointer-events: none !important;
          padding: 0 90px !important;
        }
        .tw-root--theme-light .mod-view-widget-popout .unban-requests-item-header-tab__banned-by-item button {
          color: transparent !important;
          background-color: black !important;
          -webkit-user-select: none !important;
          user-select: none !important;
          pointer-events: none !important;
          padding: 0 90px !important;
        }
        `);
      // Removes the "(Deleted by moderator)"-text
      this.style.set("unban-requests-hide2", ".mod-view-widget-popout .chat-line__message--deleted span+span {display: none !important;}");
      // Hides the mod actions within the "Chat Logs"-tab
      this.style.set("unban-requests-hide3", `
        .tw-root--theme-dark .mod-view-widget-popout .targeted-mod-action .message__timestamp+span {
          color: transparent !important;
          background-color: #adadb8 !important;
          -webkit-user-select: none !important;
          user-select: none !important;
          padding: 0 90px !important;
        }
        .tw-root--theme-light .mod-view-widget-popout .targeted-mod-action .message__timestamp+span {
          color: transparent !important;
          background-color: black !important;
          -webkit-user-select: none !important;
          user-select: none !important;
          padding: 0 90px !important;
        }
        `);
      // Hides the mod actions within the "Mod Comments"-tab
      this.style.set("unban-requests-hide4", `
        .tw-root--theme-dark .mod-view-widget-popout .viewer-card-mod-logs-comment-line a span {
          color: transparent !important;
          background-color: #adadb8 !important;
          -webkit-user-select: none !important;
          user-select: none !important;
          padding: 0 90px !important;
        }
        .tw-root--theme-light .mod-view-widget-popout .viewer-card-mod-logs-comment-line a span {
          color: transparent !important;
          background-color: black !important;
          -webkit-user-select: none !important;
          user-select: none !important;
          padding: 0 90px !important;
        }
        `);
      // Making sure the mod link within the "Mod Comments"-tab isn't clickable
      this.style.set("unban-requests-hide5", ".mod-view-widget-popout .viewer-card-mod-logs-comment-line a {pointer-events: none !important;}");
      // Removes the "(Deleted by moderator)"-text, if a User Card is opened within Unban Requests
      this.style.set("unban-requests-hide6", "#root :has(.mod-view-widget-popout)+.popout-widget__viewer-card-layer .chat-line__message--deleted span+span {display: none !important;}");
      // Hides the mod actions within the "Chat Logs"-tab, if a User Card is opened within Unban Requests
      this.style.set("unban-requests-hide7", `
        .tw-root--theme-dark #root :has(.mod-view-widget-popout)+.popout-widget__viewer-card-layer .targeted-mod-action div>span.message__timestamp+span {
          color: transparent !important;
          background-color: #adadb8 !important;
          -webkit-user-select: none !important;
          user-select: none !important;
          padding: 0 50px !important;
        }
        .tw-root--theme-light #root :has(.mod-view-widget-popout)+.popout-widget__viewer-card-layer .targeted-mod-action div>span.message__timestamp+span {
          color: transparent !important;
          background-color: black !important;
          -webkit-user-select: none !important;
          user-select: none !important;
          padding: 0 50px !important;
        }
        `);
      // Hides the moderation action at the bottom of a User Card
      this.style.set("unban-requests-hide8", `
        .tw-root--theme-dark #root :has(.mod-view-widget-popout)+.popout-widget__viewer-card-layer .viewer-card-mod-logs>div:not([style]):not(.viewer-card-mod-logs-page) span+span>span {
          color: transparent !important;
          background-color: #adadb8 !important;
          -webkit-user-select: none !important;
          user-select: none !important;
          padding: 0 50px !important;
        }
        .tw-root--theme-light #root :has(.mod-view-widget-popout)+.popout-widget__viewer-card-layer .viewer-card-mod-logs>div:not([style]):not(.viewer-card-mod-logs-page) span+span>span {
          color: transparent !important;
          background-color: black !important;
          -webkit-user-select: none !important;
          user-select: none !important;
          padding: 0 50px !important;
        }
        `);
      // Hides the moderation action within User Card "Mod Comments"-tab
      this.style.set("unban-requests-hide9", `
        .tw-root--theme-dark #root :has(.mod-view-widget-popout)+.popout-widget__viewer-card-layer .viewer-card-mod-logs-comment-line a span {
          color: transparent !important;
          background-color: #adadb8 !important;
          -webkit-user-select: none !important;
          user-select: none !important;
          padding: 0 50px !important;
        }
        .tw-root--theme-light #root :has(.mod-view-widget-popout)+.popout-widget__viewer-card-layer .viewer-card-mod-logs-comment-line a span {
          color: transparent !important;
          background-color: black !important;
          -webkit-user-select: none !important;
          user-select: none !important;
          padding: 0 50px !important;
        }
        `);
      // Making sure the mod link within the "Mod Comments"-tab isn't clickable
      this.style.set("unban-requests-hide10", "#root :has(.mod-view-widget-popout)+.popout-widget__viewer-card-layer .viewer-card-mod-logs-comment-line a {pointer-events: none !important;}");
    } else {
      this.style.delete("unban-requests-hide1");
      this.style.delete("unban-requests-hide2");
      this.style.delete("unban-requests-hide3");
      this.style.delete("unban-requests-hide4");
      this.style.delete("unban-requests-hide5");
      this.style.delete("unban-requests-hide6");
      this.style.delete("unban-requests-hide7");
      this.style.delete("unban-requests-hide8");
      this.style.delete("unban-requests-hide9");
      this.style.delete("unban-requests-hide10");
    }
    // Appearance - UI Tweaks - Unban Requests - Remove line-through text in Unban Requests & User Cards
    if (this.settings.get("addon.trubbel.appearance.tweaks.unban-requests-deleted-message")) {
      this.style.set("unban-requests-deleted-message1", ".vcml-message .chat-line__message--deleted-detailed {text-decoration: none;}");
      this.style.set("unban-requests-deleted-message2", ".vcml-message .chat-line__message--deleted-detailed .chat-line__message--emote-button span::before {border-top-color: transparent;}");
    } else {
      this.style.delete("unban-requests-deleted-message1");
      this.style.delete("unban-requests-deleted-message2");
    }
    // Appearance - UI Tweaks - VOD - Show black background behind current and duration time
    if (this.settings.get("addon.trubbel.appearance.tweaks.vod-time-background")) {
      this.style.set("vod-time-background", "[data-a-target=\"player-seekbar-current-time\"],[data-a-target=\"player-seekbar-duration\"] {background-color: black;padding: 0px 0.4rem;border-radius: 0.2rem;}");
    } else {
      this.style.delete("vod-time-background");
    }
  }
}