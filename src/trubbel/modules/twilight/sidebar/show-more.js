export class SidebarShowmore {
  constructor(parent) {
    this.parent = parent;
    this.twitch_data = parent.twitch_data;
    this.settings = parent.settings;
    this.log = parent.log;

    this.isActive = false;
    this.isExpanding = false;
    this.expandTimeout = null;

    this.log.info("[Sidebar Show More] Initialized auto-expand module");
  }

  enable() {
    if (this.isActive) {
      this.log.info("[Sidebar Show More] Already active, skipping enable");
      return;
    }

    this.log.info("[Sidebar Show More] Enabling auto-expand functionality");
    this.isActive = true;
  }

  disable() {
    if (!this.isActive) {
      this.log.info("[Sidebar Show More] Already inactive, skipping disable");
      return;
    }

    this.log.info("[Sidebar Show More] Disabling auto-expand functionality");
    this.isActive = false;

    if (this.expandTimeout) {
      clearTimeout(this.expandTimeout);
      this.expandTimeout = null;
    }
    this.isExpanding = false;
  }

  updateSidebar(el) {
    if (!el) {
      this.log.warn("[Sidebar Show More] No sidebar element provided");
      return;
    }

    if (this.isExpanding) {
      return;
    }

    this.scheduleAutoExpand();
  }

  scheduleAutoExpand(delay = 1000) {
    if (this.expandTimeout) {
      clearTimeout(this.expandTimeout);
    }

    this.expandTimeout = setTimeout(() => {
      this.expandTimeout = null;
      this.startAutoExpand();
    }, delay);
  }

  startAutoExpand() {
    const enabled = this.settings.get("addon.trubbel.twilight.sidebar_extended.show_more.expand");
    if (!enabled || this.isExpanding) {
      return;
    }

    this.isExpanding = true;

    const followedSection = document.querySelector(".side-nav-section:not(.trubbel-pinned-channels-section) .followed-side-nav-header")?.closest(".side-nav-section");

    if (!followedSection) {
      this.log.info("[Sidebar Show More] Followed channels section not found");
      this.isExpanding = false;
      return;
    }

    const firstChannelLink = followedSection.querySelector("a.side-nav-card__link[data-a-id^=\"followed-channel-\"]");
    if (!firstChannelLink) {
      this.log.info("[Sidebar Show More] No followed channels found, skipping auto-expand");
      this.isExpanding = false;
      return;
    }

    this.expandAllChannels(followedSection, 0);
  }

  expandAllChannels(followedSection, attempts = 0) {
    const maxAttempts = 15;

    if (attempts >= maxAttempts) {
      this.log.info(`[Sidebar Show More] Reached maximum attempts (${maxAttempts}), stopping expansion`);
      this.isExpanding = false;
      return;
    }

    const enabled = this.settings.get("addon.trubbel.twilight.sidebar_extended.show_more.expand");
    if (!enabled) {
      this.log.info("[Sidebar Show More] Setting disabled during expansion, stopping");
      this.isExpanding = false;
      return;
    }

    const showMoreButton = followedSection.querySelector("button[data-a-target=\"side-nav-show-more-button\"]");
    const showLessButton = followedSection.querySelector("button[data-a-target=\"side-nav-show-less-button\"]");

    if (!showMoreButton && showLessButton) {
      this.isExpanding = false;
      return;
    }

    if (!showMoreButton && !showLessButton) {
      this.isExpanding = false;
      return;
    }

    if (showMoreButton) {
      const isVisible = showMoreButton.offsetParent !== null &&
        getComputedStyle(showMoreButton).display !== "none" &&
        getComputedStyle(showMoreButton).visibility !== "hidden" &&
        !showMoreButton.disabled;

      if (isVisible) {
        showMoreButton.click();

        setTimeout(() => {
          this.expandAllChannels(followedSection, attempts + 1);
        }, 250);

        return;
      } else {
        this.log.info("[Sidebar Show More] Show more button found but not clickable - expansion complete");
      }
    }

    this.isExpanding = false;
  }

  clearSidebar(el) {
    this.log.info("[Sidebar Show More] Clearing sidebar resources", el);

    if (this.expandTimeout) {
      clearTimeout(this.expandTimeout);
      this.expandTimeout = null;
    }
    this.isExpanding = false;
  }
}