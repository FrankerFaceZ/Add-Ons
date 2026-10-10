const { createElement, setChildren, on, off } = FrankerFaceZ.utilities.dom;

const PIN_ICON_FILLED = () => (
  <svg className="trubbel-pin-icon trubbel-pin-icon--filled" width="24" height="24" viewBox="0 0 24 24" focusable="false" aria-hidden="true" role="presentation">
    <path d="M16 4h2V2H6v2h2v5a3 3 0 0 0-3 3v4h14v-4a3 3 0 0 0-3-3V4Zm-3 14h-2v4h2v-4Z" />
  </svg>
);

const PIN_ICON_OUTLINE = () => (
  <svg className="trubbel-pin-icon trubbel-pin-icon--outline" width="24" height="24" viewBox="0 0 24 24" focusable="false" aria-hidden="true" role="presentation">
    <path
      fill-rule="evenodd"
      d="M18 4V2H6v2h2v5a3 3 0 0 0-3 3v4h14v-4a3 3 0 0 0-3-3V4h2Zm-1 10H7v-2a1 1 0 0 1 1-1h2V4h4v7h2a1 1 0 0 1 1 1v2Z"
      clip-rule="evenodd"
    />
    <path d="M13 18h-2v4h2v-4Z" />
  </svg>
);

export class SidebarPinned {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.router = parent.router;
    this.style = parent.style;
    this.fine = parent.fine;
    this.log = parent.log;

    this.isActive = false;

    this.pinnedSection = null;
    this.updateTimer = null;
    this.lastSidebarState = null;
    this.currentSidebarElement = null;
    this.currentReactProps = null;
    this.currentAddPopup = null
    this.pinButton = null;

    this._cardCache = new Map();
    this._lastDataHash = new Map();
    this._updateDebouncer = null;
    this._lastSortOrder = null;
    this._lastCardCount = 0;

    this.onPinButtonHover = this.onPinButtonHover.bind(this);
    this.onPinButtonLeave = this.onPinButtonLeave.bind(this);
    this.onPinButtonClick = this.onPinButtonClick.bind(this);

    this.updateSidebar = this.updateSidebar.bind(this);
    this.updatePinnedChannels = this.updatePinnedChannels.bind(this);
    this.clearSidebar = this.clearSidebar.bind(this);
    this.clearPinnedSection = this.clearPinnedSection.bind(this);
    this.handlePinUnpin = this.handlePinUnpin.bind(this);
    this.updateReactProps = this.updateReactProps.bind(this);
    this.enablePinnedChannels = this.enablePinnedChannels.bind(this);
    this.disablePinnedChannels = this.disablePinnedChannels.bind(this);
    this.debouncedUpdate = this.debouncedUpdate.bind(this);
    this.updateReactProperties = this.updateReactProperties.bind(this);
    this.showPreviewWithCorrectPosition = this.showPreviewWithCorrectPosition.bind(this);
    this.handlePinnedChannelClick = this.handlePinnedChannelClick.bind(this);
  }

  handlePinnedChannelClick(event) {
    event.preventDefault();
    event.stopPropagation();

    const link = event.currentTarget;
    const url = link.getAttribute("href");
    if (!url) {
      this.log.warn("[Sidebar Pinned] No URL found for navigation");
      return;
    }

    try {
      const userName = url.replace("/", "").split("?")[0];
      if (!userName) {
        this.log.warn("[Sidebar Pinned] Could not extract username from URL:", url);
        return;
      }

      this.router.navigate("user", { userName: userName, channelView: "Watch" });
    } catch (err) {
      this.log.error("[Sidebar Pinned] Error during navigation:", err);
      window.location.href = url;
    }
  }

  enable() {
    if (this.isActive) {
      this.log.info("[Sidebar Pinned] Already active, skipping enable");
      return;
    }

    this.log.info("[Sidebar Pinned] Enabling pinned channels functionality");
    this.enablePinnedChannels();
    this.isActive = true;
  }

  disable() {
    if (!this.isActive) {
      this.log.info("[Sidebar Pinned] Already inactive, skipping disable");
      return;
    }

    this.log.info("[Sidebar Pinned] Disabling pinned channels functionality");
    this.disablePinnedChannels();
    this.isActive = false;
  }

  updateReactProperties(clonedCard, originalCard) {
    if (!clonedCard || !originalCard) return;

    try {
      clonedCard._trubbel_original_card = originalCard;

      const accessor = this.fine.constructor.findAccessor(originalCard);
      if (accessor && originalCard[accessor]) {
        clonedCard[accessor] = originalCard[accessor];
      }

    } catch (err) {
      this.log.debug("[Sidebar Pinned] Error updating React properties:", err);
    }
  }

  debouncedUpdate() {
    if (this._updateDebouncer) {
      clearTimeout(this._updateDebouncer);
    }

    this._updateDebouncer = setTimeout(() => {
      if (this.currentSidebarElement) {
        this.updatePinnedChannels(this.currentSidebarElement);
      }
      this._updateDebouncer = null;
    }, 100);
  }

  generateDataHash(card) {
    const link = card.querySelector("a[href^=\"/\"]");
    if (!link) return null;

    const isOffline = card.querySelector(".side-nav-card__avatar--offline") !== null;
    const viewerCount = this.extractViewerCount(card);
    const title = card.querySelector("[data-a-target=\"side-nav-title\"]")?.textContent || "";
    const game = card.querySelector("[data-a-target=\"side-nav-game\"]")?.textContent || "";

    return `${isOffline}:${viewerCount}:${title}:${game}`;
  }

  hasCardDataChanged(login, card) {
    const currentHash = this.generateDataHash(card);
    const lastHash = this._lastDataHash.get(login);

    if (currentHash !== lastHash) {
      this._lastDataHash.set(login, currentHash);
      return true;
    }

    return false;
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.log.info("[Sidebar Pinned] Enabling pinned channels via setting change");
      if (!this.isActive) {
        this.enablePinnedChannels();
      }
      if (this.currentSidebarElement) {
        this.updateSidebar(this.currentSidebarElement);
      }
    } else {
      this.log.info("[Sidebar Pinned] Disabling pinned channels via setting change");
      this.disablePinnedChannels();
    }
  }

  enablePinnedChannels() {
    if (this.isActive) {
      this.log.info("[Sidebar Pinned] Already active, skipping enable");
      return;
    }

    this.style.set("pinned-placeholder", `
      .trubbel-pinned-channels-section .tw-placeholder-wrapper { display: none !important; }
    `);
    this.style.set("add-channel-btn", `
      .trubbel-add-channel-btn { color: var(--color-text-button-text); }
      .trubbel-add-channel-btn:hover { color: var(--color-text-alt-2); }
    `);
    this.style.set("pin-button", `
      a.side-nav-card__link:has(> .trubbel-pin-btn),
      a.side-nav-card:has(> .trubbel-pin-btn) { position: relative; }
      .trubbel-pin-btn {
        position: absolute;
        top: 2px;
        left: 2px;
        z-index: 2;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2rem;
        height: 2rem;
        padding: 0;
        border: 0;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.75);
        color: #fff;
        cursor: pointer;
      }
      .trubbel-pin-btn:hover { background: #9147ff; }
      .trubbel-pin-btn svg { width: 1.4rem; height: 1.4rem; fill: currentColor; display: block; pointer-events: none; }
      .side-nav--collapsed .trubbel-pin-btn { top: 0; left: 0; width: 1.6rem; height: 1.6rem; }
      .side-nav--collapsed .trubbel-pin-btn svg { width: 1.1rem; height: 1.1rem; }
      .trubbel-pin-btn .trubbel-pin-icon--filled { display: none; }
      .trubbel-pin-btn:hover .trubbel-pin-icon--outline { display: none; }
      .trubbel-pin-btn:hover .trubbel-pin-icon--filled { display: block; }
      .trubbel-pin-btn--pinned .trubbel-pin-icon--filled { display: block; }
      .trubbel-pin-btn--pinned .trubbel-pin-icon--outline { display: none; }
      .trubbel-pin-btn--pinned:hover .trubbel-pin-icon--filled { display: none; }
      .trubbel-pin-btn--pinned:hover .trubbel-pin-icon--outline { display: block; }
    `);

    this.registerListener();
    this.isActive = true;
  }

  disablePinnedChannels() {
    if (!this.isActive) {
      this.log.info("[Sidebar Pinned] Already inactive, skipping disable");
      return;
    }

    if (this.style.has("pinned-placeholder")) {
      this.style.delete("pinned-placeholder");
    }
    if (this.style.has("add-channel-btn")) this.style.delete("add-channel-btn");

    off(document, "mouseover", this.onPinButtonHover);
    off(document, "mouseout", this.onPinButtonLeave);
    this.removePinButton();
    if (this.style.has("pin-button")) this.style.delete("pin-button");

    this.removeAddPopup()

    this._cardCache.clear();
    this._lastDataHash.clear();

    const existingSections = document.querySelectorAll(".trubbel-pinned-channels-section");
    existingSections.forEach(section => section.remove());

    this.pinnedSection = null;
    this.lastSidebarState = null;
    this.currentSidebarElement = null;
    this.currentReactProps = null;

    this.isActive = false;
  }

  registerListener() {
    off(document, "mouseover", this.onPinButtonHover);
    off(document, "mouseout", this.onPinButtonLeave);
    this.removePinButton();

    on(document, "mouseover", this.onPinButtonHover);
    on(document, "mouseout", this.onPinButtonLeave);
  }

  getPinButtonLink(target) {
    const link = target?.closest?.("a.side-nav-card__link, a.side-nav-card");
    if (!link || !link.closest(".side-nav")) return null;

    const href = link.getAttribute("href");
    if (!href || !href.startsWith("/") || href.includes("/directory/")) return null;

    return link;
  }

  getPinButton() {
    if (this.pinButton) return this.pinButton;

    const btn = (
      <button type="button" className="trubbel-pin-btn ffz-tooltip">
        {PIN_ICON_OUTLINE()}
        {PIN_ICON_FILLED()}
      </button>
    );

    on(btn, "click", this.onPinButtonClick);
    on(btn, "mousedown", e => e.stopPropagation());

    this.pinButton = btn;
    return btn;
  }

  updatePinButton(login) {
    const btn = this.pinButton;
    if (!btn) return;

    const pinned = this.isChannelPinned(login);
    const label = pinned ? "Unpin channel" : "Pin channel";

    btn.dataset.login = login;
    btn.classList.toggle("trubbel-pin-btn--pinned", pinned);

    if (btn.dataset.title !== label) {
      btn.dataset.title = label;
      btn.setAttribute("aria-label", label);
    }
  }

  removePinButton() {
    if (!this.pinButton) return;

    this.hidePinButtonTooltip();
    this.pinButton.remove();
  }

  hidePinButtonTooltip() {
    const tips = this.parent.resolve("tooltips")?.tips;
    const btn = this.pinButton;
    if (!tips || !btn) return;

    tips._exit(btn);

    const tip = btn[tips._accessor];
    if (tip?.visible) tips.hide(tip);
  }

  onPinButtonHover(event) {
    if (!this.settings.get("addon.trubbel.twilight.sidebar_extended.pinned_channels")) return;

    const link = this.getPinButtonLink(event.target);
    if (!link) return;

    const login = link.getAttribute("href").slice(1).split("?")[0].toLowerCase();
    if (!login) return;

    const btn = this.getPinButton();
    if (btn.parentNode !== link) link.appendChild(btn);
    this.updatePinButton(login);
  }

  onPinButtonLeave(event) {
    const link = this.pinButton?.parentNode;

    if (!link || !link.contains(event.target)) return;
    if (link.contains(event.relatedTarget)) return;

    this.removePinButton();
  }

  onPinButtonClick(event) {
    event.preventDefault();
    event.stopPropagation();

    this.hidePinButtonTooltip();

    const login = this.pinButton?.dataset.login;
    if (!login) return;

    this.handlePinUnpin(login, !this.isChannelPinned(login));
    this.updatePinButton(login);
  }

  updateReactProps(el) {
    if (!el) return null;
    try {
      const reactInstance = this.fine.getReactInstance(el);
      if (!reactInstance) return null;

      let current = reactInstance;
      const searchDepth = 20;

      for (let i = 0; i < searchDepth && current; i++) {
        if (current.child) {
          current = current.child;
          const props = current.memoizedProps || current.pendingProps;

          if (props && typeof props.hasOwnProperty === "function" &&
            props.hasOwnProperty("collapsed")) {
            this.log.info("[Sidebar Pinned] Found React props with collapsed state:", props.collapsed);
            return props;
          }

          if (props && Array.isArray(props.children)) {
            for (const child of props.children) {
              if (child && child.props &&
                typeof child.props.hasOwnProperty === "function" &&
                child.props.hasOwnProperty("collapsed")) {
                return child.props;
              }
            }
          }
        }
      }

      this.log.info("[Sidebar Pinned] No React props found");
      return null;
    } catch (err) {
      this.log.info("[Sidebar Pinned] Error getting React props:", err);
      return null;
    }
  }

  isSidebarCollapsed(el) {
    const reactProps = this.updateReactProps(el);
    if (reactProps && typeof reactProps.collapsed === "boolean") {
      return reactProps.collapsed;
    }
    this.log.info(`[Sidebar Pinned] isSidebarCollapsed props:`, reactProps);

    const cssCollapsed = el?.classList?.contains("side-nav--collapsed");
    this.log.info(`[Sidebar Pinned] isSidebarCollapsed classList:`, cssCollapsed);
    return cssCollapsed;
  }

  updateSidebar(el) {
    if (!this.settings.get("addon.trubbel.twilight.sidebar_extended.pinned_channels")) {
      this.log.info("[Sidebar Pinned] Feature disabled, returning early");
      if (this.isActive) {
        this.disablePinnedChannels();
      }
      return;
    }

    if (!this.isActive) {
      this.log.info("[Sidebar Pinned] Enabling right-click handler");
      this.enablePinnedChannels();
    }

    try {
      this.currentSidebarElement = el;
      const isCollapsed = this.isSidebarCollapsed(el);

      if (this.lastSidebarState !== isCollapsed) {
        this.lastSidebarState = isCollapsed;

        this._cardCache.clear();
        this._lastDataHash.clear();

        const existingSection = el.querySelector(".trubbel-pinned-channels-section");
        if (existingSection) {
          this.log.info("[Sidebar Pinned] Removing existing pinned section");
          existingSection.remove();
          this.pinnedSection = null;
        }
      }

      const followedSection = el.querySelector(".side-nav-section .followed-side-nav-header")?.closest(".side-nav-section");
      if (!followedSection) {
        this.log.info("[Sidebar Pinned] Could not find followed channels section");
        return;
      }

      let pinnedSection = el.querySelector(".trubbel-pinned-channels-section");

      if (!pinnedSection) {
        pinnedSection = this.createPinnedSection(isCollapsed);
        followedSection.parentNode.insertBefore(pinnedSection, followedSection);
        this.pinnedSection = pinnedSection;
      }

      this.debouncedUpdate();

    } catch (err) {
      this.log.error("[Sidebar Pinned] Error in updateSidebar:", err);
    }
  }

  showAddChannelPopup(anchorEl) {
    if (this.currentAddPopup) {
      this.removeAddPopup();
      return;
    }

    const rect = anchorEl.getBoundingClientRect();

    const inputEl = <input
      className="tw-border-radius-medium tw-font-size-6 tw-pd-x-1 tw-pd-y-05 ffz-input tw-flex-grow-1"
      type="text"
      placeholder="channel name"
      maxLength={25}
    />;

    const errorEl = <div
      style={{
        display: "none",
        marginTop: "0.5rem",
        color: "var(--color-text-error, #bf0000)",
        fontSize: "1.2rem"
      }}
    />;

    const sanitize = val =>
      val.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 25).toLowerCase();

    const doAdd = () => {
      const login = sanitize(inputEl.value ?? "");

      if (!login) {
        errorEl.textContent = "Enter a valid username (letters, numbers, underscores).";
        errorEl.style.display = "block";
        return;
      }

      if (this.isChannelPinned(login)) {
        errorEl.textContent = `${login} is already pinned.`;
        errorEl.style.display = "block";
        return;
      }

      this.handlePinUnpin(login, true);
      this.removeAddPopup();
    };

    on(inputEl, "input", () => {
      const clean = sanitize(inputEl.value);
      if (inputEl.value !== clean) inputEl.value = clean;
      errorEl.style.display = "none";
    });

    on(inputEl, "keydown", e => {
      if (e.key === "Enter") doAdd();
      if (e.key === "Escape") this.removeAddPopup();
    });

    const addBtn = <button className="tw-button tw-button--primary">
      <span className="tw-button__text">Add</span>
    </button>;
    on(addBtn, "click", doAdd);

    const closeBtn = <button className="tw-button tw-button--text">
      <span className="tw-button__text ffz-i-window-close" />
    </button>;
    on(closeBtn, "click", () => this.removeAddPopup());

    const popup = (
      <div
        className="trubbel-add-channel-popup"
        style={{
          position: "fixed",
          top: `${rect.bottom + 4}px`,
          left: `${rect.left}px`,
          background: "var(--color-background-base)",
          border: "1px solid var(--color-border-base)",
          borderRadius: "0.6rem",
          padding: "1rem",
          zIndex: 9999,
          minWidth: "22rem",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)"
        }}
      >
        <div
          className="tw-flex tw-align-items-center tw-pd-b-05 tw-border-b tw-mg-b-1"
          style={{ gap: "0.5rem" }}
        >
          <div className="tw-flex-grow-1" style={{ fontWeight: "var(--font-weight-semibold)", fontSize: "1.3rem" }}>
            Add Pinned Channel
          </div>
          {closeBtn}
        </div>
        <div className="tw-flex tw-align-items-center" style={{ gap: "0.5rem" }}>
          {inputEl}
          {addBtn}
        </div>
        {errorEl}
      </div>
    );

    document.body.appendChild(popup);
    this.currentAddPopup = popup;

    setTimeout(() => {
      this.currentAddClickHandler = e => {
        if (!popup.contains(e.target)) this.removeAddPopup();
      };
      this.currentAddKeyHandler = e => {
        if (e.key === "Escape") this.removeAddPopup();
      };
      on(document, "click", this.currentAddClickHandler);
      on(document, "keydown", this.currentAddKeyHandler);
      inputEl.focus();
    }, 0);
  }

  removeAddPopup() {
    if (this.currentAddPopup) {
      if (document.body.contains(this.currentAddPopup))
        document.body.removeChild(this.currentAddPopup);
      this.currentAddPopup = null;
    }
    if (this.currentAddClickHandler) {
      off(document, "click", this.currentAddClickHandler);
      this.currentAddClickHandler = null;
    }
    if (this.currentAddKeyHandler) {
      off(document, "keydown", this.currentAddKeyHandler);
      this.currentAddKeyHandler = null;
    }
  }

  createPinnedSection(isCollapsed) {
    if (isCollapsed) {
      // collapsed state
      return (
        <div
          aria-label="Pinned Channels"
          className="trubbel-pinned-channels-section"
          role="group"
        >
          <div
            data-tooltip-type="Pinned Channels"
            data-title="Pinned Channels"
            aria-label="Pinned Channels"
            title="Pinned Channels"
            style={{
              display: "inline-flex !important",
            }}
          >
            <div
              className="followed-side-nav-header"
              data-a-target="side-nav-header-collapsed"
              role="heading"
              aria-level="3"
              style={{
                color: "var(--color-text-alt-2)",
                display: "flex",
                flexWrap: "wrap",
                WebkitBoxPack: "center",
                justifyContent: "center",
                WebkitBoxAlign: "center",
                alignItems: "center",
                WebkitBoxFlex: "1",
                flexGrow: 1,
                paddingBlock: "8px",
              }}
            >
              <div
                className="tw-svg"
                style={{
                  display: "inline-flex",
                  WebkitBoxAlign: "center",
                  alignItems: "center",
                  width: "2rem",
                  height: "2rem",
                  fill: "var(--color-fill-current)",
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  role="img"
                >
                  <title>Pinned Channels</title>
                  <path d="M4.941 2h10v2H13v3a3 3 0 0 1 3 3v3H4v-3a3 3 0 0 1 3-3V4H4.941V2zM9 9H7a1 1 0 0 0-1 1v1h8v-1a1 1 0 0 0-1-1h-2V4H9v5z" />
                  <path d="M10.999 15h-2v3h2v-3z" />
                </svg>
              </div>
            </div>
          </div>
          <div
            className="trubbel-pinned-channels-content tw-transition-group"
            style={{
              position: "relative"
            }}
          />
        </div>
      );
    } else {
      // expanded state
      return (
        <div
          aria-label="Pinned Channels"
          className="trubbel-pinned-channels-section"
          role="group"
        >
          <div
            className="followed-side-nav-header followed-side-nav-header--expanded"
            style={{
              padding: "8px",
              paddingBlockStart: "4px"
            }}
          >
            <h3
              style={{
                fontSize: "var(--font-size-4)",
                fontWeight: "var(--font-weight-semibold)",
                lineHeight: "var(--line-height-body)"
              }}
            >
              Pinned Channels
            </h3>
          </div>
          <div
            className="trubbel-pinned-channels-content tw-transition-group"
            style={{
              position: "relative"
            }}
          />
        </div>
      );
    }
  }

  updatePinnedChannels(el) {
    if (!this.pinnedSection || !this.settings.get("addon.trubbel.twilight.sidebar_extended.pinned_channels")) {
      this.log.info("[Sidebar Pinned] No pinned section or feature disabled");
      return;
    }

    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }

    const pinnedList = this.getPinnedChannels();
    const showOffline = this.settings.get("addon.trubbel.twilight.sidebar_extended.pinned_channels.show_offline_channels");
    const sortOrder = this.settings.get("addon.trubbel.twilight.sidebar_extended.pinned_channels.sort");

    if (pinnedList.length === 0) {
      this.log.info("[Sidebar Pinned] No pinned channels, clearing content");
      this.clearPinnedContent();
      return;
    }

    try {
      const allCards = el.querySelectorAll(".side-nav-card:not(.trubbel-pinned-channel-card)");
      const pinnedCards = [];
      const needsUpdate = new Set();

      const pinnedLogins = pinnedList.map(login => login.toLowerCase());

      allCards.forEach((card, index) => {
        const link = card.querySelector("a[href^=\"/\"]");
        if (!link) {
          this.log.info(`[Sidebar Pinned] Card ${index} has no link, skipping`);
          return;
        }

        const href = link.getAttribute("href");
        const login = href.replace("/", "").split("?")[0].toLowerCase();

        if (pinnedLogins.includes(login)) {

          const isOffline = card.querySelector(".side-nav-card__avatar--offline") !== null;
          if (!showOffline && isOffline) {
            this.log.info(`[Sidebar Pinned] Skipping offline channel: ${login}`);
            return;
          }

          const cachedEntry = this._cardCache.get(login);
          const dataChanged = this.hasCardDataChanged(login, card);

          if (!cachedEntry || dataChanged) {
            needsUpdate.add(login);
          }

          let clonedCard = cachedEntry?.card;
          if (!clonedCard || dataChanged) {
            clonedCard = this.cloneChannelCard(card, login);
            if (clonedCard) {
              this._cardCache.set(login, {
                card: clonedCard,
                timestamp: Date.now(),
                originalCard: card
              });
            }
          } else {
            this.updateReactProperties(clonedCard, card);
          }

          if (clonedCard) {
            pinnedCards.push({
              card: clonedCard,
              login: login,
              originalCard: card,
              isLive: !isOffline,
              viewerCount: this.extractViewerCount(card)
            });
          } else {
            this.log.error(`[Sidebar Pinned] Failed to clone card for: ${login}`);
          }
        }
      });

      for (const [login, cacheEntry] of this._cardCache.entries()) {
        if (!pinnedLogins.includes(login)) {
          this._cardCache.delete(login);
          this._lastDataHash.delete(login);
        }
      }

      const sortedCards = this.sortPinnedCards(pinnedCards, sortOrder, pinnedLogins);

      if (needsUpdate.size > 0 || this._lastSortOrder !== sortOrder || this._lastCardCount !== sortedCards.length) {
        this.renderPinnedCards(sortedCards);
        this._lastSortOrder = sortOrder;
        this._lastCardCount = sortedCards.length;
      }

    } catch (err) {
      this.log.error("[Sidebar Pinned] Error updating pinned channels:", err);
    }
  }

  cloneChannelCard(originalCard, login) {
    try {
      const clonedCard = originalCard.cloneNode(true);

      clonedCard.querySelectorAll(".trubbel-pin-btn").forEach(btn => btn.remove());
      clonedCard.classList.add("trubbel-pinned-channel-card");
      clonedCard.classList.remove("side-nav-card--expanded");

      const link = clonedCard.querySelector("a[href^=\"/\"]");
      if (link) {
        link.setAttribute("data-a-id", `pinned-channel-${login}`);
        link.setAttribute("data-test-selector", "pinned-channel");

        on(link, "click", this.handlePinnedChannelClick);
        link._trubbel_click_handler = this.handlePinnedChannelClick;
      }

      clonedCard._trubbel_original_card = originalCard;
      return clonedCard;
    } catch (err) {
      this.log.error(`[Sidebar Pinned] Error cloning card for ${login}:`, err);
      return null;
    }
  }

  extractViewerCount(card) {
    try {
      const react = this.fine.getReactInstance(card);
      if (!react) return 0;

      const props = react?.return?.return?.memoizedProps;
      if (!props) return 0;

      let viewerCount = 0;
      if (props?.viewerCount) {
        viewerCount = props.viewerCount;
      } else if (props.metadataRight?.props?.stream?.viewersCount) {
        viewerCount = props.metadataRight.props.stream.viewersCount;
      } else if (props.tooltipContent?.props?.stream?.content?.viewersCount) {
        viewerCount = props.tooltipContent.props.stream.content.viewersCount;
      }

      return viewerCount;
    } catch (err) {
      this.log.debug(`[Sidebar Pinned] Error extracting viewer count from React:`, err);
      return 0;
    }
  }

  sortPinnedCards(cards, sortOrder, pinnedLogins) {
    switch (sortOrder) {
      case "alphabetical":
        return cards.sort((a, b) => a.login.localeCompare(b.login));

      case "viewers_desc":
        return cards.sort((a, b) => b.viewerCount - a.viewerCount);

      case "viewers_asc":
        return cards.sort((a, b) => a.viewerCount - b.viewerCount);

      case "manual":
      default:
        return cards.sort((a, b) => {
          const aIndex = pinnedLogins.indexOf(a.login);
          const bIndex = pinnedLogins.indexOf(b.login);
          return aIndex - bIndex;
        });
    }
  }

  renderPinnedCards(sortedCards) {
    const content = this.pinnedSection.querySelector(".trubbel-pinned-channels-content");
    if (!content) {
      this.log.info("[Sidebar Pinned] No content container found");
      return;
    }

    if (sortedCards.length === 0) {
      this.log.info("[Sidebar Pinned] No cards to render");

      const isCollapsed = this.isSidebarCollapsed(this.currentSidebarElement);
      if (isCollapsed) {
        this.log.info("[Sidebar Pinned] Sidebar is collapsed, not showing empty message");
        setChildren(content, null);
        return;
      }

      this.log.info("[Sidebar Pinned] Sidebar is expanded, showing empty message");

      const addBtn = <span
        className="trubbel-add-channel-btn"
        style={{
          display: "block",
          marginTop: "0.2rem",
          cursor: "pointer",
          fontSize: "1.3rem"
        }}
      >
        + Add a channel
      </span>;
      on(addBtn, "click", () => this.showAddChannelPopup(addBtn));

      const emptyMessage = (
        <div
          className="trubbel-pinned-empty"
          style={{
            paddingLeft: "1rem",
            color: "var(--color-text-alt-2)",
            fontSize: "1.3rem"
          }}
        >
          <div>Pinned channels are offline or hidden.</div>
          {addBtn}
        </div>
      );
      setChildren(content, emptyMessage);

      this.log.info("[Sidebar Pinned] Would show empty message");
      return;
    }

    const wrappers = sortedCards.map(({ card }) => (
      <div
        className="tw-transition"
        style={{
          transitionProperty: "transform, opacity",
          transitionTimingFunction: "ease"
        }}
        aria-hidden="false"
      >
        <div>
          {card}
        </div>
      </div>
    ));

    setChildren(content, wrappers);

    this.parent.emit("tooltips:cleanup");
  }

  showPreviewWithCorrectPosition(pinnedCard, originalCard) {
    const preview = this.parent.sidebarManager.previews;

    const pinnedRect = pinnedCard.getBoundingClientRect();

    const originalGetBoundingClientRect = originalCard.getBoundingClientRect;
    originalCard.getBoundingClientRect = () => pinnedRect;
    try {
      preview.showPreview(originalCard);

      if (preview.currentHoverCard === originalCard) {
        preview.currentHoverCard = pinnedCard;
      }
    } finally {
      originalCard.getBoundingClientRect = originalGetBoundingClientRect;
    }
  }

  isChannelPinned(login) {
    const pinnedList = this.getPinnedChannels();
    return pinnedList.some(pinnedLogin =>
      pinnedLogin.toLowerCase() === login.toLowerCase()
    );
  }

  handlePinUnpin(login, pin) {
    const pinnedList = this.getPinnedChannels();

    if (pin) {
      if (!this.isChannelPinned(login)) {
        const newList = [...pinnedList, login];
        this.setPinnedChannels(newList);
        this.log.info(`[Sidebar Pinned] Pinned channel: ${login}`);
      }
    } else {
      const newList = pinnedList.filter(pinnedLogin =>
        pinnedLogin.toLowerCase() !== login.toLowerCase()
      );
      this.setPinnedChannels(newList);
      this.log.info(`[Sidebar Pinned] Unpinned channel: ${login}`);

      this._cardCache.delete(login.toLowerCase());
      this._lastDataHash.delete(login.toLowerCase());
    }
  }

  getPinnedChannels() {
    try {
      const data = this.settings.provider.get("addon.trubbel.pinned.channels");
      return Array.isArray(data) ? data : [];
    } catch (error) {
      this.log.error("[Sidebar Pinned] Error reading pinned channels:", error);
      return [];
    }
  }

  setPinnedChannels(channels) {
    try {
      this.settings.provider.set("addon.trubbel.pinned.channels", channels);
      this.debouncedUpdate();
    } catch (error) {
      this.log.error("[Sidebar Pinned] Error storing pinned channels:", error);
    }
  }

  clearPinnedChannels() {
    try {
      this.settings.provider.delete("addon.trubbel.pinned.channels");
      this._cardCache.clear();
      this._lastDataHash.clear();
    } catch (error) {
      this.log.error("[Sidebar Pinned] Error clearing pinned channels:", error);
    }
  }

  clearPinnedContent() {
    if (!this.pinnedSection) return;
    const content = this.pinnedSection.querySelector(".trubbel-pinned-channels-content");
    if (!content) return;

    const addBtn = <span
      className="trubbel-add-channel-btn"
      style={{
        display: "block",
        marginTop: "0.2rem",
        cursor: "pointer",
        fontSize: "1.3rem"
      }}
    >
      + Add a channel
    </span>;
    on(addBtn, "click", () => this.showAddChannelPopup(addBtn));

    const el = (
      <div
        className="trubbel-pinned-empty"
        style={{
          paddingLeft: "1rem",
          color: "var(--color-text-alt-2)",
          fontSize: "1.3rem"
        }}
      >
        <div>No pinned channels yet.</div>
        {addBtn}
      </div>
    );

    setChildren(content, el);
  }

  clearPinnedSection() {
    if (this.pinnedSection) {
      this.pinnedSection.remove();
      this.pinnedSection = null;
      this.log.info("[Sidebar Pinned] Pinned section removed");
    }

    this._cardCache.clear();
    this._lastDataHash.clear();
    this._lastSortOrder = null;
    this._lastCardCount = 0;
  }

  clearSidebar(el) {
    try {
      const pinnedSection = el.querySelector(".trubbel-pinned-channels-section");
      if (pinnedSection) {
        pinnedSection.remove();
      }

      const pinnedLinks = el.querySelectorAll(".trubbel-pinned-channel-card a[href^=\"/\"]");
      pinnedLinks.forEach(link => {
        if (link._trubbel_click_handler) {
          off(link, "click", link._trubbel_click_handler);
          delete link._trubbel_click_handler;
        }
      });

      this.lastSidebarState = null;
      this.currentSidebarElement = null;
      this.currentReactProps = null;

    } catch (err) {
      this.log.error("[Sidebar Pinned] Error in clearSidebar:", err);
    }
  }
}