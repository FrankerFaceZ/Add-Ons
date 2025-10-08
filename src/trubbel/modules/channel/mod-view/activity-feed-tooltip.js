const { createElement } = FrankerFaceZ.utilities.dom;

export default class ActivityFeedTooltip {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.router = parent.router;
    this.chat = parent.chat;
    this.site = parent.site;
    this.fine = parent.fine;
    this.elemental = parent.elemental;
    this.log = parent.log;

    this.isActive = false;

    this.handleNavigation = this.handleNavigation.bind(this);
    this.enableActivityFeed = this.enableActivityFeed.bind(this);
    this.disableActivityFeed = this.disableActivityFeed.bind(this);
    this.handleSettingChange = this.handleSettingChange.bind(this);
    this.onActivityItemMount = this.onActivityItemMount.bind(this);
    this.onActivityItemUnmount = this.onActivityItemUnmount.bind(this);
    this.processActivityItem = this.processActivityItem.bind(this);

    this.ActivityFeedItems = this.elemental.define(
      "activity-feed-items",
      "section[id^=\"activity_feed-\"] .activity-base-list-item",
      ["mod-view"],
      null,
      0,
      0
    );
  }

  initialize() {
    const enabled = this.settings.get("addon.trubbel.channel.mod_view.activity_feed.tooltips");
    if (enabled) {
      this.handleNavigation();
    } else {
      this.disableActivityFeed();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.log.info("[Activity Feed Tooltip] Enabling activity feed tooltips");
      this.handleNavigation();
    } else {
      this.log.info("[Activity Feed Tooltip] Disabling activity feed tooltips");
      this.disableActivityFeed();
    }
  }

  handleNavigation() {
    const currentRoute = ["dash-stream-manager", "mod-view"];
    if (currentRoute.includes(this.router?.current?.name)) {
      const enabled = this.settings.get("addon.trubbel.channel.mod_view.activity_feed.tooltips");
      if (enabled && !this.isActive) {
        this.log.info("[Activity Feed Tooltip] Entering mod-view, enabling activity feed moderation");
        this.enableActivityFeed();
      }
    } else {
      if (this.isActive) {
        this.log.info("[Activity Feed Tooltip] Leaving mod-view, disabling activity feed moderation");
        this.disableActivityFeed();
      }
    }
  }

  enableActivityFeed() {
    if (this.isActive) return;

    this.log.info("[Activity Feed Tooltip] Setting up activity feed processing");
    this.isActive = true;

    this.ActivityFeedItems.on("mount", this.onActivityItemMount);
    this.ActivityFeedItems.on("unmount", this.onActivityItemUnmount);
    this.ActivityFeedItems.each(el => this.onActivityItemMount(el));
  }

  disableActivityFeed() {
    if (!this.isActive) return;

    this.log.info("[Activity Feed Tooltip] Removing activity feed processing");
    this.isActive = false;

    this.ActivityFeedItems.off("mount", this.onActivityItemMount);
    this.ActivityFeedItems.off("unmount", this.onActivityItemUnmount);
  }

  onActivityItemMount(activityItem) {
    if (!this.isActive) {
      this.log.debug("[Activity Feed Tooltip] Not active, skipping item processing");
      return;
    }

    this.log.info("[Activity Feed Tooltip] Activity item mounted, processing content");
    this.processActivityItem(activityItem);
  }

  onActivityItemUnmount(activityItem) {
    this.log.debug("[Activity Feed Tooltip] Activity item unmounted");
  }

  processActivityItem(activityItem) {
    this.processEmotes(activityItem);
    this.processCheers(activityItem);
  }

  processEmotes(activityItem) {
    const emoteImages = activityItem.querySelectorAll(
      "img[src*=\"static-cdn.jtvnw.net/emoticons/v2/\"]:not(.ffz-tooltip)"
    );

    if (emoteImages.length === 0) return;

    this.log.info(`[Activity Feed Tooltip] Processing ${emoteImages.length} emotes`);

    emoteImages.forEach(oldImg => {
      const srcMatch = oldImg.src.match(/emoticons\/v2\/([^\/]+)/);
      if (!srcMatch) {
        this.log.warn("[Activity Feed Tooltip] Could not extract emote ID from:", oldImg.src);
        return;
      }

      const emoteId = srcMatch[1];
      const emoteName = oldImg.alt || "Unknown";

      const newImg = createElement("img", {
        className: "ffz-tooltip",
        src: oldImg.src,
        srcSet: oldImg.srcset,
        alt: emoteName,
        "data-tooltip-type": "emote",
        "data-provider": "twitch",
        "data-id": emoteId,
        "data-code": emoteName,
        "data-set": "",
        "data-normal-src": oldImg.src,
        "data-normal-src-set": oldImg.srcset || undefined
      });

      oldImg.parentNode.replaceChild(newImg, oldImg);

      this.log.debug(`[Activity Feed Tooltip] Replaced emote: ${emoteName} (${emoteId})`);
    });
  }

  processCheers(activityItem) {
    const cheerImages = activityItem.querySelectorAll(
      "img[src*=\"cloudfront.net/actions/cheer\"]:not(.ffz-tooltip)"
    );

    if (cheerImages.length === 0) return;

    this.log.info(`[Activity Feed Tooltip] Processing ${cheerImages.length} cheers`);

    cheerImages.forEach(oldImg => {
      const altText = oldImg.alt || "";
      const cheerMatch = altText.match(/^(\w+?)(\d+)$/);

      if (!cheerMatch) {
        this.log.warn("[Activity Feed Tooltip] Invalid cheer format in alt text:", altText);
        return;
      }

      const [, prefix, amountStr] = cheerMatch;
      const amount = parseInt(amountStr, 10);

      if (isNaN(amount)) {
        this.log.warn("[Activity Feed Tooltip] Invalid cheer amount:", amountStr);
        return;
      }

      const tier = this.calculateCheerTier(amount);

      const newImg = createElement("img", {
        className: "ffz-tooltip",
        src: oldImg.src,
        srcSet: oldImg.srcset,
        alt: `${prefix}${amount}`,
        "data-tooltip-type": "cheer",
        "data-prefix": prefix,
        "data-amount": amount.toString(),
        "data-tier": tier.toString(),
        "data-individuals": JSON.stringify(null)
      });

      oldImg.parentNode.replaceChild(newImg, oldImg);

      this.log.debug(`[Activity Feed Tooltip] Replaced cheer: ${prefix}${amount} (tier ${tier})`);
    });
  }

  calculateCheerTier(amount) {
    if (amount >= 10000) return 1;
    if (amount >= 5000) return 2;
    if (amount >= 1000) return 3;
    if (amount >= 100) return 4;
    return 5;
  }
}