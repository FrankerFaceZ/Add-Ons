export default class Declutter {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.loadable = parent.loadable;
    this.style = parent.style;

    this.CLASSES = {
      "hide-stream-chat-header": ".stream-chat-header,.toggle-visibility__right-column--expanded",
      "hide-following-title": ".common-centered-column:has(section#following-page-main-content) h1.tw-title",
      "hide-sidebar-for-you": ".side-nav--expanded [aria-label] :is(.side-nav__title):has(h3[class*=\"tw-title\"]:first-child)",
      "hide-sidebar-sort-paragraph": "[data-a-target=\"side-nav-header-expanded\"] p",
      "hide-sidebar-guest-avatar": ".side-nav-card :is(.primary-with-small-avatar__mini-avatar)",
      "hide-sidebar-guest-number": ".side-nav-card [data-a-target=\"side-nav-card-metadata\"] :is(p):nth-child(2)",
      "hide-sidebar-all-time-high-train": ".side-nav-card div:has(> .hype-train-icon__trophy)",
      "hide-sidebar-golden-kappa-train": ".side-nav-card div:has(> .hype-train-icon__train--golden-kappa)",
      "hide-sidebar-shared-hype-train": ".side-nav-card div:has(> .hype-train-icon__train--shared)",
      "hide-sidebar-treasure-train": ".side-nav-card div:has(> .hype-train-icon__train--treasure)",
      "hide-sidebar-hype-train": ".side-nav-card div:has(> .hype-train-icon__train--default)",
      "hide-sidebar-gift-discount": ".side-nav-card div:has(> [class*=\"giftGradient--\"])",
      "hide-player-cc": "[data-a-target=\"player-settings-menu\"] div:has(> button.tw-interactable [d=\"M2 5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5Zm2 0h16v14H4V5Z\"]),[data-a-target=\"player-settings-menu\"] div:has(> button.tw-interactable [d=\"M4 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H4Zm6.642 10.242c-.301.494-.763.758-1.163.758-.66 0-1.488-.717-1.488-2s.828-2 1.488-2c.4 0 .862.264 1.163.758l.858-.494C11.05 9.498 10.313 9 9.479 9 8.109 9 7 10.343 7 12s1.11 3 2.479 3c.834 0 1.572-.499 2.021-1.264l-.858-.494Zm5.5 0c-.301.494-.763.758-1.163.758-.66 0-1.488-.717-1.488-2s.828-2 1.488-2c.4 0 .862.264 1.163.758l.858-.494C16.55 9.498 15.813 9 14.979 9c-1.37 0-2.479 1.343-2.479 3s1.11 3 2.479 3c.834 0 1.572-.499 2.021-1.264l-.858-.494Z\"])",
      "hide-player-disclosure": ".disclosure-tool",
      "hide-player-mrv": ".video-player__overlay :is(.player-overlay-background--darkness-3):has(.offline-recommendations-video-card)",
      "hide-stories": "#side-nav [class*=\"storiesLeftNavSection--\"],#side-nav :is([style]) :has([class*=\"storiesLeftNavSectionCollapsedButton--\"]),div[class^=\"Layout-sc-\"]:has(> .scrollable-area[style] > div[style] > h2.sr-only)",
      "hide-stream-monthly-recap": "div > div:has(> article a[href*=\"/recaps/\"])",
      "hide-vod-muted-segment-popup": ".video-player .muted-segments-alert__scroll-wrapper",
    };
  }

  onEnable() {
    this.toggleHide("hide-stream-chat-header", this.settings.get("addon.trubbel.appearance.declutter.chat.stream_header"));
    this.toggleHide("hide-following-title", this.settings.get("addon.trubbel.appearance.declutter.directory.following_title"));
    this.toggleHide("hide-sidebar-for-you", this.settings.get("addon.trubbel.appearance.declutter.sidebar.for_you"));
    this.toggleHide("hide-sidebar-sort-paragraph", this.settings.get("addon.trubbel.appearance.declutter.sidebar.sort_paragraph"));
    this.toggleHide("hide-sidebar-guest-avatar", this.settings.get("addon.trubbel.appearance.declutter.sidebar.guest_avatar"));
    this.toggleHide("hide-sidebar-guest-number", this.settings.get("addon.trubbel.appearance.declutter.sidebar.guest_number"));
    this.toggleHide("hide-sidebar-all-time-high-train", this.settings.get("addon.trubbel.appearance.declutter.sidebar.all_time_high_train"));
    this.toggleHide("hide-sidebar-golden-kappa-train", this.settings.get("addon.trubbel.appearance.declutter.sidebar.golden_kappa_train"));
    this.toggleHide("hide-sidebar-shared-hype-train", this.settings.get("addon.trubbel.appearance.declutter.sidebar.shared_hype_train"));
    this.toggleHide("hide-sidebar-treasure-train", this.settings.get("addon.trubbel.appearance.declutter.sidebar.treasure_train"));
    this.toggleHide("hide-sidebar-hype-train", this.settings.get("addon.trubbel.appearance.declutter.sidebar.hype_train"));
    this.toggleHide("hide-sidebar-gift-discount", this.settings.get("addon.trubbel.appearance.declutter.sidebar.gift_discount"));
    this.toggleHide("hide-player-cc", this.settings.get("addon.trubbel.appearance.declutter.player.cc"));
    this.toggleHide("hide-player-disclosure", this.settings.get("addon.trubbel.appearance.declutter.player.disclosure"));
    this.toggleHide("hide-player-mrv", this.settings.get("addon.trubbel.appearance.declutter.player.most_recent_video"));
    this.toggleHide("hide-stories", this.settings.get("addon.trubbel.appearance.declutter.stories"));
    this.toggleHide("hide-stream-monthly-recap", this.settings.get("addon.trubbel.appearance.declutter.stream.monthly_recap"));
    this.toggleHide("hide-vod-muted-segment-popup", this.settings.get("addon.trubbel.appearance.declutter.vods.muted_segment_popup"));
    this.updateCSS();

    // Appearance - Declutter - Stream - Hide sponsored banner above chat
    this.settings.getChanges("addon.trubbel.appearance.declutter.stream.ChannelSkinsBanner", val => {
      this.loadable.toggle("ChannelSkinsBanner", !val);
    });
    // Appearance - Declutter - Stream - Hide sponsored logo within player
    this.settings.getChanges("addon.trubbel.appearance.declutter.stream.ChannelSkinsOverlay", val => {
      this.loadable.toggle("ChannelSkinsOverlay", !val);
    });
    // Appearance - Declutter - Stream - Hide sponsored banner below player
    this.settings.getChanges("addon.trubbel.appearance.declutter.stream.ChannelSkinsRibbon", val => {
      this.loadable.toggle("ChannelSkinsRibbon", !val);
    });
  }

  toggleHide(key, val) {
    const k = `hide--${key}`;
    if (!val) {
      this.style.delete(k);
      return;
    }
    if (!FrankerFaceZ.utilities.object.has(this.CLASSES, key)) {
      throw new Error(`cannot find class for "${key}"`);
    }
    this.style.set(k, `${this.CLASSES[key]} {display: none !important}`);
  }

  updateCSS() {
    // Appearance - Declutter - Player - Hide the top gradient
    if (this.settings.get("addon.trubbel.appearance.declutter.player.top_gradient")) {
      this.style.set("hide-player-top-gradient", ".video-player .top-bar {background: transparent !important;}");
    } else {
      this.style.delete("hide-player-top-gradient");
    }
    // Appearance - Declutter - Player - Hide the bottom gradient
    if (this.settings.get("addon.trubbel.appearance.declutter.player.bottom_gradient")) {
      this.style.set("hide-player-bottom-gradient", ".video-player .player-controls {background: transparent !important;}");
    } else {
      this.style.delete("hide-player-bottom-gradient");
    }
    // Appearance - Declutter - Stream - Hide the about section and panels
    if (this.settings.get("addon.trubbel.appearance.declutter.stream.about_panels")) {
      this.style.set("hide-stream-about-panels1", "[id=\"live-channel-about-panel\"], .channel-panels {display: none !important;}");
      this.style.set("hide-stream-about-panels2", ".channel-info-content:not(:has(.timestamp-metadata__bar)) :is(div[style^=\"min-height:\"]) {min-height: 0px !important;}");
      this.style.set("hide-stream-about-panels3", ".channel-info-content:not(:has(.timestamp-metadata__bar)) :is(.tw-tower:has(.tw-placeholder-wrapper)) {display: none !important;}");
    } else {
      this.style.delete("hide-stream-about-panels1");
      this.style.delete("hide-stream-about-panels2");
      this.style.delete("hide-stream-about-panels3");
    }
    // Appearance - Declutter - Stream - Hide power-ups within the rewards popup
    if (this.settings.get("addon.trubbel.appearance.declutter.stream.power_ups")) {
      this.style.set("hide-stream-power-ups", `
          .reward-center-body .rewards-list {
            margin-inline: auto !important;
          }
          .reward-center-body .rewards-list > div:first-child:has(p) {
            display: none !important;
            padding-block-end: 0px !important;
            padding-inline: 0px !important;
            padding-block: 0px !important;
          }
          .reward-center-body .rewards-list > [class*="bitsRewardListItem--"] {
            display: none !important;
          }
          .reward-center-body .rewards-list div:has(> div:first-child p) {
            padding-block: 0px !important;
          }
        `);
    } else {
      this.style.delete("hide-stream-power-ups");
    }
  }
}