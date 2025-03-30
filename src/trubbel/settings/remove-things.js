const { ManagedStyle } = FrankerFaceZ.utilities.dom;
const { has } = FrankerFaceZ.utilities.object;

const CLASSES = {
  "hide-side-nav-for-you": ".side-nav--expanded [aria-label] :is(.side-nav__title):has(h2[class*=\"tw-title\"]:first-child)",
  "hide-side-nav-guest-avatar": ".side-nav-card :is(.guest-star-avatar__mini-avatar)",
  "hide-side-nav-guest-number": ".side-nav-card [data-a-target=\"side-nav-card-metadata\"] :is(p):nth-child(2)",
  "hide-side-nav-hype-train": ".side-nav-card-hype-train-bottom",
  "hide-player-live-badge": ".video-player .top-bar .tw-channel-status-text-indicator",
  "hide-stream-monthly-recap": "div:first-child article:has(a[href^=\"/recaps/\"])",
  "hide-stream-sponsored-content-chat-banner": ".stream-chat div :is(.channel-skins-banner__interactive)",
  "hide-stream-sponsored-content-within-player": ".video-player :is(.channel-skins-overlay__background)",
  "hide-stream-sponsored-content-below-player": ".channel-info-content div[style]:has(.channel-skins-ribbon__container)",
  "hide-vod-muted-segment-popup": ".video-player .muted-segments-alert__scroll-wrapper",
};

export class RemoveThings extends FrankerFaceZ.utilities.module.Module {
  constructor(...args) {
    super(...args);

    this.style = new ManagedStyle;

    this.inject("settings");
    this.inject("site.router");

    // Remove/Hide Things - Left Navigation - Remove the "For You"-text
    this.settings.add("addon.trubbel.remove-things.left-nav-for-you", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Remove/Hide Things >> Left Navigation",
        title: "Remove the \"For You\"-text",
        component: "setting-check-box"
      },
      changed: val => this.toggleHide("hide-side-nav-for-you", val)
    });
    // Remove/Hide Things - Left Navigation - Remove the Guest avatars
    this.settings.add("addon.trubbel.remove-things.left-nav-guest-avatar", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Remove/Hide Things >> Left Navigation",
        title: "Remove the Guest avatars",
        component: "setting-check-box"
      },
      changed: val => this.toggleHide("hide-side-nav-guest-avatar", val)
    });
    // Remove/Hide Things - Left Navigation - Remove the Guest +number text
    this.settings.add("addon.trubbel.remove-things.left-nav-guest-number", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Remove/Hide Things >> Left Navigation",
        title: "Remove the Guest +number text",
        component: "setting-check-box"
      },
      changed: val => this.toggleHide("hide-side-nav-guest-number", val)
    });
    // Remove/Hide Things - Left Navigation - Remove Hype Train
    this.settings.add("addon.trubbel.remove-things.left-nav-hype-train", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Remove/Hide Things >> Left Navigation",
        title: "Remove Hype Train",
        component: "setting-check-box"
      },
      changed: val => this.toggleHide("hide-side-nav-hype-train", val)
    });
    // Remove/Hide Things - Player - Remove the Gradient from Player
    this.settings.add("addon.trubbel.remove-things.player-gradient", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Remove/Hide Things >> Player",
        title: "Remove the Gradient from Player",
        component: "setting-check-box"
      },
      changed: () => this.updateCSS()
    });
    // Remove/Hide Things - Player - Remove the "LIVE"-badge from Player
    this.settings.add("addon.trubbel.remove-things.player-live", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Remove/Hide Things >> Player",
        title: "Remove the \"LIVE\"-badge from Player",
        component: "setting-check-box"
      },
      changed: val => this.toggleHide("hide-player-live-badge", val)
    });
    // Remove/Hide Things - Stories - Remove Stories
    this.settings.add("addon.trubbel.remove-things.stories", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Remove/Hide Things >> Stories",
        title: "Remove Stories",
        component: "setting-check-box"
      },
      changed: () => this.updateCSS()
    });
    // Remove/Hide Things - Stream - Remove Remove About Section and Panels
    this.settings.add("addon.trubbel.remove-things.stream-about-panels", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Remove/Hide Things >> Stream",
        title: "Remove About Section and Panels",
        component: "setting-check-box"
      },
      changed: () => this.updateCSS()
    });
    // Remove/Hide Things - Stream - Remove Monthly Recap below Streams
    this.settings.add("addon.trubbel.remove-things.stream-monthly-recap", {
      default: false,
      ui: {
        sort: 1,
        path: "Add-Ons > Trubbel\u2019s Utilities > Remove/Hide Things >> Stream",
        title: "Remove Monthly Recap below Streams",
        component: "setting-check-box"
      },
      changed: val => this.toggleHide("hide-stream-monthly-recap", val)
    });
    // Remove/Hide Things - Stream - Remove Power-ups within the Rewards popup
    this.settings.add("addon.trubbel.remove-things.stream-power-ups", {
      default: false,
      ui: {
        sort: 2,
        path: "Add-Ons > Trubbel\u2019s Utilities > Remove/Hide Things >> Stream",
        title: "Remove Power-ups within the Rewards popup",
        component: "setting-check-box"
      },
      changed: () => this.updateCSS()
    });
    // Remove/Hide Things - Stream - Remove Sponsored content above stream chat
    this.settings.add("addon.trubbel.remove-things.stream-sponsored-content-chat-banner", {
      default: false,
      ui: {
        sort: 3,
        path: "Add-Ons > Trubbel\u2019s Utilities > Remove/Hide Things >> Stream",
        title: "Remove Sponsored content above stream chat",
        component: "setting-check-box"
      },
      changed: val => this.toggleHide("hide-stream-sponsored-content-chat-banner", val)
    });
    // Remove/Hide Things - Stream - Remove Sponsored content within the Player
    this.settings.add("addon.trubbel.remove-things.stream-sponsored-content-within-player", {
      default: false,
      ui: {
        sort: 4,
        path: "Add-Ons > Trubbel\u2019s Utilities > Remove/Hide Things >> Stream",
        title: "Remove Sponsored content within the Player",
        component: "setting-check-box"
      },
      changed: val => this.toggleHide("hide-stream-sponsored-content-within-player", val)
    });
    // Remove/Hide Things - Stream - Remove Sponsored content below the Player
    this.settings.add("addon.trubbel.remove-things.stream-sponsored-content-below-player", {
      default: false,
      ui: {
        sort: 5,
        path: "Add-Ons > Trubbel\u2019s Utilities > Remove/Hide Things >> Stream",
        title: "Remove Sponsored content below the Player",
        component: "setting-check-box"
      },
      changed: val => this.toggleHide("hide-stream-sponsored-content-below-player", val)
    });
    // Remove/Hide Things - VODs - Remove Muted Segments Alerts popups
    this.settings.add("addon.trubbel.remove-things.vod-muted-segment-popup", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Remove/Hide Things >> VODs",
        title: "Remove Muted Segments Alerts popups",
        component: "setting-check-box"
      },
      changed: val => this.toggleHide("hide-vod-muted-segment-popup", val)
    });
  }

  onEnable() {
    this.toggleHide("hide-side-nav-for-you", this.settings.get("addon.trubbel.remove-things.left-nav-for-you"));
    this.toggleHide("hide-side-nav-guest-avatar", this.settings.get("addon.trubbel.remove-things.left-nav-guest-avatar"));
    this.toggleHide("hide-side-nav-guest-number", this.settings.get("addon.trubbel.remove-things.left-nav-guest-number"));
    this.toggleHide("hide-side-nav-hype-train", this.settings.get("addon.trubbel.remove-things.left-nav-hype-train"));
    this.toggleHide("hide-player-live-badge", this.settings.get("addon.trubbel.remove-things.player-live"));
    this.toggleHide("hide-stream-monthly-recap", this.settings.get("addon.trubbel.remove-things.stream-monthly-recap"));
    this.toggleHide("hide-stream-sponsored-content-chat-banner", this.settings.get("addon.trubbel.remove-things.stream-sponsored-content-chat-banner"));
    this.toggleHide("hide-stream-sponsored-content-within-player", this.settings.get("addon.trubbel.remove-things.stream-sponsored-content-within-player"));
    this.toggleHide("hide-stream-sponsored-content-below-player", this.settings.get("addon.trubbel.remove-things.stream-sponsored-content-below-player"));
    this.toggleHide("hide-vod-muted-segment-popup", this.settings.get("addon.trubbel.remove-things.vod-muted-segment-popup"));
    this.updateCSS();
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

    this.style.set(k, `${CLASSES[key]} { display: none !important }`);
  }

  updateCSS() {
    // Remove/Hide Things - Stream - Remove the Gradient from Player
    if (this.settings.get("addon.trubbel.remove-things.player-gradient")) {
      this.style.set("hide-player-gradient", ".video-player .top-bar, .video-player .player-controls { background: transparent !important; }");
    } else {
      this.style.delete("hide-player-gradient");
    }
    // Remove/Hide Things - Stream - Remove Remove About Section and Panels
    if (this.settings.get("addon.trubbel.remove-things.stream-about-panels")) {
      this.style.set("hide-stream-about-panels1", "[id=\"live-channel-about-panel\"], .channel-panels { display: none !important; }");
      this.style.set("hide-stream-about-panels2", ".channel-info-content:not(:has(.timestamp-metadata__bar)) :is(div[style^=\"min-height:\"]) { min-height: 0px !important; }");
      this.style.set("hide-stream-about-panels3", ".channel-info-content:not(:has(.timestamp-metadata__bar)) :is(.tw-tower:has(.tw-placeholder-wrapper)) { display: none !important; }");
    } else {
      this.style.delete("hide-stream-about-panels1");
      this.style.delete("hide-stream-about-panels2");
      this.style.delete("hide-stream-about-panels3");
    }
    // Remove/Hide Things - Stream - Remove Power-ups within the Rewards popup
    if (this.settings.get("addon.trubbel.remove-things.stream-power-ups")) {
      this.style.set("hide-stream-power-ups1", ".rewards-list :is([class*=\"bitsRewardListItem--\"]) { display: none !important; }");
      this.style.set("hide-stream-power-ups2", ".rewards-list > div:first-child:has(.tw-title:only-child) { display: none !important; }");
      this.style.set("hide-stream-power-ups3", ".rewards-list > :is(div:has(> div > .tw-title)) { padding: 0rem 0.5rem 1rem !important; }");
    } else {
      this.style.delete("hide-stream-power-ups1");
      this.style.delete("hide-stream-power-ups2");
      this.style.delete("hide-stream-power-ups3");
    }
    // Remove/Hide Things - Stories - Remove Stories
    if (this.settings.get("addon.trubbel.remove-things.stories")) {
      this.style.set("hide-stories-left-nav-expanded", "#side-nav [class*=\"storiesLeftNavSection--\"] { display: none !important; }");
      this.style.set("hide-stories-left-nav-collapsed", "#side-nav :is([style]) :has([class*=\"storiesLeftNavSectionCollapsedButton--\"]) { display: none !important; }");
      this.style.set("hide-stories-following-page", "div[class^=\"Layout-sc-\"]:has(> [data-simplebar=\"init\"] > .simplebar-scroll-content > .simplebar-content[style] h2.sr-only) { display: none !important; }");
    } else {
      this.style.delete("hide-stories-left-nav-expanded");
      this.style.delete("hide-stories-left-nav-collapsed");
      this.style.delete("hide-stories-following-page");
    }
  }
}