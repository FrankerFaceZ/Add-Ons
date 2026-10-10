const { createElement, on, off } = FrankerFaceZ.utilities.dom;
const { duration_to_string } = FrankerFaceZ.utilities.time;

export class SidebarPreviews {
  constructor(parent) {
    this.parent = parent;
    this.twitch_data = parent.twitch_data;
    this.settings = parent.settings;
    this.router = parent.router;
    this.chat = parent.chat;
    this.fine = parent.fine;
    this.site = parent.site;
    this.log = parent.log;

    this.isActive = false;

    this.previewPopup = null;
    this.currentHoverCard = null;
    this.hoverTimeout = null;
    this.uptimeUpdateInterval = null;
    this.currentUptimeData = null;
    this.handleKeyDown = null;

    this.hoverCard = null;
    this.currentLogin = null;

    this.streamMetaCache = new Map();
    this.prefetchTimeout = null;

    this.shiftHeld = false;
    this.locked = false;

    this.onMouseOver = this.onMouseOver.bind(this);
    this.onMouseOut = this.onMouseOut.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onWindowBlur = this.onWindowBlur.bind(this);
    this.onLockedMouseMove = this.onLockedMouseMove.bind(this);

    this.updateSidebar = this.updateSidebar.bind(this);
    this.showPreview = this.showPreview.bind(this);
    this.hidePreview = this.hidePreview.bind(this);
    this.clearSidebar = this.clearSidebar.bind(this);
    this.isSidebarOnRight = this.isSidebarOnRight.bind(this);
    this.updatePreviewSize = this.updatePreviewSize.bind(this);
    this.updateUptimeDisplay = this.updateUptimeDisplay.bind(this);
    this.calculateUptime = this.calculateUptime.bind(this);
    this.positionPreview = this.positionPreview.bind(this);

    this.log.info("[Sidebar Previews] Initialized sidebar previews module");
  }

  enable() {
    if (this.isActive) {
      this.log.info("[Sidebar Previews] Already active, skipping enable");
      return;
    }

    this.log.info("[Sidebar Previews] Enabling sidebar previews functionality");
    on(document, "mouseover", this.onMouseOver);
    on(document, "mouseout", this.onMouseOut);
    on(window, "keydown", this.onKeyDown);
    on(window, "keyup", this.onKeyUp);
    on(window, "blur", this.onWindowBlur);
    this.isActive = true;
  }

  disable() {
    if (!this.isActive) {
      this.log.info("[Sidebar Previews] Already inactive, skipping disable");
      return;
    }

    this.log.info("[Sidebar Previews] Disabling sidebar previews functionality");

    off(document, "mouseover", this.onMouseOver);
    off(document, "mouseout", this.onMouseOut);
    off(window, "keydown", this.onKeyDown);
    off(window, "keyup", this.onKeyUp);
    off(window, "blur", this.onWindowBlur);

    this.shiftHeld = false;
    this.clearHoverTimeout();
    this.clearPrefetchTimeout();
    this.hoverCard = null;
    this.hidePreview();
    this.streamMetaCache.clear();
    this.isActive = false;
  }

  updateSidebar(el) {
    if (!el) {
      this.log.warn("[Sidebar Previews] No sidebar element provided");
      return;
    }

    if (!this.settings.get("addon.trubbel.twilight.sidebar.preview")) {
      return;
    }

    this.enable();
    this.schedulePrefetch(el);
    return true;
  }

  clearHoverTimeout() {
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }
  }

  clearPrefetchTimeout() {
    if (this.prefetchTimeout) {
      clearTimeout(this.prefetchTimeout);
      this.prefetchTimeout = null;
    }
  }

  schedulePrefetch(el) {
    this.clearPrefetchTimeout();
    this.prefetchTimeout = setTimeout(() => {
      this.prefetchTimeout = null;
      if (el.isConnected) this.prefetchUptimes(el);
    }, 250);
  }

  prefetchUptimes(el) {
    if (!this.settings.get("addon.trubbel.twilight.sidebar.preview.show_uptime")) return;

    for (const card of el.querySelectorAll(".side-nav-card")) {
      if (card.parentElement?.closest(".side-nav-card")) continue;
      if (card.classList.contains("trubbel-pinned-channel-card")) continue;
      if (card.classList.contains("ffz--side-nav-card-offline") ||
        card.querySelector(".side-nav-card__avatar--offline")) continue;

      const props = this.fine.getReactInstance(card)?.return?.return?.memoizedProps;
      if (props?.userLogin) this.getCachedStreamMeta(props);
    }
  }

  getStreamId(props) {
    return props?.metadataRight?.props?.stream?.id ||
      props?.tooltipContent?.props?.stream?.content?.id ||
      null;
  }

  getCachedStreamMeta(props) {
    const login = props.userLogin.toLowerCase();
    const streamId = this.getStreamId(props);
    const entry = this.streamMetaCache.get(login);

    if (entry) {
      const age = Date.now() - entry.fetched;
      if (!entry.done || age < 60 * 1000) return entry;
      if (entry.data && (!streamId || entry.data.id === streamId)) return entry;
      if (!entry.data && age < 5 * 60 * 1000) return entry;
    }

    const fresh = { data: null, done: false, fetched: Date.now(), promise: null };
    this.streamMetaCache.set(login, fresh);

    fresh.promise = this.twitch_data.getStreamMeta(props.userID, props.userLogin)
      .then(data => {
        fresh.data = data || null;
        return fresh.data;
      })
      .catch(err => {
        this.log.error(`[Sidebar Preview] Failed to fetch uptime for ${props.userLogin}:`, err);
        return null;
      })
      .finally(() => {
        fresh.done = true;
      });

    return fresh;
  }

  getCardFromTarget(target) {
    let card = target?.closest?.(".side-nav-card");
    if (!card || !card.closest(".side-nav")) return null;

    let parent;
    while ((parent = card.parentElement?.closest(".side-nav-card")))
      card = parent;

    return card;
  }

  getCardLogin(card) {
    const href = card?.querySelector("a[href^=\"/\"]")?.getAttribute("href");
    return href ? href.slice(1).split("?")[0].toLowerCase() : null;
  }

  findOriginalCard(login) {
    for (const link of document.querySelectorAll(`.side-nav a[href="/${login}"]`)) {
      if (!link.closest(".trubbel-pinned-channels-section"))
        return this.getCardFromTarget(link);
    }
    return null;
  }

  onMouseOver(event) {
    if (!event.shiftKey) this.shiftHeld = false;

    if (this.locked) return;

    const card = this.getCardFromTarget(event.target);
    if (!card || card === this.hoverCard) return;

    this.startHover(card);
  }

  startHover(card) {
    this.hoverCard = card;
    this.clearHoverTimeout();

    if (!this.settings.get("addon.trubbel.twilight.sidebar.preview")) return;

    if (this.previewPopup && this.currentLogin === this.getCardLogin(card)) {
      this.currentHoverCard = card;
      return;
    }

    const delay = this.settings.get("addon.trubbel.twilight.sidebar.preview.delay");
    if (delay > 0) {
      this.hoverTimeout = setTimeout(() => {
        this.hoverTimeout = null;
        this.showPreviewForCard(card);
      }, delay);
    } else {
      this.showPreviewForCard(card);
    }
  }

  onMouseOut(event) {
    if (this.locked) return;

    const card = this.getCardFromTarget(event.target);
    if (!card || card.contains(event.relatedTarget)) return;

    if (card === this.hoverCard) this.hoverCard = null;
    this.clearHoverTimeout();
    this.hidePreview();
  }

  onKeyDown(event) {
    if (event.code !== "ShiftLeft" || event.repeat) return;

    this.shiftHeld = true;
    if (this.previewPopup && !this.locked) this.lockPreview();
  }

  onKeyUp(event) {
    if (event.code !== "ShiftLeft") return;

    this.shiftHeld = false;
    this.unlockPreview();
  }

  onWindowBlur() {
    this.shiftHeld = false;

    setTimeout(() => {
      if (!this.locked) return;

      const active = document.activeElement;
      if (active?.tagName === "IFRAME" && this.previewPopup?.contains(active)) return;

      this.unlockPreview();
    }, 0);
  }

  onLockedMouseMove(event) {
    if (!event.shiftKey) {
      this.shiftHeld = false;
      this.unlockPreview();
    }
  }

  lockPreview() {
    if (!this.previewPopup || this.locked) return;

    this.locked = true;
    this.clearHoverTimeout();

    this.previewPopup.style.pointerEvents = "auto";
    this.previewPopup.style.outline = "2px solid #9147ff";

    on(document, "mousemove", this.onLockedMouseMove);
  }

  unlockPreview() {
    if (!this.locked) return;

    this.releaseLock();

    const hovered = this.getCardFromTarget(document.querySelector(".side-nav .side-nav-card:hover"));
    if (hovered && this.currentLogin && this.getCardLogin(hovered) === this.currentLogin) {
      this.hoverCard = hovered;
      return;
    }

    this.hidePreview();
    this.hoverCard = null;

    if (hovered) this.startHover(hovered);
  }

  releaseLock() {
    if (!this.locked) return;

    this.locked = false;
    off(document, "mousemove", this.onLockedMouseMove);

    if (this.previewPopup) {
      this.previewPopup.style.pointerEvents = "none";
      this.previewPopup.style.outline = "";
    }
  }

  showPreviewForCard(card) {
    if (!card.isConnected) {
      card = this.getCardFromTarget(document.querySelector(".side-nav .side-nav-card:hover"));
      if (!card) return;
      this.hoverCard = card;
    }

    if (card.classList.contains("trubbel-pinned-channel-card")) {
      let original = card._trubbel_original_card;
      if (!original?.isConnected) {
        const login = this.getCardLogin(card);
        original = login && this.findOriginalCard(login);
      }
      if (original)
        this.parent.sidebarManager.pinned.showPreviewWithCorrectPosition(card, original);
      return;
    }

    this.showPreview(card);
  }

  updatePreviewSize() {
    if (this.previewPopup) {
      const width = this.getPreviewWidth();
      const height = this.getPreviewHeight(width);
      const wrapper = this.previewPopup.querySelector(".trubbel-sidebar-preview-wrapper");
      if (wrapper) {
        wrapper.style.width = `${width}px`;
        wrapper.style.height = `${height}px`;
        if (this.currentHoverCard) {
          this.positionPreview(this.currentHoverCard);
        }
      }
    }
  }

  getPreviewWidth() {
    const width = this.settings.get("addon.trubbel.twilight.sidebar.preview.size");
    return typeof width === "number" ? Math.max(280, Math.min(1000, width)) : 480;
  }

  getPreviewHeight(width) {
    const aspectRatio = 16 / 9;
    return Math.round(width / aspectRatio);
  }

  calculateUptime(createdAt) {
    if (!createdAt) return null;

    const upSince = new Date(createdAt);
    const uptime = Math.floor((Date.now() - upSince) / 1000);

    if (uptime < 1) return null;
    return duration_to_string(uptime, false, false, false, true);
  }

  updateUptimeDisplay() {
    if (!this.previewPopup || !this.currentUptimeData) return;

    const uptimeText = this.calculateUptime(this.currentUptimeData.createdAt);
    if (!uptimeText) return;

    const uptimeElement = this.previewPopup.querySelector(".trubbel-sidebar-preview-uptime");
    const uptimeTextElement = this.previewPopup.querySelector(".trubbel-sidebar-preview-uptime-text");

    if (uptimeElement && uptimeTextElement) {
      uptimeElement.style.display = "flex";
      uptimeTextElement.textContent = uptimeText;
    }
  }

  isSidebarOnRight() {
    const sidebarEl = document.querySelector(".side-bar-contents, .side-nav");
    if (!sidebarEl) {
      this.log.warn("[Sidebar Preview] Could not find sidebar element");
      return false;
    }

    const sidebarRect = sidebarEl.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const isOnRight = (viewportWidth - sidebarRect.right) < sidebarRect.left;

    return isOnRight;
  }

  positionPreview(card) {
    if (!this.previewPopup || !card) return;

    const cardRect = card.getBoundingClientRect();
    const previewRect = this.previewPopup.getBoundingClientRect();

    let top = cardRect.top + (cardRect.height / 2) - (previewRect.height / 2);

    const sidebarEl = document.querySelector(".side-bar-contents, .side-nav");
    if (!sidebarEl) {
      this.log.error("[Sidebar Preview] Could not find sidebar element for positioning");
      return;
    }

    const sidebarRect = sidebarEl.getBoundingClientRect();
    const isOnRight = this.isSidebarOnRight();

    if (isOnRight) {
      this.previewPopup.style.left = "auto";
      this.previewPopup.style.right = `${window.innerWidth - sidebarRect.left + 10}px`;
    } else {
      this.previewPopup.style.right = "auto";
      this.previewPopup.style.left = `${sidebarRect.right + 10}px`;
    }

    const viewportHeight = window.innerHeight;
    if (top < 10) top = 10;
    if (top + previewRect.height > viewportHeight - 10) {
      top = viewportHeight - previewRect.height - 10;
    }

    this.previewPopup.style.top = `${top}px`;
  }

  showPreview(card) {
    if (!card) {
      this.log.error("[Sidebar Preview] Missing card for preview");
      return;
    }

    const link = card.querySelector("a[href]");
    if (card.classList.contains("ffz--side-nav-card-offline") ||
      card.querySelector(".side-nav-card__avatar--offline") ||
      link?.getAttribute("href")?.includes("/directory/")) {
      return;
    }

    this.hidePreview();
    this.currentHoverCard = card;

    const react = this.fine.getReactInstance(card);
    const props = react?.return?.return?.memoizedProps;

    if (!props || !props.userLogin) {
      this.log.error("[Sidebar Preview] Could not find userLogin in props");
      this.log.error("[Sidebar Preview] props:", props);
      return;
    }

    this.log.info("[Sidebar Preview] props:", props);

    const login = props.userLogin.toLowerCase();
    this.currentLogin = login;

    let streamTitle = "";
    if (props.metadataRight?.props?.stream?.broadcaster?.broadcastSettings?.title) {
      streamTitle = props.metadataRight.props.stream.broadcaster.broadcastSettings.title;
    } else if (props.tooltipContent?.props?.stream?.content?.broadcaster?.broadcastSettings?.title) {
      streamTitle = props.tooltipContent.props.stream.content.broadcaster.broadcastSettings.title;
    } else if (props.tooltipContent?.props?.stream?.user?.broadcastSettings?.title) {
      streamTitle = props.tooltipContent.props.stream.user.broadcastSettings.title;
    }

    let categoryName = "";
    if (props?.metadataLeft) {
      categoryName = props.metadataLeft;
    } else if (props.metadataRight?.props?.stream?.game?.displayName) {
      categoryName = props.metadataRight.props.stream.game.displayName;
    } else if (props.tooltipContent?.props?.stream?.content?.game?.displayName) {
      categoryName = props.tooltipContent.props.stream.content.game.displayName;
    }

    let viewerCount = 0;
    if (props?.viewerCount) {
      viewerCount = props.viewerCount;
    } else if (props.metadataRight?.props?.stream?.viewersCount) {
      viewerCount = props.metadataRight.props.stream.viewersCount;
    } else if (props.tooltipContent?.props?.stream?.content?.viewersCount) {
      viewerCount = props.tooltipContent.props.stream.content.viewersCount;
    }

    const hypeTrainData = props?.activeHypeTrain?.hypeTrainStatus;

    let creatorPromotionData = null;
    if (props?.creatorPromotionActivation) {
      creatorPromotionData = props.creatorPromotionActivation;
    } else if (props.tooltipContent?.props?.creatorPromotionActivation) {
      creatorPromotionData = props.tooltipContent.props.creatorPromotionActivation;
    }

    const guests = props?.tooltipContent?.props?.guests || [];

    const sponsorshipData = props?.sponsorship?.sponsoredSideNavChannel;

    const showCostreamers = this.settings.get("addon.trubbel.twilight.sidebar.preview.show_costreamers");
    const costreamDetails =
      props.metadataRight?.props?.stream?.costreamDetails ||
      props.tooltipContent?.props?.stream?.content?.costreamDetails ||
      props.tooltipContent?.props?.stream?.costreamDetails ||
      props.tooltipContent?.props?.costreamDetails ||
      props.costreamDetails ||
      null;

    let costreamers = [];
    if (showCostreamers && Array.isArray(costreamDetails?.topCostreamers)) {
      costreamers = costreamDetails.topCostreamers.filter(costreamer =>
        costreamer?.__typename === "User" &&
        costreamer?.displayName &&
        costreamer?.profileImageURL
      );

      if (showCostreamers === 2) {
        costreamers.sort((a, b) => a.displayName.localeCompare(b.displayName));
      } else if (showCostreamers === 3 || showCostreamers === 4) {
        const online = costreamers.filter(c => c.stream?.viewersCount != null);
        const offline = costreamers.filter(c => c.stream?.viewersCount == null);

        if (showCostreamers === 3) {
          online.sort((a, b) => b.stream.viewersCount - a.stream.viewersCount);
        } else {
          online.sort((a, b) => a.stream.viewersCount - b.stream.viewersCount);
        }

        costreamers = [...online, ...offline];
      }
    }

    let costreamersRemaining = 0;
    let costreamersRemainingViewers = 0;
    if (costreamers.length > 0 && costreamDetails) {
      costreamersRemaining = (costreamDetails.costreamersCount || 0) - costreamers.length;

      const totalViewers = costreamDetails.totalViewersCount || 0;
      const organizerViewers = costreamDetails.organizer?.stream?.viewersCount || 0;
      const shownViewers = costreamers.reduce((sum, c) => sum + (c.stream?.viewersCount || 0), 0);
      costreamersRemainingViewers = totalViewers - organizerViewers - shownViewers;
    }

    const watchStreakData = props?.watchStreak;

    const quality = this.settings.get("addon.trubbel.twilight.sidebar.preview.quality");
    const muted = !this.settings.get("addon.trubbel.twilight.sidebar.preview.audio");
    const showTitle = this.settings.get("addon.trubbel.twilight.sidebar.preview.show_title");
    const showCategory = this.settings.get("addon.trubbel.twilight.sidebar.preview.show_category");
    const showViewers = this.settings.get("addon.trubbel.twilight.sidebar.preview.show_viewer_count");
    const showHypeTrain = this.settings.get("addon.trubbel.twilight.sidebar.preview.show_hype_train");
    const showDiscount = this.settings.get("addon.trubbel.twilight.sidebar.preview.show_gift_discount");
    const showGuests = this.settings.get("addon.trubbel.twilight.sidebar.preview.show_guests");
    const showUptime = this.settings.get("addon.trubbel.twilight.sidebar.preview.show_uptime");
    const showSponsorship = this.settings.get("addon.trubbel.twilight.sidebar.preview.show_sponsorship");
    const showWatchStreak = this.settings.get("addon.trubbel.twilight.sidebar.preview.show_watch_streak");

    let uptimeData = null;
    let uptimeText = null;

    if (showUptime) {
      const entry = this.getCachedStreamMeta(props);

      if (entry.data) {
        uptimeData = entry.data;
        uptimeText = this.calculateUptime(uptimeData.createdAt);
        this.currentUptimeData = uptimeData;
      } else if (!entry.done) {
        entry.promise.then(data => {
          if (!data || this.currentLogin !== login || !this.previewPopup) return;
          this.currentUptimeData = data;
          this.updateUptimeDisplay();
          if (!this.uptimeUpdateInterval) {
            this.uptimeUpdateInterval = setInterval(this.updateUptimeDisplay, 1000);
          }
        });
      }
    }

    const width = this.getPreviewWidth();
    const height = this.getPreviewHeight(width);

    const params = new URLSearchParams({
      channel: props.userLogin,
      enableExtensions: false,
      parent: "twitch.tv",
      player: "site",
      quality: quality,
      muted: muted,
      volume: localStorage.getItem("volume"),
      controls: false,
      disable_frankerfacez: true
    });
    const playerUrl = `https://player.twitch.tv/?${params}`;

    const formatNumber = (num) => {
      if (typeof this.parent.resolve === "function" && this.parent.resolve("i18n")?.formatNumber) {
        return this.parent.resolve("i18n").formatNumber(num);
      }
      return new Intl.NumberFormat().format(num);
    };

    const formatTimeRemaining = (endsAt) => {
      const now = new Date();
      const endTime = new Date(endsAt);
      const diffMs = endTime - now;

      if (diffMs <= 0) return "Ended";

      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);

      const remainingHours = diffHours % 24;
      const remainingMinutes = diffMinutes % 60;

      if (diffDays > 0) {
        if (remainingHours > 0) {
          return `${diffDays}d ${remainingHours}h`;
        } else {
          return `${diffDays}d`;
        }
      } else if (diffHours > 0) {
        if (remainingMinutes > 0) {
          return `${diffHours}h ${remainingMinutes}m`;
        } else {
          return `${diffHours}h`;
        }
      } else if (diffMinutes > 0) {
        return `${diffMinutes}m`;
      } else {
        return "< 1m";
      }
    };

    this.previewPopup = (
      <div
        className="trubbel-sidebar-preview"
        style={{
          position: "fixed",
          zIndex: 9999,
          display: "block",
          visibility: "visible",
          opacity: 1,
          background: `${this.settings.get("addon.trubbel.twilight.sidebar.preview.tooltip_background")}`,
          borderRadius: "6px",
          overflow: "hidden",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
          pointerEvents: "none",
          width: `${width}px`
        }}
      >
        <div
          className="trubbel-sidebar-preview-wrapper"
          style={{
            width: "100%",
            height: `${height}px`,
            position: "relative"
          }}
        >
          <iframe
            src={playerUrl}
            style={{
              width: "100%",
              height: "100%",
              border: 0,
              display: "block",
              backgroundColor: "black"
            }}
            allow="autoplay; fullscreen"
            frameBorder="0"
          />

          {/* Uptime Preview */}
          {showUptime && (
            <div
              className="trubbel-sidebar-preview-uptime"
              style={{
                position: "absolute",
                bottom: "8px",
                right: "8px",
                background: "rgba(0, 0, 0, 0.6)",
                color: "#fff",
                padding: "4px 6px",
                borderRadius: "0.2rem",
                fontSize: "0.9rem",
                display: uptimeText ? "flex" : "none",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <figure
                className="ffz-i-clock"
                style={{
                  width: "1em",
                  color: "#ff8280",
                  flexShrink: 0
                }}
              />
              <span className="trubbel-sidebar-preview-uptime-text">
                {uptimeText || "Loading..."}
              </span>
            </div>
          )}
        </div>

        {/* Title Preview */}
        {showTitle && streamTitle && (
          <div
            className="trubbel-sidebar-preview-title"
            style={{
              padding: "6px 8px",
              fontSize: "1.3rem",
              fontWeight: 600,
              color: `${this.settings.get("addon.trubbel.twilight.sidebar.preview.tooltip_title")}`,
              wordBreak: "break-word",
              overflowWrap: "break-word",
              whiteSpace: "normal",
              lineHeight: 1.5,
              width: "100%",
              boxSizing: "border-box",
              overflow: "hidden"
            }}
          >
            {streamTitle}
          </div>
        )}

        {/* Category Preview */}
        {showCategory && categoryName && (
          <div
            className="trubbel-sidebar-preview-category"
            style={{
              padding: "4px 8px",
              fontSize: "1.2rem",
              color: `${this.settings.get("addon.trubbel.twilight.sidebar.preview.tooltip_text")}`,
              wordBreak: "break-word",
              overflowWrap: "break-word",
              whiteSpace: "normal",
              lineHeight: 1.3,
              width: "100%",
              boxSizing: "border-box",
              overflow: "hidden",
              borderTop: `1px solid ${this.settings.get("addon.trubbel.twilight.sidebar.preview.tooltip_border")}`
            }}
          >
            {categoryName}
          </div>
        )}

        {/* Viewer Count Preview */}
        {showViewers && viewerCount > 0 && (
          <div
            className="trubbel-sidebar-preview-viewers"
            style={{
              padding: "4px 8px",
              fontSize: "1.2rem",
              color: `${this.settings.get("addon.trubbel.twilight.sidebar.preview.tooltip_text")}`,
              width: "100%",
              boxSizing: "border-box",
              overflow: "hidden",
              borderTop: `1px solid ${this.settings.get("addon.trubbel.twilight.sidebar.preview.tooltip_border")}`
            }}
          >
            {formatNumber(viewerCount)} viewers
          </div>
        )}

        {/* Hype Train Preview */}
        {showHypeTrain && hypeTrainData && (
          <div
            className="trubbel-sidebar-preview-hypetrain"
            style={{
              padding: "4px 8px",
              fontSize: "1.2rem",
              color: `${this.settings.get("addon.trubbel.twilight.sidebar.preview.tooltip_text")}`,
              width: "100%",
              boxSizing: "border-box",
              overflow: "hidden",
              borderTop: `1px solid ${this.settings.get("addon.trubbel.twilight.sidebar.preview.tooltip_border")}`,
              display: "flex",
              alignItems: "center"
            }}
          >
            <span
              className={(() => {
                if (hypeTrainData.isAllTimeHighTrain) return "trubbel-hype-train-alltime";
                if (hypeTrainData.isGoldenKappaTrain) return "trubbel-hype-train-golden";
                if (hypeTrainData.isSharedTrain) return "trubbel-hype-train-shared";
                if (hypeTrainData.isTreasureTrain) return "trubbel-hype-train-treasure";
                if (hypeTrainData.hypeTrainType === "MYTHIC") return "trubbel-hype-train-mythic";
                if (hypeTrainData.hypeTrainType === "COMMUNITY") return "trubbel-hype-train-community";
                return "trubbel-hype-train-regular";
              })()}
              style={{
                display: "inline-block",
                verticalAlign: "middle",
                marginRight: "4px",
                height: "1.3rem",
                width: "1.3rem",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                WebkitMaskSize: "100%",
                maskSize: "100%",
                ...(() => {
                  if (hypeTrainData.isAllTimeHighTrain) {
                    return {
                      background: "linear-gradient(#9147ff, #ff75e6)",
                      WebkitMaskImage: "url(https://static-cdn.jtvnw.net/c3-vg/leftnav/trophy.svg)",
                      maskImage: "url(https://static-cdn.jtvnw.net/c3-vg/leftnav/trophy.svg)"
                    };
                  }

                  if (hypeTrainData.isGoldenKappaTrain) {
                    return {
                      background: "linear-gradient(#ecb457, #ae6c00)",
                      WebkitMaskImage: "url(https://static-cdn.jtvnw.net/c3-vg/leftnav/hype-train.svg)",
                      maskImage: "url(https://static-cdn.jtvnw.net/c3-vg/leftnav/hype-train.svg)"
                    };
                  }

                  if (hypeTrainData.isSharedTrain) {
                    return {
                      background: "linear-gradient(#fa1ed2, #f093f9, #ed722f, #faf31a)",
                      WebkitMaskImage: "url(https://static-cdn.jtvnw.net/c3-vg/leftnav/hype-train.svg)",
                      maskImage: "url(https://static-cdn.jtvnw.net/c3-vg/leftnav/hype-train.svg)"
                    };
                  }

                  if (hypeTrainData.isTreasureTrain) {
                    return {
                      background: "linear-gradient(90deg, #2245a4, #4f46cd, #874bf6)",
                      WebkitMaskImage: "url(https://static-cdn.jtvnw.net/c3-vg/leftnav/hype-train.svg)",
                      maskImage: "url(https://static-cdn.jtvnw.net/c3-vg/leftnav/hype-train.svg)"
                    };
                  }

                  if (hypeTrainData.hypeTrainType === "COMMUNITY") {
                    return {
                      background: "#1e69ff",
                      WebkitMaskImage: "url(https://static-cdn.jtvnw.net/c3-vg/leftnav/hype-train.svg)",
                      maskImage: "url(https://static-cdn.jtvnw.net/c3-vg/leftnav/hype-train.svg)"
                    };
                  }

                  if (hypeTrainData.hypeTrainType === "MYTHIC") {
                    return {
                      background: "linear-gradient(90deg, #976700, #ffd760, #fff9eb, #ffd760)",
                      WebkitMaskImage: "url(https://static-cdn.jtvnw.net/c3-vg/leftnav/hype-train.svg)",
                      maskImage: "url(https://static-cdn.jtvnw.net/c3-vg/leftnav/hype-train.svg)"
                    };
                  }

                  return {
                    background: "#bf94ff",
                    WebkitMaskImage: "url(https://static-cdn.jtvnw.net/c3-vg/leftnav/hype-train.svg)",
                    maskImage: "url(https://static-cdn.jtvnw.net/c3-vg/leftnav/hype-train.svg)"
                  };
                })()
              }}
            />
            {(() => {
              const hasOtherTrain = hypeTrainData.isAllTimeHighTrain ||
                hypeTrainData.isGoldenKappaTrain ||
                hypeTrainData.isTreasureTrain ||
                hypeTrainData.hypeTrainType === "MYTHIC";

              const prefix = (hypeTrainData.isSharedTrain && hasOtherTrain) ? "Shared " : "";

              if (hypeTrainData.isAllTimeHighTrain) return prefix + "All-Time High Train";
              if (hypeTrainData.isGoldenKappaTrain) return prefix + "Golden Kappa Train";
              if (hypeTrainData.isSharedTrain) return "Shared Hype Train";
              if (hypeTrainData.isTreasureTrain) return prefix + "Treasure Train";
              if (hypeTrainData.hypeTrainType === "COMMUNITY") return prefix + "Community Train";
              if (hypeTrainData.hypeTrainType === "MYTHIC") return prefix + "Mythic Train";
              return "Hype Train";
            })()}
            {" • Level " + (hypeTrainData.level || 1)}
          </div>
        )}

        {/* Discount Preview */}
        {showDiscount && creatorPromotionData && creatorPromotionData.endsAt && (
          <div
            className="trubbel-sidebar-preview-gift"
            style={{
              padding: "4px 8px",
              fontSize: "1.2rem",
              color: `${this.settings.get("addon.trubbel.twilight.sidebar.preview.tooltip_text")}`,
              width: "100%",
              boxSizing: "border-box",
              overflow: "hidden",
              borderTop: `1px solid ${this.settings.get("addon.trubbel.twilight.sidebar.preview.tooltip_border")}`,
              display: "flex",
              alignItems: "center"
            }}
          >
            <span
              className="trubbel-gift-icon"
              style={{
                display: "inline-block",
                verticalAlign: "middle",
                marginRight: "6px",
                height: "1.3rem",
                width: "1.3rem",
                background: "linear-gradient(#be0078,#8205b4)",
                WebkitMaskImage: "url(https://static-cdn.jtvnw.net/twilight-static-assets/giftIcon.svg)",
                maskImage: "url(https://static-cdn.jtvnw.net/twilight-static-assets/giftIcon.svg)",
                WebkitMaskPosition: "center",
                maskPosition: "center",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                WebkitMaskSize: "contain",
                maskSize: "contain"
              }}
            />
            Discount • Ends in {formatTimeRemaining(creatorPromotionData.endsAt)}
          </div>
        )}

        {/* Guest Preview */}
        {showGuests && guests.length > 0 && (
          <div
            className="trubbel-sidebar-preview-guests"
            style={{
              padding: "4px 8px",
              fontSize: "1.2rem",
              color: `${this.settings.get("addon.trubbel.twilight.sidebar.preview.tooltip_text")}`,
              width: "100%",
              boxSizing: "border-box",
              overflow: "hidden",
              borderTop: `1px solid ${this.settings.get("addon.trubbel.twilight.sidebar.preview.tooltip_border")}`
            }}
          >
            <div
              className="trubbel-sidebar-preview-guests-list"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px"
              }}
            >
              {guests.map((guest, index) => {
                const displayName = guest.displayName;
                const login = guest.login;
                const username = displayName.toLowerCase() !== login ?
                  `${displayName} (${login})` : displayName;

                const borderColor = guest.primaryColorHex ?
                  `#${guest.primaryColorHex}` : "#9147ff";

                return (
                  <div
                    key={index}
                    className="trubbel-sidebar-preview-guest-item"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px"
                    }}
                  >
                    {/* Guest Avatar */}
                    <div
                      className="trubbel-sidebar-preview-guest-avatar"
                      style={{
                        width: "16px",
                        height: "16px",
                        borderRadius: "50%",
                        flexShrink: 0,
                        position: "relative",
                        boxSizing: "content-box"
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: "-3px",
                          left: "-3px",
                          right: "-3px",
                          bottom: "-3px",
                          borderRadius: "50%",
                          pointerEvents: "none",
                          zIndex: 1,
                          border: `0.2rem solid ${borderColor}`
                        }}
                      />
                      <img
                        src={guest.profileImageURL}
                        alt={guest.displayName}
                        className="tw-image-avatar"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          borderRadius: "50%",
                          position: "relative",
                          zIndex: 0
                        }}
                      />
                    </div>
                    {/* Guest Name */}
                    <div
                      className="trubbel-sidebar-preview-guest-name"
                      style={{
                        flexGrow: 1,
                        fontSize: "1.1rem",
                        color: "inherit"
                      }}
                    >
                      {username}
                    </div>
                    {/* Guest Viewer count */}
                    <div
                      className="trubbel-sidebar-preview-guest-viewers"
                      style={{
                        fontSize: "1.1rem",
                        color: "inherit",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                    >
                      {guest.stream && guest.stream.viewersCount ? [
                        <span
                          key="indicator"
                          className="trubbel-sidebar-preview-guest-online-indicator"
                          style={{
                            display: "inline-block",
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            backgroundColor: "#eb0400",
                            marginRight: "4px"
                          }}
                        />,
                        formatNumber(guest.stream.viewersCount)
                      ] : "offline"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Co-streamers Preview */}
        {costreamers.length > 0 && (
          <div
            className="trubbel-sidebar-preview-costreamers"
            style={{
              padding: "4px 8px",
              fontSize: "1.2rem",
              color: `${this.settings.get("addon.trubbel.twilight.sidebar.preview.tooltip_text")}`,
              width: "100%",
              boxSizing: "border-box",
              overflow: "hidden",
              borderTop: `1px solid ${this.settings.get("addon.trubbel.twilight.sidebar.preview.tooltip_border")}`
            }}
          >
            <div
              className="trubbel-sidebar-preview-costreamers-label"
              style={{
                fontSize: "1.1rem",
                fontWeight: 600,
                marginBottom: "6px"
              }}
            >
              Co-streamers
            </div>
            <div
              className="trubbel-sidebar-preview-costreamers-list"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px"
              }}
            >
              {costreamers.map((costreamer, index) => {
                const displayName = costreamer.displayName;
                const login = costreamer.login;
                const username = login && displayName.toLowerCase() !== login ?
                  `${displayName} (${login})` : displayName;

                const borderColor = costreamer.primaryColorHex ?
                  `#${costreamer.primaryColorHex}` : "#9147ff";

                return (
                  <div
                    key={costreamer.id || index}
                    className="trubbel-sidebar-preview-costreamer-item"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px"
                    }}
                  >
                    {/* Co-streamer Avatar */}
                    <div
                      className="trubbel-sidebar-preview-costreamer-avatar"
                      style={{
                        width: "16px",
                        height: "16px",
                        borderRadius: "50%",
                        flexShrink: 0,
                        position: "relative",
                        boxSizing: "content-box"
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: "-3px",
                          left: "-3px",
                          right: "-3px",
                          bottom: "-3px",
                          borderRadius: "50%",
                          pointerEvents: "none",
                          zIndex: 1,
                          border: `0.2rem solid ${borderColor}`
                        }}
                      />
                      <img
                        src={costreamer.profileImageURL}
                        alt={costreamer.displayName}
                        className="tw-image-avatar"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          borderRadius: "50%",
                          position: "relative",
                          zIndex: 0
                        }}
                      />
                    </div>
                    {/* Co-streamer Name */}
                    <div
                      className="trubbel-sidebar-preview-costreamer-name"
                      style={{
                        flexGrow: 1,
                        fontSize: "1.1rem",
                        color: "inherit",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {username}
                    </div>
                    {/* Co-streamer Viewer count */}
                    <div
                      className="trubbel-sidebar-preview-costreamer-viewers"
                      style={{
                        fontSize: "1.1rem",
                        color: "inherit",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        flexShrink: 0
                      }}
                    >
                      {costreamer.stream && costreamer.stream.viewersCount != null ? [
                        <span
                          key="indicator"
                          className="trubbel-sidebar-preview-costreamer-online-indicator"
                          style={{
                            display: "inline-block",
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            backgroundColor: "#eb0400",
                            marginRight: "4px"
                          }}
                        />,
                        formatNumber(costreamer.stream.viewersCount)
                      ] : "offline"}
                    </div>
                  </div>
                );
              })}
              {/* Remaining Co-streamers Summary */}
              {costreamersRemaining > 0 && (
                <div
                  className="trubbel-sidebar-preview-costreamers-remaining"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "1.1rem"
                  }}
                >
                  <div style={{ flexGrow: 1, fontWeight: 600 }}>
                    + {formatNumber(costreamersRemaining)} more co-streamer{costreamersRemaining !== 1 ? "s" : ""}
                  </div>
                  {costreamersRemainingViewers > 0 && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        flexShrink: 0
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          backgroundColor: "#eb0400",
                          marginRight: "4px"
                        }}
                      />
                      {formatNumber(costreamersRemainingViewers)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sponsorship Preview */}
        {showSponsorship && sponsorshipData && sponsorshipData.brandName && (
          <div
            className="trubbel-sidebar-preview-sponsorship"
            style={{
              padding: "4px 8px",
              fontSize: "1.2rem",
              color: `${this.settings.get("addon.trubbel.twilight.sidebar.preview.tooltip_text")}`,
              width: "100%",
              boxSizing: "border-box",
              overflow: "hidden",
              borderTop: `1px solid ${this.settings.get("addon.trubbel.twilight.sidebar.preview.tooltip_border")}`,
              display: "flex",
              alignItems: "center"
            }}
          >
            <img
              src={sponsorshipData.brandLogoDarkMode}
              alt={sponsorshipData.brandName}
              className="trubbel-sponsorship-logo"
              style={{
                height: "1.3rem",
                width: "auto",
                maxWidth: "2rem",
                marginRight: "6px",
                flexShrink: 0,
                objectFit: "contain"
              }}
            />
            Sponsored by {sponsorshipData.brandName}
          </div>
        )}

        {/* Watch Streak Preview */}
        {showWatchStreak && watchStreakData && (
          <div
            className="trubbel-sidebar-preview-watchstreak"
            style={{
              padding: "4px 8px",
              fontSize: "1.2rem",
              color: `${this.settings.get("addon.trubbel.twilight.sidebar.preview.tooltip_text")}`,
              width: "100%",
              boxSizing: "border-box",
              overflow: "hidden",
              borderTop: `1px solid ${this.settings.get("addon.trubbel.twilight.sidebar.preview.tooltip_border")}`,
              display: "flex",
              alignItems: "center"
            }}
          >
            <svg
              viewBox="0 0 18 18"
              fill="none"
              width="14"
              height="14"
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              style={{
                flexShrink: 0,
                marginRight: "6px"
              }}
            >
              <path
                fill-rule="evenodd"
                d="M11 4.5L9 2L4.80069 6.8992C3.63871 8.25484 3 9.98143 3 11.7669C3 15.2094 5.79065 18 9.23308 18H10.8803C14.2601 18 17 15.2601 17 11.8803C17 10.0192 16.3475 8.21702 15.1561 6.78728L12 3L11 4.5ZM6.3192 8.20078L9 5L11 7.5L12 6L13.6196 8.06765C14.5115 9.13795 15 10.4871 15 11.8803C15 13.965 13.4516 15.688 11.4421 15.962C11.7975 15.4931 12 14.9133 12 14.3028C12 13.7831 11.8231 13.2789 11.4985 12.8731L10 11L8.50148 12.8731C8.17686 13.2789 8 13.7831 8 14.3028C8 14.9057 8.19744 15.4786 8.5446 15.9443C6.53418 15.6155 5 13.8704 5 11.7669C5 10.4589 5.46792 9.19394 6.3192 8.20078Z"
                clip-rule="evenodd"
                fill="#FFB31A"
              />
            </svg>
            Watch Streak {formatNumber(watchStreakData.value)}
          </div>
        )}
      </div>
    );

    document.body.appendChild(this.previewPopup);
    this.positionPreview(card);

    if (showUptime && this.currentUptimeData) {
      this.uptimeUpdateInterval = setInterval(this.updateUptimeDisplay, 1000);
    }

    on(document, "keydown", this.handleKeyDown = (e) => {
      if (e.key === "Escape" && this.previewPopup) {
        this.hidePreview();
      }
    });

    if (this.shiftHeld) this.lockPreview();
  }

  hidePreview() {
    this.releaseLock();

    if (this.previewPopup) {
      this.previewPopup.remove();
      this.previewPopup = null;

      if (this.handleKeyDown) {
        off(document, "keydown", this.handleKeyDown);
        this.handleKeyDown = null;
      }
    }

    if (this.uptimeUpdateInterval) {
      clearInterval(this.uptimeUpdateInterval);
      this.uptimeUpdateInterval = null;
    }

    this.currentUptimeData = null;
    this.currentHoverCard = null;
    this.currentLogin = null;
  }

  clearSidebar() {
    this.clearHoverTimeout();
    this.clearPrefetchTimeout();
    this.hoverCard = null;

    if (!this.locked) this.hidePreview();
  }
}