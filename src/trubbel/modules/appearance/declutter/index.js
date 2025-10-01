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
      "hide-player-cc": "[data-a-target=\"player-settings-menu\"] div:has(> button.tw-interactable [d=\"M2 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5zm2 0h12v10H4V5z\"])",
      "hide-player-disclosure": ".disclosure-tool",
      "hide-player-mrv": ".video-player__overlay :is(.player-overlay-background--darkness-3):has(.offline-recommendations-video-card)",
      "hide-stories": "#side-nav [class*=\"storiesLeftNavSection--\"],#side-nav :is([style]) :has([class*=\"storiesLeftNavSectionCollapsedButton--\"]),div[class^=\"Layout-sc-\"]:has(> .scrollable-area[style] > div[style] > h2.sr-only)",
      "hide-stream-monthly-recap": "div > div:has(> article a[href*=\"/recaps/\"])",
      "hide-vod-muted-segment-popup": ".video-player .muted-segments-alert__scroll-wrapper",
    };

    this.tokenizer = {
      type: "combos",
      priority: 0,
      process: (tokens, msg) => {
        const chatTypes = this.parent.resolve("site.chat").chat_types;

        const combos = [
          chatTypes.OneTapBreakpointAchieved,
          chatTypes.OneTapStreakExpired,
          chatTypes.OneTapStreakStarted
        ];

        if (combos.includes(msg.type)) {
          msg.ffz_removed = true;
        }
      }
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

    // Appearance - Declutter - Channel - Hide Combos
    this.settings.getChanges("addon.trubbel.appearance.declutter.channel.combos", val => {
      this.loadable.toggle("CombosIngressButton_Available", !val);
      this.loadable.toggle("OneTapStreakPills", !val);

      if (val) this.parent.resolve("site.chat").chat.addTokenizer(this.tokenizer);
      else this.parent.resolve("site.chat").chat.removeTokenizer(this.tokenizer);
    });

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