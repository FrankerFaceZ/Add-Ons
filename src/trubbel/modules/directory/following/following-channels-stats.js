import { FOLLOWING_CHANNELS_SELECTOR } from "../../../utilities/constants/selectors";

import GET_USER_STATS from "../../../utilities/graphql/user-stats.gql";

export class FollowingChannelsStats {
  constructor(parent) {
    this.parent = parent;
    this.isActive = false;

    this.handleNavigation = this.handleNavigation.bind(this);
    this.enableFollowingChannels = this.enableFollowingChannels.bind(this);
    this.disableFollowingChannels = this.disableFollowingChannels.bind(this);
    this.handleSettingChange = this.handleSettingChange.bind(this);
    this.showTotalFollowedChannels = this.showTotalFollowedChannels.bind(this);
  }

  initialize() {
    const enabled = this.parent.settings.get("addon.trubbel.directory.show-stats");
    if (enabled) {
      this.handleNavigation();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.parent.log.info("[Following Page Stats] Enabling total followed channels display");
      this.handleNavigation();
    } else {
      this.parent.log.info("[Following Page Stats] Disabling total followed channels display");
      this.disableFollowingChannels();
    }
  }

  handleNavigation() {
    const currentRoute = this.parent.router?.current?.name;
    if (currentRoute === "dir-following") {
      const enabled = this.parent.settings.get("addon.trubbel.directory.show-stats");
      if (enabled && !this.isActive) {
        this.parent.log.info("[Following Page Stats] Entering following page, enabling followed channels display");
        this.enableFollowingChannels();
      }
    } else {
      if (this.isActive) {
        this.parent.log.info("[Following Page Stats] Leaving following page, disabling followed channels display");
        this.disableFollowingChannels();
      }
    }
  }

  enableFollowingChannels() {
    if (this.isActive) return;

    this.parent.log.info("[Following Page Stats] Setting up followed channels display");
    this.isActive = true;
    this.showTotalFollowedChannels();
  }

  disableFollowingChannels() {
    if (!this.isActive) return;

    this.parent.log.info("[Following Page Stats] Removing followed channels display");
    this.isActive = false;
    this.removeFollowedChannelsCount();
  }

  async showTotalFollowedChannels() {
    if (!this.isActive) return;
    this.parent.log.info("[Following Page Stats] Attempting to show stats");
    try {
      const showChannels = this.parent.settings.get("addon.trubbel.directory.show-stats-channels");
      if (!showChannels) return;

      const apollo = this.parent.resolve("site.apollo");
      if (!apollo) {
        this.parent.log.warn("[Following Page Stats] Apollo client not available");
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
        this.parent.log.warn("[Following Page Stats] No data received from query");
        return;
      }

      if (showChannels && data.follows) {
        await this.updateStatDisplay(FOLLOWING_CHANNELS_SELECTOR, data.follows.totalCount, "Channels");
      }

    } catch (error) {
      this.parent.log.error("[Following Page Stats] Error showing stats:", error);
    }
  }

  async updateStatDisplay(selector, count, statName) {
    try {
      const tabElement = await this.parent.site.awaitElement(selector, document.documentElement, 5000);
      if (tabElement) {
        if (!tabElement.textContent.includes("(")) {
          const formattedCount = this.parent.i18n.formatNumber(count);
          tabElement.textContent += ` (${formattedCount})`;
          this.parent.log.info(`[Following ${statName} Stats] Added count: ${formattedCount}`);
        } else {
          this.parent.log.info(`[Following ${statName} Stats] Count already set`);
        }
      } else {
        this.parent.log.warn(`[Following ${statName} Stats] Unable to find tab element:`, selector);
      }
    } catch (error) {
      this.parent.log.error(`[Following ${statName} Stats] Error updating display:`, error);
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
        this.parent.log.error("[Following Page Stats] Error removing count:", error);
      }
    });

    this.parent.log.info("[Following Page Stats] Removed all counts from tabs");
  }
}