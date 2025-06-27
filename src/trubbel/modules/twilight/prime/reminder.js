import { PRIME_REMINDER_KEY_CONFIG } from "../../../utilities/constants/config";

import PRIME_REMINDER from "../../../utilities/graphql/prime-reminder.gql";

const { createElement } = FrankerFaceZ.utilities.dom;

export class PrimeReminder {
  constructor(parent) {
    this.parent = parent;
    this.settingKey = "addon.trubbel.overall.subscription-yapr";
    this.isActive = false;
    this.checkInterval = null;
    this.crownElement = null;
    this.lastCheckTime = 0;
    this.renewalDate = null;
    this.primeIsAvailable = null;

    this.initialize = this.initialize.bind(this);
    this.handleSettingChange = this.handleSettingChange.bind(this);
    this.enablePrimeReminder = this.enablePrimeReminder.bind(this);
    this.disablePrimeReminder = this.disablePrimeReminder.bind(this);
    this.checkPrimeStatus = this.checkPrimeStatus.bind(this);
    this.checkStoredRenewalDate = this.checkStoredRenewalDate.bind(this);
    this.updateCheckInterval = this.updateCheckInterval.bind(this);
    this.showCrownIcon = this.showCrownIcon.bind(this);
    this.hideCrownIcon = this.hideCrownIcon.bind(this);
    this.createCrownElement = this.createCrownElement.bind(this);
    this.getStoredData = this.getStoredData.bind(this);
    this.setStoredData = this.setStoredData.bind(this);
    this.clearStoredData = this.clearStoredData.bind(this);
  }

  initialize() {
    const enabled = this.parent.settings.get(this.settingKey);
    if (enabled) {
      this.enablePrimeReminder();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.parent.log.info("[Yet Another Prime Reminder] Enabling Prime Reminder");
      this.enablePrimeReminder();
    } else {
      this.parent.log.info("[Yet Another Prime Reminder] Disabling Prime Reminder");
      this.disablePrimeReminder();
    }
  }

  enablePrimeReminder() {
    if (this.isActive) return;

    const popoutRoutes = this.parent.site.constructor.POPOUT_ROUTES;
    if (popoutRoutes.includes(this.parent.router?.current?.name)) {
      this.parent.log.info("[Yet Another Prime Reminder] Not available in popout pages");
      return;
    }

    this.parent.log.info("[Yet Another Prime Reminder] Setting up Prime Reminder");
    this.isActive = true;

    // Load stored data
    const storedData = this.getStoredData();
    const now = new Date();

    if (storedData) {
      const lastCheck = storedData.lastCheck ? new Date(storedData.lastCheck) : null;
      const timeSinceLastCheck = lastCheck ? (now - lastCheck) / (1000 * 60 * 60) : Infinity;

      if (lastCheck) {
        this.parent.log.info("[Yet Another Prime Reminder] Last check was at:", lastCheck.toLocaleString());
        this.parent.log.info(`[Yet Another Prime Reminder] Time since last check: ${timeSinceLastCheck.toFixed(1)} hours`);
      }

      if (storedData.primeIsAvailable === true) {
        // Prime was available in last check
        this.primeIsAvailable = true;

        // Check every 30 minutes when Prime is available
        const shouldCheckGraphQL = !lastCheck || timeSinceLastCheck >= 0.5;

        if (shouldCheckGraphQL) {
          this.parent.log.info("[Yet Another Prime Reminder] Checking if Prime is still available (30+ minutes since last check)");
          this.checkPrimeStatus();
        } else {
          this.parent.log.info("[Yet Another Prime Reminder] Recent check found - Prime should still be available");
          this.showCrownIcon("Your Prime is available!");
          this.updateCheckInterval();
        }
      } else if ((storedData.primeIsAvailable === false || storedData.primeIsAvailable === undefined) && storedData.renewalDate) {
        // Prime was used in last check (or old data format without primeIsAvailable field)
        this.renewalDate = new Date(storedData.renewalDate);
        this.primeIsAvailable = false;

        this.parent.log.info("[Yet Another Prime Reminder] Loaded stored renewal date:", this.renewalDate.toLocaleString());

        // Check if renewal time has passed
        if (now >= this.renewalDate) {
          this.parent.log.info("[Yet Another Prime Reminder] Renewal time has passed, Prime should be available - checking via GraphQL");
          this.checkPrimeStatus();
          return;
        }

        // Check every 6 hours when Prime is used
        const shouldCheckGraphQL = !lastCheck || timeSinceLastCheck >= 6;
        if (shouldCheckGraphQL) {
          this.parent.log.info("[Yet Another Prime Reminder] Periodic verification check (6+ hours since last check)");
          this.checkPrimeStatus();
        } else {
          this.parent.log.info("[Yet Another Prime Reminder] Recent check found - using stored renewal data");
          this.updateCheckInterval();
          this.checkStoredRenewalDate();
        }
      } else {
        // Invalid stored data, make fresh check
        this.parent.log.info("[Yet Another Prime Reminder] Invalid stored data - making fresh GraphQL call");
        this.primeIsAvailable = null;
        this.checkPrimeStatus();
      }
    } else {
      // No stored data, need initial GraphQL check
      this.parent.log.info("[Yet Another Prime Reminder] No stored data found - making initial GraphQL call");
      this.primeIsAvailable = null;
      this.checkPrimeStatus();
    }
  }

  disablePrimeReminder() {
    if (!this.isActive) return;

    this.parent.log.info("[Yet Another Prime Reminder] Removing Prime Reminder");

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    this.hideCrownIcon();
    this.clearStoredData();

    this.isActive = false;
    this.renewalDate = null;
    this.primeIsAvailable = null;

    this.parent.emit("tooltips:cleanup");
  }

  async checkPrimeStatus() {
    if (!this.isActive) return;
    try {
      this.parent.log.info("[Yet Another Prime Reminder] Checking Prime status via GraphQL...");

      const apollo = this.parent.resolve("site.apollo");
      if (!apollo) {
        this.parent.log.warn("[Yet Another Prime Reminder] Apollo client not available");
        return;
      }

      const result = await apollo.client.query({
        query: PRIME_REMINDER,
        variables: {},
        fetchPolicy: "network-only"
      });

      const data = result?.data;
      if (!data) {
        this.parent.log.warn("[Yet Another Prime Reminder] No data received from GraphQL query");
        return;
      }

      if (!data.currentUser) {
        this.parent.log.warn("[Yet Another Prime Reminder] User doesn't seem to be authenticated/logged in.");
        this.disableSettingAcrossProfiles();
        return;
      }

      // Check if user has Prime
      const hasPrime = data.currentUser?.hasPrime;
      if (!hasPrime) {
        this.parent.log.info("[Yet Another Prime Reminder] User doesn't have Prime, disabling setting across all profiles");
        this.disableSettingAcrossProfiles();

        const button = this.parent.resolve("site.menu_button");
        if (button) {
          button.addToast({
            icon: "ffz-i-attention",
            title: "Trubbel\u2019s Utilities",
            text: "**[Yet Another Prime Reminder]**\n\nYou do not have Prime.\n\n--\n\nThis feature is meant for users who have Prime only, otherwise it will disable itself automatically.",
            markdown: true,
          });
        }

        return;
      }

      this.parent.log.info("[Yet Another Prime Reminder] User has Prime");

      const canPrimeSubscribe = data.user?.self?.canPrimeSubscribe;
      const primeSubCreditBenefit = data.user?.self?.primeSubCreditBenefit;

      if (canPrimeSubscribe) {
        this.parent.log.info("[Yet Another Prime Reminder] Prime subscription is available! Showing crown icon");
        this.primeIsAvailable = true;
        this.showCrownIcon("Your Prime is available!");
        this.clearStoredData();
        this.updateCheckInterval();
      } else {
        this.parent.log.info("[Yet Another Prime Reminder] Prime subscription is not available");
        this.primeIsAvailable = false;
        this.hideCrownIcon();

        if (primeSubCreditBenefit && primeSubCreditBenefit.renewalDate) {
          const renewalDate = new Date(primeSubCreditBenefit.renewalDate);
          this.renewalDate = renewalDate;

          // Store renewal date and last check
          this.setStoredData({
            renewalDate: renewalDate.toISOString(),
            lastCheck: new Date().toISOString(),
            willRenew: primeSubCreditBenefit.willRenew
          });

          this.parent.log.info(`[Yet Another Prime Reminder] Prime will renew on: ${renewalDate.toLocaleString()}`);
          this.updateCheckInterval();
          this.checkStoredRenewalDate(); // Check if we should show countdown
        }
      }

      this.lastCheckTime = Date.now();

    } catch (error) {
      this.parent.log.error("[Yet Another Prime Reminder] Error checking Prime status:", error);
    }
  }

  checkStoredRenewalDate() {
    if (!this.isActive || !this.renewalDate) return;

    const now = new Date();

    this.parent.log.info("[Yet Another Prime Reminder] Checking stored renewal date:", this.renewalDate.toLocaleString());

    // Check if renewal time has passed
    if (now >= this.renewalDate) {
      this.parent.log.info("[Yet Another Prime Reminder] Renewal time has passed, checking Prime status via GraphQL");
      this.checkPrimeStatus(); // Prime should be available now
      return;
    }

    // Check if renewal is soon (within 3 days) and show countdown
    const daysUntilRenewal = (this.renewalDate - now) / (1000 * 60 * 60 * 24);
    this.parent.log.info(`[Yet Another Prime Reminder] Days until renewal: ${daysUntilRenewal.toFixed(2)}`);

    if (daysUntilRenewal <= 3 && daysUntilRenewal > 0) {
      const hoursUntilRenewal = (this.renewalDate - now) / (1000 * 60 * 60);
      let tooltip;
      if (hoursUntilRenewal <= 24) {
        tooltip = `Prime available in ${Math.ceil(hoursUntilRenewal)} hour${Math.ceil(hoursUntilRenewal) !== 1 ? "s" : ""}`;
      } else {
        const days = Math.ceil(hoursUntilRenewal / 24);
        tooltip = `Prime available in ${days} day${days !== 1 ? "s" : ""}`;
      }
      this.showCrownIcon(tooltip, true); // Show empty crown for upcoming renewal
      this.parent.log.info(`[Yet Another Prime Reminder] Prime renewal soon: ${tooltip}`);
    } else {
      this.parent.log.info("[Yet Another Prime Reminder] Prime renewal not within 3 days, hiding crown");
      this.hideCrownIcon();
    }
  }

  updateCheckInterval() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      this.parent.log.info("[Yet Another Prime Reminder] Cleared existing interval");
    }

    if (!this.isActive) return;

    if (this.primeIsAvailable === true) {
      // Prime is available - check every 30 minutes via GraphQL
      this.checkInterval = setInterval(() => {
        this.checkPrimeStatus();
      }, 30 * 60 * 1000);

      this.parent.log.info("[Yet Another Prime Reminder] Set 30-minute interval (Prime available)");
    } else if (this.primeIsAvailable === false) {
      // Prime is used - check every hour using stored data
      this.checkInterval = setInterval(() => {
        this.checkStoredRenewalDate();
      }, 60 * 60 * 1000);

      this.parent.log.info("[Yet Another Prime Reminder] Set 1-hour interval (Prime used)");
    } else {
      // Unknown state - default to GraphQL check every hour
      this.checkInterval = setInterval(() => {
        this.checkPrimeStatus();
      }, 60 * 60 * 1000);

      this.parent.log.info("[Yet Another Prime Reminder] Set 1-hour interval (unknown state)");
    }
  }

  showCrownIcon(tooltipText, isEmpty = false) {
    const searchContainer = document.querySelector(".top-nav__search-container");
    if (!searchContainer) {
      this.parent.log.warn("[Yet Another Prime Reminder] Search container not found");
      return;
    }

    this.hideCrownIcon();

    this.crownElement = this.createCrownElement(tooltipText, isEmpty);
    searchContainer.parentNode.insertBefore(this.crownElement, searchContainer);

    this.parent.log.info(`[Yet Another Prime Reminder] Crown icon shown: ${tooltipText}`);
  }

  hideCrownIcon() {
    if (this.crownElement && this.crownElement.parentNode) {
      this.crownElement.parentNode.removeChild(this.crownElement);
      this.crownElement = null;
      this.emit("tooltips:cleanup");
    }
  }

  createCrownElement(tooltipText, isEmpty = false) {
    return (
      <div
        className="trubbel-prime-reminder-crown ffz-il-tooltip__container"
        style={{
          display: "flex",
          alignItems: "center",
          marginLeft: "10px",
          position: "relative"
        }}
      >
        <div
          className="prime-crown-svg"
          style={{
            width: "20px",
            height: "20px",
            cursor: "pointer"
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            focusable="false"
            aria-hidden="true"
            role="presentation"
          >
            <path
              fill={isEmpty ? "#efeff1" : "#0e9bd8"}
              d={isEmpty
                ? "M13.798 10.456 10 6.657l-3.798 3.799L4 8.805V13h12V8.805l-2.202 1.65zM18 5v8a2 2 0 0 1-2 2H4a2.002 2.002 0 0 1-2-2V5l4 3 4-4 4 4 4-3z"
                : "M2 5l4 3 4-4 4 4 4-3v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5z"
              }
            />
          </svg>
        </div>
        <div className="ffz-il-tooltip ffz-il-tooltip--down ffz-il-tooltip--align-center tw-mg-t-1">
          {tooltipText}
        </div>
      </div>
    );
  }

  getStoredData() {
    try {
      const data = this.parent.settings.provider.get(PRIME_REMINDER_KEY_CONFIG);
      return data ? data : null;
    } catch (error) {
      this.parent.log.error("[Yet Another Prime Reminder] Error reading stored data:", error);
      return null;
    }
  }

  setStoredData(data) {
    try {
      this.parent.settings.provider.set(PRIME_REMINDER_KEY_CONFIG, data);
      this.parent.log.debug("[Yet Another Prime Reminder] Data stored:", data);
    } catch (error) {
      this.parent.log.error("[Yet Another Prime Reminder] Error storing data:", error);
    }
  }

  clearStoredData() {
    try {
      this.parent.settings.provider.delete(PRIME_REMINDER_KEY_CONFIG);
      this.parent.log.debug("[Yet Another Prime Reminder] Stored data cleared");
    } catch (error) {
      this.parent.log.error("[Yet Another Prime Reminder] Error clearing stored data:", error);
    }
  }

  // Disable the setting across all FFZ profiles
  disableSettingAcrossProfiles() {
    const settingKey = this.settingKey;
    let profileId = 0;
    let disabledCount = 0;

    while (true) {
      try {
        const profile = this.parent.settings.profile(profileId);

        // If profile doesn't exist, break the loop
        if (profile === null) {
          break;
        }

        // Check if this profile has the setting enabled
        if (profile.has(settingKey)) {
          this.parent.log.info(`[Yet Another Prime Reminder] Disabling setting for profile ${profileId}`);
          profile.set(settingKey, false);
          disabledCount++;
        }

        profileId++;
      } catch (error) {
        // If we get an error (like profile doesn't exist), break the loop
        this.parent.log.debug(`[Yet Another Prime Reminder] Profile ${profileId} doesn't exist or error occurred:`, error);
        break;
      }
    }

    this.parent.log.info(`[Yet Another Prime Reminder] Disabled setting across ${disabledCount} profile(s)`);
  }
}