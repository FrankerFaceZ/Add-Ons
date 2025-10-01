const { createElement, setChildren, on, off } = FrankerFaceZ.utilities.dom;

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
    this.currentContextMenu = null;
    this.currentClickHandler = null;
    this.currentKeyHandler = null;

    this._cardCache = new Map();
    this._lastDataHash = new Map();
    this._updateDebouncer = null;
    this._lastSortOrder = null;
    this._lastCardCount = 0;

    this.onRightClick = this.onRightClick.bind(this);
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

    // dirty "fix" for when hype trains etc sometimes does not display correctly and instead shows a placeholder
    this.style.set("pinned-placeholder", `
      .trubbel-pinned-channels-section .tw-placeholder-wrapper { display: none !important; }
    `);

    on(document, "contextmenu", this.onRightClick);
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

    off(document, "contextmenu", this.onRightClick);

    this.removeCurrentContextMenu();

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

  onRightClick(event) {
    if (!this.settings.get("addon.trubbel.twilight.sidebar_extended.pinned_channels")) {
      this.log.info("[Sidebar Pinned] Feature disabled, ignoring right-click");
      return;
    }

    if (!this.isActive) {
      this.log.info("[Sidebar Pinned] Not active, ignoring right-click");
      return;
    }

    if (event.ctrlKey || event.shiftKey) return;

    const sidebarCard = event.target.closest(".side-nav-card");
    if (!sidebarCard) return;

    let link = sidebarCard.querySelector("a[href^=\"/\"]");
    if (!link && sidebarCard.tagName === "A" && sidebarCard.href && sidebarCard.href.includes("/")) {
      link = sidebarCard;
    }

    if (!link) {
      this.log.info("[Sidebar Pinned] No link found in sidebar card");
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const href = link.getAttribute("href");
    const login = href.replace("/", "").split("?")[0];

    if (!login) {
      this.log.info("[Sidebar Pinned] No login found in card");
      return;
    }

    const isPinned = this.isChannelPinned(login);

    this.showContextMenu(event, login, isPinned);
  }

  showContextMenu(event, login, isPinned) {
    this.removeCurrentContextMenu();

    const menu = (
      <div
        className="trubbel-pinned-context-menu"
        style={{
          position: "fixed",
          top: `${event.clientY}px`,
          left: `${event.clientX}px`,
          background: "var(--color-background-base)",
          border: "1px solid var(--color-border-base)",
          borderRadius: "0.6rem",
          padding: "0.5rem 0",
          zIndex: 9999,
          minWidth: "150px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)"
        }}
      >
        <div
          className="trubbel-context-menu-item"
          style={{
            padding: "0.5rem 1rem",
            cursor: "pointer",
            fontSize: "1.3rem",
            color: "var(--color-text-base)",
            transition: "background-color 0.1s ease"
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = "var(--color-background-alt)"}
          onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
          onClick={() => {
            if (!isPinned) {
              this.log.info(`[Sidebar Pinned] Pinning channel: ${login}`);
              this.handlePinUnpin(login, true);
              this.removeCurrentContextMenu();
            } else if (isPinned) {
              this.log.info(`[Sidebar Pinned] Unpinning channel: ${login}`);
              this.handlePinUnpin(login, false);
              this.removeCurrentContextMenu();
            }
          }}
        >
          {isPinned ? "Unpin Channel" : "Pin Channel"}
        </div>
      </div>
    );

    document.body.appendChild(menu);

    this.currentContextMenu = menu;

    const removeMenu = (e) => {
      if (!menu.contains(e.target)) {
        this.removeCurrentContextMenu();
      }
    };

    const handleKeydown = (e) => {
      if (e.key === "Escape") {
        this.removeCurrentContextMenu();
      }
    };

    this.currentClickHandler = removeMenu;
    this.currentKeyHandler = handleKeydown;

    setTimeout(() => {
      on(document, "click", removeMenu);
      on(document, "keydown", handleKeydown);
    }, 0);
  }

  removeCurrentContextMenu() {
    if (this.currentContextMenu) {
      if (document.body.contains(this.currentContextMenu)) {
        document.body.removeChild(this.currentContextMenu);
      }
      this.currentContextMenu = null;
    }

    if (this.currentClickHandler) {
      off(document, "click", this.currentClickHandler);
      this.currentClickHandler = null;
    }

    if (this.currentKeyHandler) {
      off(document, "keydown", this.currentKeyHandler);
      this.currentKeyHandler = null;
    }
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

  createPinnedSection(isCollapsed) {
    if (isCollapsed) {
      // collapsed state
      return (
        <div
          aria-label="Pinned Channels"
          className="side-nav-section trubbel-pinned-channels-section"
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
          className="side-nav-section trubbel-pinned-channels-section"
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
            <p
              style={{
                color: "var(--color-text-alt-2)",
                lineHeight: "var(--line-height-body)",
                fontSize: "var(--font-size-base)"
              }}
            >
              Right-click to pin/unpin
            </p>
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

      const emptyMessage = (
        <div
          className="trubbel-pinned-empty"
          style={{
            padding: "1rem",
            textAlign: "center",
            color: "var(--color-text-alt-2)",
            fontSize: "1.3rem"
          }}
        >
          No pinned channels available
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

    setTimeout(() => {
      sortedCards.forEach(({ card, originalCard }) => {
        if (card && !card._trubbel_preview_added && this.parent.sidebarManager.previews &&
          this.settings.get("addon.trubbel.twilight.sidebar.preview")) {
          try {
            card._trubbel_original_card = originalCard;
            this.addPreviewEvents(card, originalCard);
            card._trubbel_preview_added = true;
          } catch (err) {
            this.log.error("[Sidebar Pinned] Error adding preview events after render:", err);
          }
        }
      });
    }, 0);
  }

  addPreviewEvents(card, originalCard) {
    const mouseEnterHandler = () => {
      if (!this.settings.get("addon.trubbel.twilight.sidebar.preview")) {
        return;
      }

      if (this.parent.sidebarManager.previews.hoverTimeout) {
        clearTimeout(this.parent.sidebarManager.previews.hoverTimeout);
      }

      const delay = this.settings.get("addon.trubbel.twilight.sidebar.preview.delay");

      if (delay > 0) {
        this.parent.sidebarManager.previews.hoverTimeout = setTimeout(() => {
          this.showPreviewWithCorrectPosition(card, originalCard);
        }, delay);
      } else {
        this.showPreviewWithCorrectPosition(card, originalCard);
      }
    };

    const mouseLeaveHandler = () => {
      if (this.parent.sidebarManager.previews.hoverTimeout) {
        clearTimeout(this.parent.sidebarManager.previews.hoverTimeout);
        this.parent.sidebarManager.previews.hoverTimeout = null;
      }
      this.parent.sidebarManager.previews.hidePreview();
    };

    on(card, "mouseenter", mouseEnterHandler);
    on(card, "mouseleave", mouseLeaveHandler);

    card._trubbel_mouseEnterHandler = mouseEnterHandler;
    card._trubbel_mouseLeaveHandler = mouseLeaveHandler;
  }

  // helper method to show preview with correct positioning
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
    if (this.pinnedSection) {
      const content = this.pinnedSection.querySelector(".trubbel-pinned-channels-content");
      if (content) {
        const emptyMessage = (
          <div
            className="trubbel-pinned-empty"
            style={{
              padding: "1rem",
              textAlign: "center",
              color: "var(--color-text-alt-2)",
              fontSize: "1.3rem"
            }}
          >
            No pinned channels
          </div>
        );
        setChildren(content, emptyMessage);
        this.log.info("[Sidebar Pinned] Pinned content cleared, empty message added");
      }
    }
  }

  clearPinnedSection() {
    if (this.pinnedSection) {
      this.pinnedSection.remove();
      this.pinnedSection = null;
      this.log.info("[Sidebar Pinned] Pinned section removed");
    }
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

      const cards = el.querySelectorAll(".trubbel-pinned-channel-card");
      cards.forEach(card => {
        if (card._trubbel_mouseEnterHandler) {
          off(card, "mouseenter", card._trubbel_mouseEnterHandler);
          delete card._trubbel_mouseEnterHandler;
        }
        if (card._trubbel_mouseLeaveHandler) {
          off(card, "mouseleave", card._trubbel_mouseLeaveHandler);
          delete card._trubbel_mouseLeaveHandler;
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