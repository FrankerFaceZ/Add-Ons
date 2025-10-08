import GET_DROPS from "../../utilities/graphql/inventory/get-drops.gql";
import CLAIM_DROPS from "../../utilities/graphql/inventory/claim-drops.gql";

import { notification } from "../../utilities/notification";

const { sleep } = FrankerFaceZ.utilities.object;

export default class AutoClaimDrops {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.log = parent.log;

    this.settingKey = "addon.trubbel.inventory.drops.claim";
    this.isActive = false;
    this.checkInterval = null;
    this.lastCheck = 0;

    this.handleSettingChange = this.handleSettingChange.bind(this);
    this.startMonitoringDrops = this.startMonitoringDrops.bind(this);
    this.stopMonitoringDrops = this.stopMonitoringDrops.bind(this);
    this.checkAndClaimDrops = this.checkAndClaimDrops.bind(this);
    this.claimDrop = this.claimDrop.bind(this);
    this.calculateDropProgress = this.calculateDropProgress.bind(this);
    this.disableSettingAcrossProfiles = this.disableSettingAcrossProfiles.bind(this);
  }

  initialize() {
    const enabled = this.settings.get(this.settingKey);
    if (enabled) {
      this.startMonitoringDrops();
    } else {
      this.stopMonitoringDrops();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.log.info("[AutoClaimDrops] Enabling automatic drop claiming");
      this.startMonitoringDrops();
    } else {
      this.log.info("[AutoClaimDrops] Disabling automatic drop claiming");
      this.stopMonitoringDrops();
    }
  }

  startMonitoringDrops() {
    if (this.isActive) return;

    this.log.info("[AutoClaimDrops] Starting drops monitoring");
    this.isActive = true;

    this.checkAndClaimDrops();

    this.checkInterval = setInterval(() => {
      this.checkAndClaimDrops();
    }, 30 * 60 * 1000);
  }

  stopMonitoringDrops() {
    if (!this.isActive) return;

    this.log.info("[AutoClaimDrops] Stopping drops monitoring");
    this.isActive = false;

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  async checkAndClaimDrops() {
    if (!this.isActive) return;

    this.log.info("[AutoClaimDrops] Checking for claimable drops...");
    this.lastCheck = Date.now();

    try {
      const apollo = this.parent.resolve("site.apollo");
      if (!apollo) {
        this.log.warn("[AutoClaimDrops] Unable to load inventory data");
        return;
      }

      const inventoryResult = await apollo.client.query({
        query: GET_DROPS,
        fetchPolicy: "network-only"
      });

      this.log.info("[AutoClaimDrops] inventoryResult:", inventoryResult);

      if (!inventoryResult?.data?.currentUser) {
        this.log.warn("[AutoClaimDrops] User doesn't seem to be authenticated/logged in.");
        this.disableSettingAcrossProfiles();
        return;
      }

      const inventory = inventoryResult?.data?.currentUser?.inventory;
      this.log.info("[AutoClaimDrops] inventory:", inventory);

      if (!inventory || !inventory.dropCampaignsInProgress) {
        this.log.info("[AutoClaimDrops] No drops in progress found");
        return;
      }

      let claimedCount = 0;

      for (const campaign of inventory.dropCampaignsInProgress) {
        this.log.info(`[AutoClaimDrops] Campaign: "${campaign.name}" - Status: "${campaign.status}"`);
        if (campaign.status === "EXPIRED") {
          continue;
        }

        if (!campaign.timeBasedDrops) continue;
        for (const drop of campaign.timeBasedDrops) {

          if (!drop.self.isClaimed) {
            this.log.info(`[AutoClaimDrops] Drop Progress for "${drop?.name}": ${this.calculateDropProgress(drop)}% of ${this.formatWatchTime(drop?.requiredMinutesWatched)}`);
          }

          if (drop.self &&
            drop.self.dropInstanceID != null &&
            !drop.self.isClaimed &&
            drop.self.hasPreconditionsMet) {

            this.log.info(`[AutoClaimDrops] Found claimable drop: "${drop.name}"`);

            const claimed = await this.claimDrop(drop.self.dropInstanceID, drop.name);
            if (claimed) {
              claimedCount++;
              await sleep(3000);
            }
          }
        }
      }

      if (claimedCount > 0) {
        this.log.info(`[AutoClaimDrops] Successfully claimed ${claimedCount} drop(s)`);

        const showNotifications = this.settings.get("addon.trubbel.inventory.drops.claim.notification");
        if (showNotifications) {
          notification("🎁", `Twitch Drops claimed: ${claimedCount}`, 12000);
        }
      } else {
        this.log.info("[AutoClaimDrops] No claimable drops found");
      }

    } catch (error) {
      this.log.error("[AutoClaimDrops] Error checking drops:", error);
    }
  }

  async claimDrop(dropInstanceID, dropName) {
    try {
      const apollo = this.parent.resolve("site.apollo");
      if (!apollo) {
        this.log.warn("[AutoClaimDrops] Unable to load claim data");
        return false;
      }

      this.log.info(`[AutoClaimDrops] Attempting to claim drop: ${dropName}`);

      const result = await apollo.client.mutate({
        mutation: CLAIM_DROPS,
        variables: {
          input: {
            dropInstanceID: dropInstanceID
          }
        }
      });

      const response = result?.data?.claimDropRewards;
      this.log.info(`[AutoClaimDrops] claimDropRewards response:`, response);

      if (response?.errors && response.errors.length > 0) {
        this.log.warn(`[AutoClaimDrops] Failed to claim drop ${dropName}:`, response.errors);
        return false;
      }

      if (response?.status === "ELIGIBLE_FOR_ALL" || response?.status === "DROP_INSTANCE_ALREADY_CLAIMED") {
        this.log.info(`[AutoClaimDrops] Successfully claimed drop: ${dropName}`);
        return true;
      }

      this.log.warn(`[AutoClaimDrops] Unexpected response claiming drop ${dropName}:`, response);
      return false;

    } catch (error) {
      this.log.error(`[AutoClaimDrops] Error claiming drop ${dropName}:`, error);
      return false;
    }
  }

  calculateDropProgress(drop) {
    if (!drop?.requiredMinutesWatched || !drop?.self?.currentMinutesWatched) {
      return 0;
    }

    const percentage = Math.round((drop.self.currentMinutesWatched / drop.requiredMinutesWatched) * 100);
    return Math.min(percentage, 100);
  }

  formatWatchTime(minutes) {
    if (!minutes) return "0 minutes";

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    const hourText = hours === 1 ? `${hours} hour` : `${hours} hours`;
    const minuteText = remainingMinutes === 1 ? `${remainingMinutes} minute` : `${remainingMinutes} minutes`;

    if (hours === 0) return minuteText;
    if (remainingMinutes === 0) return hourText;
    return `${hourText} ${minuteText}`;
  }

  disableSettingAcrossProfiles() {
    const settingKey = this.settingKey;
    let profileId = 0;
    let disabledCount = 0;

    while (true) {
      try {
        const profile = this.settings.profile(profileId);

        if (profile === null) {
          break;
        }

        if (profile.has(settingKey)) {
          this.log.info(`[AutoClaimDrops] Disabling setting for profile ${profileId}`);
          profile.set(settingKey, false);
          disabledCount++;
        }

        profileId++;
      } catch (error) {
        this.log.debug(`[AutoClaimDrops] Profile ${profileId} doesn't exist or error occurred:`, error);
        break;
      }
    }

    this.log.info(`[AutoClaimDrops] Disabled setting across ${disabledCount} profile(s)`);
  }
}