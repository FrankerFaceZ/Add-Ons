const { createElement } = FrankerFaceZ.utilities.dom;

export default class TimestampSearch {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.elemental = parent.elemental;
    this.router = parent.router;
    this.i18n = parent.i18n;
    this.fine = parent.fine;
    this.site = parent.site;
    this.log = parent.log;

    this.isActive = false;

    this.handleNavigation = this.handleNavigation.bind(this);
    this.enableTimestampSearchHandler = this.enableTimestampSearchHandler.bind(this);
    this.disableTimestampSearchHandler = this.disableTimestampSearchHandler.bind(this);
    this.handleSettingChange = this.handleSettingChange.bind(this);
    this.updateSearchResultVideoCard = this.updateSearchResultVideoCard.bind(this);
    this._updateSearchResultVideoCard = this._updateSearchResultVideoCard.bind(this);

    this.SearchResultVideo = this.elemental.define(
      "search-result-video",
      "[data-a-target=\"search-result-video\"]",
      ["search"], null, 0, 0
    );
  }

  initialize() {
    const enabled = this.settings.get("addon.trubbel.twilight.timestamp.search");
    if (enabled) {
      this.handleNavigation();
    } else {
      this.disableTimestampSearchHandler();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.log.info("[TimestampSearch] Enabling accurate timestamp display");
      this.handleNavigation();
    } else {
      this.log.info("[TimestampSearch] Disabling accurate timestamp display");
      this.disableTimestampSearchHandler();
    }
  }

  handleNavigation() {
    if (this.router?.current?.name === "search") {
      const enabled = this.settings.get("addon.trubbel.twilight.timestamp.search");
      if (enabled && !this.isActive) {
        this.log.info("[TimestampSearch] Entering search page, enabling timestamp handler");
        this.enableTimestampSearchHandler();
      }
    } else {
      if (this.isActive) {
        this.log.info("[TimestampSearch] Leaving search page, disabling timestamp handler");
        this.disableTimestampSearchHandler();
      }
    }
  }

  enableTimestampSearchHandler() {
    if (this.isActive) return;

    this.log.info("[TimestampSearch] Setting up timestamp handling");
    this.isActive = true;

    this.SearchResultVideo.each(el => {
      const targetElement = el?.parentElement?.parentElement;
      if (targetElement) {
        this.updateSearchResultVideoCard(el);
      }
    });
    this.SearchResultVideo.on("mount", this.updateSearchResultVideoCard);
    this.SearchResultVideo.on("mutate", this.updateSearchResultVideoCard);
  }

  updateSearchResultVideoCard(el) {
    if (!this.isActive) {
      return;
    }

    const targetElement = el?.parentElement?.parentElement;
    if (!targetElement) {
      this.log.warn("[TimestampSearch] Could not find parent element");
      return;
    }

    this.site.awaitElement(".search-result-card", targetElement, 5000).then(() => {
      const parent = this.fine.searchParentNode(targetElement, n => n.memoizedProps?.children?.props);
      if (!parent) {
        this.log.warn("[TimestampSearch] No parent with memoizedProps found");
        return;
      }

      const props = parent.memoizedProps;
      this.log.info("[TimestampSearch] props:", props?.children?.props);
      this._updateSearchResultVideoCard(targetElement, props).catch(err => {
        this.log.error("[TimestampSearch] Async _updateSearchResultVideoCard failed:", err);
      });
    }).catch(err => {
      this.log.warn("[TimestampSearch] Failed to find required element:", err);
    });
  }

  async _updateSearchResultVideoCard(el, item) {
    try {
      const showAccurateTimestamp = this.settings.get("addon.trubbel.twilight.timestamp.search");

      if (!showAccurateTimestamp) {
        return;
      }

      const videoData = item.children?.props;
      if (!videoData) {
        this.log.warn("[TimestampSearch] No video data found in props");
        return;
      }

      const publishedAt = videoData.publishedAt;
      if (!publishedAt) {
        this.log.warn("[TimestampSearch] No publishedAt found in video data");
        return;
      }

      if (el._timestamp_replaced) return;

      const format = this.settings.get("addon.trubbel.twilight.timestamp.search.format");
      const includeRelative = this.settings.get("addon.trubbel.twilight.timestamp.search.relative");

      const formattedTimestamp = this.i18n.formatDateTime(publishedAt, format);

      let relative = "";
      if (includeRelative) {
        relative = ` (${this.i18n.toRelativeTime(publishedAt)})`;
      }

      let timestampSpan;
      try {
        const searchCard = await this.site.awaitElement(".search-result-card", el, 5000);

        const titleSpans = searchCard.querySelectorAll("span[title]");

        if (titleSpans.length >= 2) {
          timestampSpan = titleSpans[1];
        } else {
          this.log.warn("[TimestampSearch] Not enough spans with title found, expected at least 2");
          return;
        }

      } catch (awaitError) {
        this.log.error("[TimestampSearch] awaitElement failed:", awaitError);
        return;
      }

      if (!timestampSpan) {
        this.log.warn("[TimestampSearch] Timestamp span not found");
        return;
      }

      el._publishedAt = publishedAt;

      timestampSpan.textContent = `${formattedTimestamp}${relative}`;

      el._timestamp_replaced = true;

    } catch (err) {
      this.log.error("[TimestampSearch] Error in _updateSearchResultVideoCard:", err);
    }
  }

  disableTimestampSearchHandler() {
    if (!this.isActive) return;

    this.log.info("[TimestampSearch] Removing timestamp handling");
    this.isActive = false;

    this.SearchResultVideo.off("mount", this.updateSearchResultVideoCard);
    this.SearchResultVideo.off("mutate", this.updateSearchResultVideoCard);
  }
}