import { PRIME_REMINDER_KEY_CONFIG } from "../../../utilities/constants/config";
import PRIME_REMINDER from "../../../utilities/graphql/prime-reminder.gql";

const { createElement } = FrankerFaceZ.utilities.dom;
const { sleep } = FrankerFaceZ.utilities.object;

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
    this.primeStatus = null;
    this.renewalDate = null;
  }

  initialize() {
    const enabled = this.settings.get(this.settingKey);
    if (enabled) {
      this.enable();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.log.info("[YetAnotherPrimeReminder] Enabling Prime Reminder");
      this.enable();
    } else {
      this.log.info("[YetAnotherPrimeReminder] Disabling Prime Reminder");
      this.disable();
    }
  }

  enable() {
    if (this.isActive) return;

    const popoutRoutes = this.site.constructor.POPOUT_ROUTES;
    if (popoutRoutes.includes(this.router?.current?.name)) {
      this.log.info("[YetAnotherPrimeReminder] Not available in popout pages");
      return;
    }

    this.log.info("[YetAnotherPrimeReminder] Setting up Prime Reminder");
    this.isActive = true;

    const storedData = this.getStoredData();
    const now = Date.now();

    if (!storedData) {
      this.log.info("[YetAnotherPrimeReminder] No stored data - making initial check");
      this.checkPrimeStatus();
      return;
    }

    const lastCheck = storedData.lastCheck ? new Date(storedData.lastCheck).getTime() : 0;
    const timeSinceLastCheck = (now - lastCheck) / (1000 * 60 * 60);

    if (lastCheck) {
      this.log.info(`[YetAnotherPrimeReminder] Last check: ${timeSinceLastCheck.toFixed(1)} hours ago`);
    }

    if (storedData.primeIsAvailable === true) {
      this.primeStatus = true;

      if (timeSinceLastCheck >= 0.5) {
        this.log.info("[YetAnotherPrimeReminder] Verifying Prime is still available");
        this.checkPrimeStatus();
      } else {
        this.log.info("[YetAnotherPrimeReminder] Prime should still be available");
        this.showCrownIcon("Your Prime is available!");
        this.scheduleNextCheck();
      }
      return;
    }

    if (storedData.renewalDate && this.isValidRenewalDate(storedData.renewalDate)) {
      this.primeStatus = false;
      this.renewalDate = new Date(storedData.renewalDate);

      this.log.info("[YetAnotherPrimeReminder] Loaded renewal date:", this.renewalDate.toLocaleString());

      if (now >= this.renewalDate.getTime()) {
        this.log.info("[YetAnotherPrimeReminder] Renewal time passed - checking status");
        this.checkPrimeStatus();
        return;
      }

      if (timeSinceLastCheck >= 6) {
        this.log.info("[YetAnotherPrimeReminder] Periodic verification (6+ hours)");
        this.checkPrimeStatus();
      } else {
        this.log.info("[YetAnotherPrimeReminder] Using stored renewal data");
        this.checkRenewalProximity();
        this.scheduleNextCheck();
      }
      return;
    }

    this.log.info("[YetAnotherPrimeReminder] Invalid stored data - rechecking");
    this.checkPrimeStatus();
  }

  disable() {
    if (!this.isActive) return;

    this.log.info("[YetAnotherPrimeReminder] Disabling Prime Reminder");

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    this.hideCrownIcon();
    this.clearStoredData();

    this.isActive = false;
    this.primeStatus = null;
    this.renewalDate = null;

    this.parent.emit("tooltips:cleanup");
  }

  async checkPrimeStatus() {
    if (!this.isActive) return;

    try {
      this.log.info("[YetAnotherPrimeReminder] Checking Prime status via GraphQL");

      const apollo = this.parent.resolve("site.apollo");
      if (!apollo) {
        this.log.warn("[YetAnotherPrimeReminder] Apollo client not available");
        return;
      }

      const result = await apollo.client.query({
        query: PRIME_REMINDER,
        fetchPolicy: "network-only"
      });

      const data = result?.data;
      this.log.info("[YetAnotherPrimeReminder] Prime data:", data);

      if (!data) {
        this.log.warn("[YetAnotherPrimeReminder] No data received");
        return;
      }

      if (!data.currentUser) {
        this.log.warn("[YetAnotherPrimeReminder] User not authenticated");
        this.disableSettingAcrossProfiles();
        return;
      }

      if (!data.currentUser.hasPrime) {
        this.log.info("[YetAnotherPrimeReminder] User doesn't have Prime");
        this.disableSettingAcrossProfiles();
        this.showNoPrimeNotification();
        return;
      }

      this.log.info("[YetAnotherPrimeReminder] User has Prime");

      const canPrimeSubscribe = data.user?.self?.canPrimeSubscribe;
      const primeSubCreditBenefit = data.user?.self?.primeSubCreditBenefit;

      if (canPrimeSubscribe) {
        this.log.info("[YetAnotherPrimeReminder] Prime available - showing full crown");
        this.primeStatus = true;
        this.renewalDate = null;

        this.showCrownIcon("Your Prime is available!");

        this.setStoredData({
          primeIsAvailable: true,
          lastCheck: new Date().toISOString(),
          renewalDate: null,
          willRenew: primeSubCreditBenefit?.willRenew || false
        });

        this.scheduleNextCheck();
      } else {
        this.log.info("[YetAnotherPrimeReminder] Prime not available (already used)");
        this.primeStatus = false;

        this.hideCrownIcon();

        if (primeSubCreditBenefit?.renewalDate && this.isValidRenewalDate(primeSubCreditBenefit.renewalDate)) {
          const renewalDate = new Date(primeSubCreditBenefit.renewalDate);
          this.renewalDate = renewalDate;

          this.setStoredData({
            renewalDate: renewalDate.toISOString(),
            lastCheck: new Date().toISOString(),
            primeIsAvailable: false,
            willRenew: primeSubCreditBenefit.willRenew
          });

          this.log.info(`[YetAnotherPrimeReminder] Renewal date: ${renewalDate.toLocaleString()}`);
          this.checkRenewalProximity();
          this.scheduleNextCheck();
        } else {
          this.log.info("[YetAnotherPrimeReminder] No valid renewal date - periodic checks");

          this.setStoredData({
            primeIsAvailable: false,
            lastCheck: new Date().toISOString(),
            willRenew: primeSubCreditBenefit?.willRenew || false,
            renewalDate: null
          });

          this.scheduleNextCheck();
        }
      }

    } catch (error) {
      this.log.error("[YetAnotherPrimeReminder] Error checking Prime status:", error);
    }
  }

  checkRenewalProximity() {
    if (!this.isActive || !this.renewalDate) return;

    const now = new Date();

    this.log.info("[YetAnotherPrimeReminder] Checking renewal proximity:", this.renewalDate.toLocaleString());

    if (now >= this.renewalDate) {
      this.log.info("[YetAnotherPrimeReminder] Renewal time passed - checking via GraphQL");
      this.checkPrimeStatus();
      return;
    }

    const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const renewalDateOnly = new Date(
      this.renewalDate.getFullYear(),
      this.renewalDate.getMonth(),
      this.renewalDate.getDate()
    );
    const daysUntilRenewal = Math.ceil((renewalDateOnly - nowDate) / (1000 * 60 * 60 * 24));

    this.log.info(`[YetAnotherPrimeReminder] Days until renewal: ${daysUntilRenewal}`);

    if (daysUntilRenewal >= 0 && daysUntilRenewal <= 3) {
      let tooltip;

      if (daysUntilRenewal <= 1) {
        const hoursUntilRenewal = (this.renewalDate - now) / (1000 * 60 * 60);
        if (hoursUntilRenewal <= 24) {
          const hours = Math.ceil(hoursUntilRenewal);
          tooltip = `Prime available in ${hours} hour${hours !== 1 ? "s" : ""}`;
        } else {
          tooltip = "Prime available in 1 day";
        }
      } else {
        tooltip = `Prime available in ${daysUntilRenewal} day${daysUntilRenewal !== 1 ? "s" : ""}`;
      }

      this.showCrownIcon(tooltip, true);
      this.log.info(`[YetAnotherPrimeReminder] Showing hollow crown: ${tooltip}`);
    } else {
      this.log.info("[YetAnotherPrimeReminder] Not within 3 days - hiding crown");
      this.hideCrownIcon();
    }
  }

  scheduleNextCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    if (!this.isActive) return;

    let interval;
    let description;

    if (this.primeStatus === true) {
      interval = 30 * 60 * 1000;
      description = "30-minute interval (Prime available)";
    } else if (this.primeStatus === false) {
      interval = 60 * 60 * 1000;
      description = "1-hour interval (Prime used, checking renewal)";
    } else {
      interval = 60 * 60 * 1000;
      description = "1-hour interval (unknown state)";
    }

    this.checkInterval = setInterval(() => {
      if (this.primeStatus === true) {
        this.checkPrimeStatus();
      } else {
        this.checkRenewalProximity();
      }
    }, interval);

    this.log.info(`[YetAnotherPrimeReminder] Scheduled: ${description}`);
  }

  isValidRenewalDate(dateString) {
    if (!dateString) return false;

    const date = new Date(dateString);

    if (isNaN(date.getTime())) return false;

    const epochStart = new Date("1970-01-01T00:00:00Z");
    if (Math.abs(date.getTime() - epochStart.getTime()) < 1000) {
      this.log.info("[YetAnotherPrimeReminder] Received Unix epoch - invalid");
      return false;
    }

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    if (date < oneYearAgo) {
      this.log.info("[YetAnotherPrimeReminder] Date >1 year old - invalid");
      return false;
    }

    return true;
  }

  showCrownIcon(tooltipText, isEmpty = false) {
    const searchContainer = document.querySelector(".top-nav__search-container");
    if (!searchContainer) {
      this.log.warn("[YetAnotherPrimeReminder] Search container not found");
      return;
    }

    this.hideCrownIcon();

    this.crownElement = this.createCrownElement(tooltipText, isEmpty);
    searchContainer.parentNode.insertBefore(this.crownElement, searchContainer);

    this.log.info(`[YetAnotherPrimeReminder] Crown shown: ${tooltipText}`);
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
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div style={{ display: "inline-flex" }}>
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
                borderRadius: "var(--border-radius-rounded)",
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
              onClick={() => this.router.navigate("user", { userName: "subscriptions" })}
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
                  fill: isEmpty ? "var(--color-fill-current, currentColor)" : "#0096d6"
                }}>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    role="presentation"
                    style={{ height: "2rem", width: "2rem" }}
                  >
                    <path
                      fillRule="evenodd"
                      d={isEmpty
                        ? "M16.852 12.68 12 7.828 7.148 12.68 4 10.161V17h16v-6.839l-3.148 2.519ZM22 6v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6l5 4 5-5 5 5 5-4Z"
                        : "M2 17V6l5 4 5-5 5 5 5-4v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2Z"
                      }
                      clipRule="evenodd"
                    />
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
      return data || null;
    } catch (error) {
      this.log.error("[YetAnotherPrimeReminder] Error reading stored data:", error);
      return null;
    }
  }

  setStoredData(data) {
    try {
      this.settings.provider.set(PRIME_REMINDER_KEY_CONFIG, data);
      this.log.debug("[YetAnotherPrimeReminder] Data stored:", data);
    } catch (error) {
      this.log.error("[YetAnotherPrimeReminder] Error storing data:", error);
    }
  }

  clearStoredData() {
    try {
      this.settings.provider.delete(PRIME_REMINDER_KEY_CONFIG);
      this.log.debug("[YetAnotherPrimeReminder] Stored data cleared");
    } catch (error) {
      this.log.error("[YetAnotherPrimeReminder] Error clearing stored data:", error);
    }
  }

  showNoPrimeNotification() {
    const button = this.parent.resolve("site.menu_button");
    if (button) {
      button.addToast({
        icon: "ffz-i-attention",
        title: "Trubbel\u2019s Utilities",
        text: "**[YetAnotherPrimeReminder]**\n\nYou do not have Prime.\n\n--\n\nThis feature is meant for users who have Prime only, otherwise it will disable itself automatically.",
        markdown: true,
      });
    }
  }

  disableSettingAcrossProfiles() {
    const settingKey = this.settingKey;
    let profileId = 0;
    let disabledCount = 0;

    while (true) {
      try {
        const profile = this.settings.profile(profileId);
        if (profile === null) break;

        if (profile.has(settingKey)) {
          this.log.info(`[YetAnotherPrimeReminder] Disabling setting for profile ${profileId}`);
          profile.set(settingKey, false);
          disabledCount++;
        }

        profileId++;
      } catch (error) {
        this.log.debug(`[YetAnotherPrimeReminder] Profile ${profileId} error:`, error);
        break;
      }
    }

    this.log.info(`[YetAnotherPrimeReminder] Disabled across ${disabledCount} profile(s)`);
  }
}