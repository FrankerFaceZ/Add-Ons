import { PRIME_REMINDER_KEY_CONFIG } from "../../../utilities/constants/config";

import PRIME_REMINDER from "../../../utilities/graphql/prime-reminder.gql";

const { createElement } = FrankerFaceZ.utilities.dom;

export class PrimeReminder {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.router = parent.router;
    this.site = parent.site;
    this.log = parent.log;

    this.settingKey = "addon.trubbel.twilight.prime.yapr";
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
    this.isValidRenewalDate = this.isValidRenewalDate.bind(this);
  }

  initialize() {
    const enabled = this.settings.get(this.settingKey);
    if (enabled) {
      this.enablePrimeReminder();
    } else {
      this.disablePrimeReminder();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.log.info("[Yet Another Prime Reminder] Enabling Prime Reminder");
      this.enablePrimeReminder();
    } else {
      this.log.info("[Yet Another Prime Reminder] Disabling Prime Reminder");
      this.disablePrimeReminder();
    }
  }

  isValidRenewalDate(dateString) {
    if (!dateString) return false;

    const date = new Date(dateString);

    if (isNaN(date.getTime())) return false;

    const epochStart = new Date('1970-01-01T00:00:00Z');
    if (Math.abs(date.getTime() - epochStart.getTime()) < 1000) {
      this.log.info("[Yet Another Prime Reminder] Received Unix epoch as renewal date - treating as invalid");
      return false;
    }

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    if (date < oneYearAgo) {
      this.log.info("[Yet Another Prime Reminder] Renewal date is more than 1 year in the past - treating as invalid");
      return false;
    }
    return true;
  }

  enablePrimeReminder() {
    if (this.isActive) return;

    const popoutRoutes = this.site.constructor.POPOUT_ROUTES;
    if (popoutRoutes.includes(this.router?.current?.name)) {
      this.log.info("[Yet Another Prime Reminder] Not available in popout pages");
      return;
    }

    this.log.info("[Yet Another Prime Reminder] Setting up Prime Reminder");
    this.isActive = true;

    const storedData = this.getStoredData();
    const now = new Date();

    if (storedData) {
      const lastCheck = storedData.lastCheck ? new Date(storedData.lastCheck) : null;
      const timeSinceLastCheck = lastCheck ? (now - lastCheck) / (1000 * 60 * 60) : Infinity;

      if (lastCheck) {
        this.log.info("[Yet Another Prime Reminder] Last check was at:", lastCheck.toLocaleString());
        this.log.info(`[Yet Another Prime Reminder] Time since last check: ${timeSinceLastCheck.toFixed(1)} hours`);
      }

      if (storedData.primeIsAvailable === true) {
        this.primeIsAvailable = true;

        const shouldCheckGraphQL = !lastCheck || timeSinceLastCheck >= 0.5;
        if (shouldCheckGraphQL) {
          this.log.info("[Yet Another Prime Reminder] Checking if Prime is still available (30+ minutes since last check)");
          this.checkPrimeStatus();
        } else {
          this.log.info("[Yet Another Prime Reminder] Recent check found - Prime should still be available");
          this.showCrownIcon("Your Prime is available!");
          this.updateCheckInterval();
        }
      } else if ((storedData.primeIsAvailable === false || storedData.primeIsAvailable === undefined) && storedData.renewalDate) {

        if (!this.isValidRenewalDate(storedData.renewalDate)) {
          this.log.info("[Yet Another Prime Reminder] Stored renewal date is invalid - making fresh GraphQL call");
          this.primeIsAvailable = null;
          this.checkPrimeStatus();
          return;
        }

        this.renewalDate = new Date(storedData.renewalDate);
        this.primeIsAvailable = false;

        this.log.info("[Yet Another Prime Reminder] Loaded stored renewal date:", this.renewalDate.toLocaleString());

        if (now >= this.renewalDate) {
          this.log.info("[Yet Another Prime Reminder] Renewal time has passed, Prime should be available - checking via GraphQL");
          this.checkPrimeStatus();
          return;
        }

        const shouldCheckGraphQL = !lastCheck || timeSinceLastCheck >= 6;
        if (shouldCheckGraphQL) {
          this.log.info("[Yet Another Prime Reminder] Periodic verification check (6+ hours since last check)");
          this.checkPrimeStatus();
        } else {
          this.log.info("[Yet Another Prime Reminder] Recent check found - using stored renewal data");
          this.updateCheckInterval();
          this.checkStoredRenewalDate();
        }
      } else {
        this.log.info("[Yet Another Prime Reminder] Invalid stored data - making fresh GraphQL call");
        this.primeIsAvailable = null;
        this.checkPrimeStatus();
      }
    } else {
      this.log.info("[Yet Another Prime Reminder] No stored data found - making initial GraphQL call");
      this.primeIsAvailable = null;
      this.checkPrimeStatus();
    }
  }

  disablePrimeReminder() {
    if (!this.isActive) return;

    this.log.info("[Yet Another Prime Reminder] Removing Prime Reminder");

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
      this.log.info("[Yet Another Prime Reminder] Checking Prime status via GraphQL...");

      const apollo = this.parent.resolve("site.apollo");
      if (!apollo) {
        this.log.warn("[Yet Another Prime Reminder] Apollo client not available");
        return;
      }

      const result = await apollo.client.query({
        query: PRIME_REMINDER,
        variables: {},
        fetchPolicy: "network-only"
      });

      const data = result?.data;
      this.log.info("[Yet Another Prime Reminder] Prime data:", data);
      if (!data) {
        this.log.warn("[Yet Another Prime Reminder] No data received from GraphQL query");
        return;
      }

      if (!data.currentUser) {
        this.log.warn("[Yet Another Prime Reminder] User doesn't seem to be authenticated/logged in.");
        this.disableSettingAcrossProfiles();
        return;
      }

      const hasPrime = data.currentUser?.hasPrime;
      if (!hasPrime) {
        this.log.info("[Yet Another Prime Reminder] User doesn't have Prime, disabling setting across all profiles");
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

      this.log.info("[Yet Another Prime Reminder] User has Prime");

      const canPrimeSubscribe = data.user?.self?.canPrimeSubscribe;
      const primeSubCreditBenefit = data.user?.self?.primeSubCreditBenefit;

      if (canPrimeSubscribe) {
        this.log.info("[Yet Another Prime Reminder] Prime subscription is available! Showing crown icon");
        this.primeIsAvailable = true;
        this.showCrownIcon("Your Prime is available!");

        this.setStoredData({
          primeIsAvailable: true,
          lastCheck: new Date().toISOString(),
          renewalDate: null,
          willRenew: primeSubCreditBenefit?.willRenew || false
        });

        this.updateCheckInterval();
      } else {
        this.log.info("[Yet Another Prime Reminder] Prime subscription is not available");
        this.primeIsAvailable = false;
        this.hideCrownIcon();

        if (primeSubCreditBenefit && primeSubCreditBenefit.renewalDate && this.isValidRenewalDate(primeSubCreditBenefit.renewalDate)) {
          const renewalDate = new Date(primeSubCreditBenefit.renewalDate);
          this.renewalDate = renewalDate;

          this.setStoredData({
            renewalDate: renewalDate.toISOString(),
            lastCheck: new Date().toISOString(),
            primeIsAvailable: false,
            willRenew: primeSubCreditBenefit.willRenew
          });

          this.log.info(`[Yet Another Prime Reminder] Prime will renew on: ${renewalDate.toLocaleString()}`);
          this.updateCheckInterval();
          this.checkStoredRenewalDate();
        } else {
          this.log.info("[Yet Another Prime Reminder] No valid renewal date available - setting up periodic check");
          this.setStoredData({
            primeIsAvailable: false,
            lastCheck: new Date().toISOString(),
            willRenew: primeSubCreditBenefit?.willRenew || false,
            renewalDate: null
          });
          this.updateCheckInterval();
        }
      }

      this.lastCheckTime = Date.now();

    } catch (error) {
      this.log.error("[Yet Another Prime Reminder] Error checking Prime status:", error);
    }
  }

  checkStoredRenewalDate() {
    if (!this.isActive || !this.renewalDate) return;

    const now = new Date();

    this.log.info("[Yet Another Prime Reminder] Checking stored renewal date:", this.renewalDate.toLocaleString());

    if (now >= this.renewalDate) {
      this.log.info("[Yet Another Prime Reminder] Renewal time has passed, checking Prime status via GraphQL");
      this.checkPrimeStatus();
      return;
    }

    const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const renewalDateOnly = new Date(this.renewalDate.getFullYear(), this.renewalDate.getMonth(), this.renewalDate.getDate());
    const daysUntilRenewal = Math.ceil((renewalDateOnly - nowDate) / (1000 * 60 * 60 * 24));

    this.log.info(`[Yet Another Prime Reminder] Days until renewal: ${daysUntilRenewal}`);

    if (daysUntilRenewal <= 3 && daysUntilRenewal > 0) {
      let tooltip;
      if (daysUntilRenewal === 1) {
        const hoursUntilRenewal = (this.renewalDate - now) / (1000 * 60 * 60);
        if (hoursUntilRenewal <= 24) {
          tooltip = `Prime available in ${Math.ceil(hoursUntilRenewal)} hour${Math.ceil(hoursUntilRenewal) !== 1 ? "s" : ""}`;
        } else {
          tooltip = `Prime available in 1 day`;
        }
      } else {
        tooltip = `Prime available in ${daysUntilRenewal} day${daysUntilRenewal !== 1 ? "s" : ""}`;
      }
      this.showCrownIcon(tooltip, true);
      this.log.info(`[Yet Another Prime Reminder] Prime renewal soon: ${tooltip}`);
    } else {
      this.log.info("[Yet Another Prime Reminder] Prime renewal not within 3 days, hiding crown");
      this.hideCrownIcon();
    }
  }

  updateCheckInterval() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      this.log.info("[Yet Another Prime Reminder] Cleared existing interval");
    }

    if (!this.isActive) return;

    if (this.primeIsAvailable === true) {
      this.checkInterval = setInterval(() => {
        this.checkPrimeStatus();
      }, 30 * 60 * 1000);

      this.log.info("[Yet Another Prime Reminder] Set 30-minute interval (Prime available)");
    } else if (this.primeIsAvailable === false) {
      this.checkInterval = setInterval(() => {
        this.checkStoredRenewalDate();
      }, 60 * 60 * 1000);

      this.log.info("[Yet Another Prime Reminder] Set 1-hour interval (Prime used)");
    } else {
      this.checkInterval = setInterval(() => {
        this.checkPrimeStatus();
      }, 60 * 60 * 1000);

      this.log.info("[Yet Another Prime Reminder] Set 1-hour interval (unknown state)");
    }
  }

  showCrownIcon(tooltipText, isEmpty = false) {
    const searchContainer = document.querySelector(".top-nav__search-container");
    if (!searchContainer) {
      this.log.warn("[Yet Another Prime Reminder] Search container not found");
      return;
    }

    this.hideCrownIcon();

    this.crownElement = this.createCrownElement(tooltipText, isEmpty);
    searchContainer.parentNode.insertBefore(this.crownElement, searchContainer);

    this.log.info(`[Yet Another Prime Reminder] Crown icon shown: ${tooltipText}`);
  }

  hideCrownIcon() {
    if (this.crownElement && this.crownElement.parentNode) {
      this.crownElement.parentNode.removeChild(this.crownElement);
      this.crownElement = null;
      this.parent.emit("tooltips:cleanup");
    }
  }

  createCrownElement(tooltipText, isEmpty = false) {
    return (
      <div style={{
        flexGrow: 0,
        flexShrink: 0,
        marginInline: "4px",
        alignSelf: "center",
        flexWrap: "nowrap"
      }}>
        <div style={{
          display: "flex",
          justifyContent: "center"
        }}>
          <div style={{
            display: "inline-flex"
          }}>
            <button
              className="ffz-il-tooltip__container"
              style={{
                display: "inline-flex",
                position: "relative",
                alignItems: "center",
                justifyContent: "center",
                verticalAlign: "middle",
                overflow: "visible",
                textDecoration: "none",
                whiteSpace: "nowrap",
                userSelect: "none",
                fontWeight: "var(--font-weight-semibold, 600)",
                fontSize: "var(--button-text-default, 13px)",
                height: "var(--button-size-default, 30px)",
                width: "var(--button-size-default, 30px)",
                borderRadius: this.settings.get("addon.trubbel.appearance.tweaks.form_control.border-radius") ? "0.4rem" : "var(--border-radius-rounded)",
                backgroundColor: "var(--color-background-button-text-default, #f7f7f8)",
                color: "var(--color-fill-button-icon, #53535f)",
                border: "none",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => Object.assign(e.target.style, {
                backgroundColor: "var(--color-background-button-text-hover, #e5e5e8)",
                color: "var(--color-fill-button-icon-hover, #000)"
              })}
              onMouseLeave={(e) => Object.assign(e.target.style, {
                backgroundColor: "var(--color-background-button-text-default, #f7f7f8)",
                color: "var(--color-fill-button-icon, #53535f)"
              })}
              onClick={() => {
                this.router.navigate("user", { userName: "subscriptions" });
              }}
              aria-expanded="false"
              aria-label="Prime Reminder"
              data-a-target="prime-reminder-button"
            >
              <div style={{
                pointerEvents: "none",
                width: "var(--button-icon-size-default, 20px)",
                height: "var(--button-icon-size-default, 20px)"
              }}>
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  width: "2rem",
                  height: "2rem",
                  fill: isEmpty ? "var(--color-fill-current, currentColor)" : "#0e9bd8"
                }}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                    role="presentation"
                    style={{
                      height: "2rem",
                      width: "2rem"
                    }}
                  >
                    <path fillRule="evenodd"
                      d={isEmpty
                        ? "M13.798 10.456 10 6.657l-3.798 3.799L4 8.805V13h12V8.805l-2.202 1.65zM18 5v8a2 2 0 0 1-2 2H4a2.002 2.002 0 0 1-2-2V5l4 3 4-4 4 4 4-3z"
                        : "M2 5l4 3 4-4 4 4 4-3v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5z"
                      }
                      clipRule="evenodd">
                    </path>
                  </svg>
                </div>
              </div>
              <div className="ffz-il-tooltip ffz-il-tooltip--down ffz-il-tooltip--align-center tw-mg-t-1">
                {tooltipText}
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  getStoredData() {
    try {
      const data = this.settings.provider.get(PRIME_REMINDER_KEY_CONFIG);
      return data ? data : null;
    } catch (error) {
      this.log.error("[Yet Another Prime Reminder] Error reading stored data:", error);
      return null;
    }
  }

  setStoredData(data) {
    try {
      this.settings.provider.set(PRIME_REMINDER_KEY_CONFIG, data);
      this.log.debug("[Yet Another Prime Reminder] Data stored:", data);
    } catch (error) {
      this.log.error("[Yet Another Prime Reminder] Error storing data:", error);
    }
  }

  clearStoredData() {
    try {
      this.settings.provider.delete(PRIME_REMINDER_KEY_CONFIG);
      this.log.debug("[Yet Another Prime Reminder] Stored data cleared");
    } catch (error) {
      this.log.error("[Yet Another Prime Reminder] Error clearing stored data:", error);
    }
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
          this.log.info(`[Yet Another Prime Reminder] Disabling setting for profile ${profileId}`);
          profile.set(settingKey, false);
          disabledCount++;
        }

        profileId++;
      } catch (error) {
        this.log.debug(`[Yet Another Prime Reminder] Profile ${profileId} doesn't exist or error occurred:`, error);
        break;
      }
    }

    this.log.info(`[Yet Another Prime Reminder] Disabled setting across ${disabledCount} profile(s)`);
  }
}