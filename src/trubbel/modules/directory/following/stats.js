import { FOLLOWING_CHANNELS_SELECTOR } from "../../../utilities/constants/selectors";

import GET_USER_STATS from "../../../utilities/graphql/user-stats.gql";

export default class FollowingStats {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.router = parent.router;
    this.site = parent.site;
    this.i18n = parent.i18n;
    this.log = parent.log;

    this.isActive = false;

    this.initialize = this.initialize.bind(this);
    this.handleNavigation = this.handleNavigation.bind(this);
    this.enableFollowingStats = this.enableFollowingStats.bind(this);
    this.disableFollowingStats = this.disableFollowingStats.bind(this);
    this.handleSettingChange = this.handleSettingChange.bind(this);
    this.showTotalFollowedChannels = this.showTotalFollowedChannels.bind(this);
    this.updateStatDisplay = this.updateStatDisplay.bind(this);
    this.removeFollowedChannelsCount = this.removeFollowedChannelsCount.bind(this);
  }

  initialize() {
    const enabled = this.settings.get("addon.trubbel.directory.following.tabs");
    if (enabled) {
      this.handleNavigation();
    } else {
      this.disableFollowingStats();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.log.info("[Following Page Stats] Enabling total followed channels display");
      this.handleNavigation();
    } else {
      this.log.info("[Following Page Stats] Disabling total followed channels display");
      this.disableFollowingStats();
    }
  }

  handleNavigation() {
    const currentRoute = this.router?.current?.name;
    if (currentRoute === "dir-following") {
      const enabled = this.settings.get("addon.trubbel.directory.following.tabs");
      if (enabled && !this.isActive) {
        this.log.info("[Following Page Stats] Entering following page, enabling followed channels display");
        this.enableFollowingStats();
      }
    } else {
      if (this.isActive) {
        this.log.info("[Following Page Stats] Leaving following page, disabling followed channels display");
        this.disableFollowingStats();
      }
    }
  }

  enableFollowingStats() {
    if (this.isActive) return;

    this.log.info("[Following Page Stats] Setting up followed channels display");
    this.isActive = true;
    this.showTotalFollowedChannels();
  }

  disableFollowingStats() {
    if (!this.isActive) return;

    this.log.info("[Following Page Stats] Removing followed channels display");
    this.isActive = false;
    this.removeFollowedChannelsCount();
  }

  async showTotalFollowedChannels() {
    if (!this.isActive) return;

    this.log.info("[Following Page Stats] Attempting to show stats");

    try {
      const showChannels = this.settings.get("addon.trubbel.directory.following.tabs.channels");
      if (!showChannels) return;

      const apollo = this.parent.resolve("site.apollo");
      if (!apollo) {
        this.log.warn("[Following Page Stats] Apollo client not available");
        return;
      }

      const result = await apollo.client.query({
        query: GET_USER_STATS,
        variables: {
          includeFollows: showChannels
        }
      });

      const data = result?.data?.currentUser;
      if (!data) {
        this.log.warn("[Following Page Stats] No data received from query");
        return;
      }

      if (showChannels && data.follows) {
        await this.updateStatDisplay(FOLLOWING_CHANNELS_SELECTOR, data.follows.totalCount, "Channels");
      }

    } catch (error) {
      this.log.error("[Following Page Stats] Error showing stats:", error);
    }
  }

  async updateStatDisplay(selector, count, statName) {
    try {
      const tabElement = await this.site.awaitElement(selector, document.documentElement, 5000);
      if (tabElement) {
        if (!tabElement.textContent.includes("(")) {
          const formattedCount = this.i18n.formatNumber(count);
          tabElement.textContent += ` (${formattedCount})`;
          this.log.info(`[Following ${statName} Stats] Added count: ${formattedCount}`);
        } else {
          this.log.info(`[Following ${statName} Stats] Count already set`);
        }
      } else {
        this.log.warn(`[Following ${statName} Stats] Unable to find tab element:`, selector);
      }
    } catch (error) {
      this.log.error(`[Following ${statName} Stats] Error updating display:`, error);
    }
  }

  removeFollowedChannelsCount() {
    const selectors = [
      FOLLOWING_CHANNELS_SELECTOR
    ];

    selectors.forEach(selector => {
      try {
        const tabElement = document.querySelector(selector);
        if (tabElement && tabElement.textContent.includes("(")) {
          // Remove the count by extracting text before the first "("
          const originalText = tabElement.textContent.split("(")[0].trim();
          tabElement.textContent = originalText;
        }
      } catch (error) {
        this.log.error("[Following Page Stats] Error removing count:", error);
      }
    });

    this.log.info("[Following Page Stats] Removed all counts from tabs");
  }
}