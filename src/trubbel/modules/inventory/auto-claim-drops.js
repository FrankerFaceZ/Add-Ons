import GET_DROPS from "../../utilities/graphql/inventory/get-drops.gql";
import CLAIM_DROPS from "../../utilities/graphql/inventory/claim-drops.gql";

import { notification } from "../../utilities/notification";

const { sleep } = FrankerFaceZ.utilities.object;

export class AutoClaimDrops {
  constructor(parent) {
    this.parent = parent;
    this.isActive = false;
    this.checkInterval = null;
    this.lastCheck = 0;

    this.handleSettingChange = this.handleSettingChange.bind(this);
    this.startDropsMonitoring = this.startDropsMonitoring.bind(this);
    this.stopDropsMonitoring = this.stopDropsMonitoring.bind(this);
    this.checkAndClaimDrops = this.checkAndClaimDrops.bind(this);
    this.claimDrop = this.claimDrop.bind(this);
  }

  initialize() {
    const enabled = this.parent.settings.get("addon.trubbel.inventory.auto-claim");
    if (enabled) {
      this.startDropsMonitoring();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.parent.log.info("[AutoClaimDrops] Enabling automatic drop claiming");
      this.startDropsMonitoring();
    } else {
      this.parent.log.info("[AutoClaimDrops] Disabling automatic drop claiming");
      this.stopDropsMonitoring();
    }
  }

  startDropsMonitoring() {
    if (this.isActive) return;

    this.parent.log.info("[AutoClaimDrops] Starting drops monitoring");
    this.isActive = true;

    this.checkAndClaimDrops();

    this.checkInterval = setInterval(() => {
      this.checkAndClaimDrops();
    }, 30 * 60 * 1000);
  }

  stopDropsMonitoring() {
    if (!this.isActive) return;

    this.parent.log.info("[AutoClaimDrops] Stopping drops monitoring");
    this.isActive = false;

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  async checkAndClaimDrops() {
    if (!this.isActive) return;

    this.parent.log.info("[AutoClaimDrops] Checking for claimable drops...");
    this.lastCheck = Date.now();

    try {
      const apollo = this.parent.resolve("site.apollo");
      if (!apollo) {
        this.parent.log.info("[AutoClaimDrops] Unable to load inventory data");
        return;
      }

      const inventoryResult = await apollo.client.query({
        query: GET_DROPS,
        fetchPolicy: "network-only"
      });

      this.parent.log.info("[AutoClaimDrops] inventoryResult:", inventoryResult);

      const inventory = inventoryResult?.data?.currentUser?.inventory;
      this.parent.log.info("[AutoClaimDrops] inventory:", inventory);
      if (!inventory || !inventory.dropCampaignsInProgress) {
        this.parent.log.info("[AutoClaimDrops] No drops in progress found");
        return;
      }

      let claimedCount = 0;

      // Check each campaign for claimable drops - drops in progress found
      for (const campaign of inventory.dropCampaignsInProgress) {
        this.parent.log.info(`[AutoClaimDrops] Campaign: "${campaign.name}" - Status: "${campaign.status}"`);
        if (campaign.status === "EXPIRED") {
          continue;
        }

        if (!campaign.timeBasedDrops) continue;
        for (const drop of campaign.timeBasedDrops) {

          // Current drop progress
          if (!drop.self.isClaimed) {
            const minutesToHours = (minutes) => {
              const hours = Math.floor(minutes / 60);
              const remainingMinutes = minutes % 60;

              const hourText = hours === 1 ? `${hours} hour` : `${hours} hours`;
              const minuteText = remainingMinutes === 1 ? `${remainingMinutes} minute` : `${remainingMinutes} minutes`;

              if (hours === 0) return minuteText;
              if (remainingMinutes === 0) return hourText;
              return `${hourText} ${minuteText}`;
            };

            this.parent.log.info(`[AutoClaimDrops] Drop Progress for "${drop?.name}": ${this.calculateDropProgress(drop)}% of ${minutesToHours(drop?.requiredMinutesWatched)}`);
          }

          if (drop.self &&
            drop.self.dropInstanceID != null &&
            !drop.self.isClaimed &&
            drop.self.hasPreconditionsMet) {

            this.parent.log.info(`[AutoClaimDrops] Found claimable drop: "${drop.name}"`);

            const claimed = await this.claimDrop(drop.self.dropInstanceID, drop.name);
            if (claimed) {
              claimedCount++;
              // Small delay between claims
              await sleep(3000);
            }
          }
        }
      }

      if (claimedCount > 0) {
        this.parent.log.info(`[AutoClaimDrops] Successfully claimed ${claimedCount} drop(s)`);

        const showNotifications = this.parent.settings.get("addon.trubbel.inventory.auto-claim-notification");
        if (showNotifications) {
          notification("🎁", `Twitch Drops claimed: ${claimedCount}`, 12000);
        }
      } else {
        this.parent.log.info("[AutoClaimDrops] No claimable drops found");
      }

    } catch (error) {
      this.parent.log.info("[AutoClaimDrops] Error checking drops:", error);
    }
  }

  async claimDrop(dropInstanceID, dropName) {
    try {
      const apollo = this.parent.resolve("site.apollo");
      if (!apollo) {
        this.parent.log.info("[AutoClaimDrops] Unable to load claim data");
        return false;
      }

      this.parent.log.info(`[AutoClaimDrops] Attempting to claim drop: ${dropName}`);

      const result = await apollo.client.mutate({
        mutation: CLAIM_DROPS,
        variables: {
          input: {
            dropInstanceID: dropInstanceID
          }
        }
      });

      const response = result?.data?.claimDropRewards;
      this.parent.log.info(`[AutoClaimDrops] claimDropRewards response:`, response);

      if (response?.errors && response.errors.length > 0) {
        this.parent.log.info(`[AutoClaimDrops] Failed to claim drop ${dropName}:`, response.errors);
        return false;
      }

      if (response?.status === "ELIGIBLE_FOR_ALL" || response?.status === "DROP_INSTANCE_ALREADY_CLAIMED") {
        this.parent.log.info(`[AutoClaimDrops] Successfully claimed drop: ${dropName}`);
        return true;
      }

      this.parent.log.info(`[AutoClaimDrops] Unexpected response claiming drop ${dropName}:`, response);
      return false;

    } catch (error) {
      this.parent.log.info(`[AutoClaimDrops] Error claiming drop ${dropName}:`, error);
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
}