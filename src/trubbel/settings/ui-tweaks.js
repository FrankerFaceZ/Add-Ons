import { autoChangeTheme } from "../features/theme/system-theme";
const { ManagedStyle } = FrankerFaceZ.utilities.dom;

export class UITweaks extends FrankerFaceZ.utilities.module.Module {
  constructor(...args) {
    super(...args);

    this.style = new ManagedStyle;

    this.inject("settings");
    this.inject("site.router");

    // UI Tweaks - Chat - Reduce Chat Viewer List Padding
    this.settings.add("addon.trubbel.ui-tweaks.chat-viewer-list-padding", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > UI Tweaks >> Chat",
        title: "Reduce Chat Viewer List Padding",
        description: "Gives the ability to adjust the height of the whisper window drop down.",
        component: "setting-check-box"
      },
      changed: () => this.updateCSS()
    });
    // UI Tweaks - System Theme - Enable System Theme
    this.settings.add("addon.trubbel.ui-tweaks.system-theme", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > UI Tweaks >> System Theme",
        title: "Enable System Theme",
        description: "Automatically sets Twitch theme based on system preferences.",
        component: "setting-check-box"
      },
      changed: () => this.getCurrentTheme()
    });
    // UI Tweaks - Titles - Show full titles for Stream Tooltips
    this.settings.add("addon.trubbel.ui-tweaks.full-side-nav-tooltip", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > UI Tweaks >> Titles",
        title: "Show full titles for Stream Tooltips",
        description: "Show the full title tooltip when hovering over a stream in the left side navigation.",
        component: "setting-check-box"
      },
      changed: () => this.updateCSS()
    });
    // UI Tweaks - Titles - Show full titles in Stream Previews
    this.settings.add("addon.trubbel.ui-tweaks.titles-full-stream", {
      default: false,
      ui: {
        sort: 1,
        path: "Add-Ons > Trubbel\u2019s Utilities > UI Tweaks >> Titles",
        title: "Show full titles in Stream Previews",
        component: "setting-check-box"
      },
      changed: () => this.updateCSS()
    });
    // UI Tweaks - Titles - Show full titles in Clip Previews
    this.settings.add("addon.trubbel.ui-tweaks.titles-full-clip", {
      default: false,
      ui: {
        sort: 2,
        path: "Add-Ons > Trubbel\u2019s Utilities > UI Tweaks >> Titles",
        title: "Show full titles in Clip Previews",
        component: "setting-check-box"
      },
      changed: () => this.updateCSS()
    });
    // UI Tweaks - Titles - Show full titles in VOD Previews
    this.settings.add("addon.trubbel.ui-tweaks.titles-full-vod", {
      default: false,
      ui: {
        sort: 3,
        path: "Add-Ons > Trubbel\u2019s Utilities > UI Tweaks >> Titles",
        title: "Show full titles in VOD Previews",
        component: "setting-check-box"
      },
      changed: () => this.updateCSS()
    });
    // UI Tweaks - Titles - Show full titles for Games in Directory
    this.settings.add("addon.trubbel.ui-tweaks.titles-full-game", {
      default: false,
      ui: {
        sort: 4,
        path: "Add-Ons > Trubbel\u2019s Utilities > UI Tweaks >> Titles",
        title: "Show full titles for Games in Directory",
        component: "setting-check-box"
      },
      changed: () => this.updateCSS()
    });
    // UI Tweaks - Titles - Show full titles for Most Recent Videos
    this.settings.add("addon.trubbel.ui-tweaks.titles-most-recent-video", {
      default: false,
      ui: {
        sort: 5,
        path: "Add-Ons > Trubbel\u2019s Utilities > UI Tweaks >> Titles",
        title: "Show full titles for Most Recent Videos",
        component: "setting-check-box"
      },
      changed: () => this.updateCSS()
    });
    // UI Tweaks - Unban Requests - Hide Mod Actions in Unban Requests
    this.settings.add("addon.trubbel.ui-tweaks.unban-requests-hide", {
      default: false,
      ui: {
        sort: 1,
        path: "Add-Ons > Trubbel\u2019s Utilities > UI Tweaks >> Unban Requests",
        title: "Hide Mod Actions in Unban Requests",
        description: "Hide all mod actions taken in the **Unban Requests popout window**.",
        component: "setting-check-box"
      },
      changed: () => this.updateCSS()
    });
    // UI Tweaks - Unban Requests - Remove the line-through text from deleted messages
    this.settings.add("addon.trubbel.ui-tweaks.unban-requests-deleted-message", {
      default: false,
      ui: {
        sort: 2,
        path: "Add-Ons > Trubbel\u2019s Utilities > UI Tweaks >> Unban Requests",
        title: "Remove line-through text in Unban Requests & User Cards",
        description: "Remove the line-through text in Unban Requests and within user cards moderated messages.",
        component: "setting-check-box"
      },
      changed: () => this.updateCSS()
    });
    // UI Tweaks - VOD - Show black background behind current and duration time
    this.settings.add("addon.trubbel.ui-tweaks.vod-time-background", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > UI Tweaks >> VOD",
        title: "Show black background behind current and duration time",
        description: "Show a black background behind VODs seekbar, for current time and duration. Making it easier to see the white text.",
        component: "setting-check-box"
      },
      changed: () => this.updateCSS()
    });
  }

  onEnable() {
    this.settings.getChanges("addon.trubbel.ui-tweaks.system-theme", () => this.getCurrentTheme());
    this.router.on(":route", () => {
      this.getCurrentTheme();
    });
    this.getCurrentTheme();

    this.updateCSS();
  }

  getCurrentTheme() {
    const enabled = this.settings.get("addon.trubbel.ui-tweaks.system-theme");
    if (enabled) {
      autoChangeTheme(this);
    }
  }

  updateCSS() {
    // UI Tweaks - Chat - Reduce Chat Viewer List Padding
    if (this.settings.get("addon.trubbel.ui-tweaks.chat-viewer-list-padding")) {
      this.style.set("viewer-list-padding1", "#community-tab-content > div {padding: 1rem !important;}");
      this.style.set("viewer-list-padding2", ".chatter-list-item {padding: .2rem 0!important;}");
    } else {
      this.style.delete("viewer-list-padding1");
      this.style.delete("viewer-list-padding2");
    }
    // UI Tweaks - Titles - Show full titles for Stream Tooltips
    if (this.settings.get("addon.trubbel.ui-tweaks.full-side-nav-tooltip")) {
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
    // UI Tweaks - Titles - Show full titles in Clip Previews
    if (this.settings.get("addon.trubbel.ui-tweaks.titles-full-clip")) {
      this.style.set("titles-full-clip", "article [href*=\"/clip/\"] :is(h3[title]) {white-space: unset;}");
    } else {
      this.style.delete("titles-full-clip");
    }
    // UI Tweaks - Titles - Show full titles in Stream Previews
    if (this.settings.get("addon.trubbel.ui-tweaks.titles-full-stream")) {
      this.style.set("titles-full-stream", "[data-a-target=\"preview-card-channel-link\"] :is(h3[title]) {white-space: unset;}");
    } else {
      this.style.delete("titles-full-stream");
    }
    // UI Tweaks - Titles - Show full titles in VOD Previews
    if (this.settings.get("addon.trubbel.ui-tweaks.titles-full-vod")) {
      this.style.set("titles-full-vod", "article [href^=\"/videos/\"] :is(h3[title]) {white-space: unset;}");
    } else {
      this.style.delete("titles-full-vod");
    }
    // UI Tweaks - Titles - Show full titles for Games in Directory
    if (this.settings.get("addon.trubbel.ui-tweaks.titles-full-game")) {
      this.style.set("titles-full-game", ".game-card .tw-card-body :is([data-a-target=\"tw-card-title\"]) {white-space: unset;}.game-card .tw-card-body :is(h2[title]) {white-space: unset;}");
    } else {
      this.style.delete("titles-full-game");
    }
    // UI Tweaks - Titles - Show full titles for Most Recent Videos
    if (this.settings.get("addon.trubbel.ui-tweaks.titles-most-recent-video")) {
      this.style.set("titles-most-recent-video", ".player-overlay-background p[title] {white-space: unset;}");
    } else {
      this.style.delete("titles-most-recent-video");
    }
    // UI Tweaks - Unban Requests - Hide Mod Actions in Unban Requests
    if (this.settings.get("addon.trubbel.ui-tweaks.unban-requests-hide")) {
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
    // UI Tweaks - Unban Requests - Remove the line-through text from deleted messages
    if (this.settings.get("addon.trubbel.ui-tweaks.unban-requests-deleted-message")) {
      this.style.set("unban-requests-deleted-message", ".vcml-message .chat-line__message--deleted-detailed {text-decoration: none;}");
    } else {
      this.style.delete("unban-requests-deleted-message");
    }
    // UI Tweaks - VOD - Show black background behind current and duration time
    if (this.settings.get("addon.trubbel.ui-tweaks.vod-time-background")) {
      this.style.set("vod-time-background", "[data-a-target=\"player-seekbar-current-time\"],[data-a-target=\"player-seekbar-duration\"] {background-color: black;padding: 0px 0.4rem;border-radius: 0.2rem;}");
    } else {
      this.style.delete("vod-time-background");
    }
  }
}