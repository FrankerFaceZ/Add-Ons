import { isIntl } from "../../../utilities/format";
import MODERATED_CHANNELS from "../../../utilities/graphql/moderated-channels.gql";

const { createElement, setChildren } = FrankerFaceZ.utilities.dom;
const { get } = FrankerFaceZ.utilities.object;
const { Tooltip } = FrankerFaceZ.utilities.tooltip;

export class ModeratedChannels {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.router = parent.router;
    this.site = parent.site;
    this.log = parent.log;

    this.isActive = false;
    this.buttonElement = null;
    this.tooltip = null;

    this.edges = null;
    this.liveCount = 0;
    this.loadError = false;
    this.loadPromise = null;

    this.CACHE_KEY = "addon.trubbel.twilight.moderator.channels_cache";
    this.CACHE_LOCK_KEY = "addon.trubbel.twilight.moderator.channels_lock";
    this.isMaster = false;
    this.checkInterval = null;

    this.boundHandleProviderChange = null;
  }

  initialize() {
    const enabled = this.settings.get("addon.trubbel.twilight.moderator.channels");
    if (enabled) this.enable();
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.log.info("[ModeratedChannels] Enabling");
      this.enable();
    } else {
      this.disable();
    }
  }

  enable() {
    if (this.isActive) return;

    const excludedDomains = ["clips.twitch.tv", "dashboard.twitch.tv"];
    if (excludedDomains.includes(this.router?.domain)) {
      this.log.info("[ModeratedChannels] Not available on domain:", this.router.domain);
      return;
    }

    if (this.router?.location?.startsWith("/moderator")) {
      this.log.info("[ModeratedChannels] Not available on moderator pages");
      return;
    }

    const popoutRoutes = this.site.constructor.POPOUT_ROUTES;
    if (popoutRoutes.includes(this.router?.current?.name)) {
      this.log.info("[ModeratedChannels] Not available in popout pages");
      return;
    }

    this.log.info("[ModeratedChannels] Setting up");
    this.isActive = true;

    this.boundHandleProviderChange = this.handleProviderChange.bind(this);
    this.settings.provider.on("changed", this.boundHandleProviderChange);

    this.showButton();

    this.loadFromCache();

    this.checkLiveChannels();
    this.checkInterval = setInterval(() => this.checkLiveChannels(), 5 * 60 * 1000);
  }

  disable() {
    if (!this.isActive) return;

    this.log.info("[ModeratedChannels] Disabling");

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    if (this.boundHandleProviderChange) {
      this.settings.provider.off("changed", this.boundHandleProviderChange);
      this.boundHandleProviderChange = null;
    }

    if (this.isMaster) {
      this.settings.provider.delete(this.CACHE_LOCK_KEY);
      this.isMaster = false;
    }

    this.hideButton();
    this.isActive = false;
    this.edges = null;
    this.liveCount = 0;
    this.loadError = false;
    this.loadPromise = null;
  }

  showButton() {
    const searchContainer = document.querySelector(".top-nav__prime");
    if (!searchContainer || this.buttonElement) return;

    this.buttonElement = this.createButtonElement();
    searchContainer.parentNode.insertBefore(this.buttonElement, searchContainer);

    const button = this.buttonElement.querySelector("[data-a-target='mod-channels-popup-button']");
    this.setupTooltip(button);
  }

  hideButton() {
    if (this.tooltip) {
      this.tooltip.destroy();
      this.tooltip = null;
    }
    if (this.buttonElement?.parentNode) {
      this.buttonElement.parentNode.removeChild(this.buttonElement);
    }
    this.buttonElement = null;
  }

  setupTooltip(button) {
    if (!button) return;

    const parent = document.fullscreenElement || document.body.querySelector("#root>div") || document.body;

    this.tooltip = new Tooltip(parent, button, {
      logger: this.log,
      live: false,
      html: true,
      interactive: true,

      delayShow: 100,
      delayHide: 150,

      tooltipClass: "ffz-metadata-balloon ffz-balloon ffz-balloon--lg tw-block tw-border tw-elevation-2 tw-border-radius-medium tw-c-background-base tw-c-text-base",
      arrowClass: "ffz-balloon__tail tw-overflow-hidden tw-absolute",
      arrowInner: "ffz-balloon__tail-symbol tw-border-t tw-border-r tw-border-b tw-border-l tw-border-radius-small tw-c-background-base tw-absolute",
      innerClass: "tw-block",

      popper: {
        placement: "bottom-end",
        modifiers: {
          preventOverflow: { boundariesElement: parent },
          flip: { behavior: ["bottom", "top"] }
        }
      },

      content: () => this.buildContent()
    });
  }

  createButtonElement() {
    return (
      <div style={{
        flexGrow: 0,
        flexShrink: 0,
        marginInline: "4px",
        alignSelf: "center",
        flexWrap: "nowrap",
        position: "relative"
      }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div style={{ position: "relative", display: "inline-flex" }}>
            <button
              data-a-target="mod-channels-popup-button"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                verticalAlign: "middle",
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
              onClick={() => this.handleClick()}
              onAuxClick={(e) => this.handleAuxClick(e)}
            >
              <div style={{
                width: "var(--button-icon-size-default, 20px)",
                height: "var(--button-icon-size-default, 20px)",
                pointerEvents: "none"
              }}>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  focusable="false"
                  aria-hidden="true"
                  role="presentation"
                  style={{ height: "2rem", width: "2rem", fill: "currentColor" }}
                >
                  <path
                    fillRule="evenodd"
                    d="M15.504 2H22v6.496L10.35 17.35 12 19l-1.5 1.5-2.785-2.785L3.5 22 2 20.5l4.285-4.215L3.5 13.5 5 12l1.65 1.65L15.504 2Z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </button>
            <div
              className="trubbel-mod-channels-pill"
              style={{
                display: "none",
                pointerEvents: "none",
                position: "absolute",
                top: 0,
                right: 0,
                transform: "translate(calc(30% * var(--writing-dir-flip)), -30%)",
                fontSize: "var(--deprecated-font-size-7)"
              }}
            >
              <div style={{
                display: "inline-flex",
                position: "relative",
                background: "inherit",
                padding: "0.2rem",
                pointerEvents: "none",
                borderRadius: "var(--border-radius-rounded)",
                backgroundColor: "var(--color-background-base)"
              }}>
                <div
                  className="trubbel-mod-channels-pill__badge"
                  style={{
                    position: "relative",
                    padding: "0 0.6rem",
                    lineHeight: 1.6,
                    fontSize: "var(--font-size-5)",
                    fontVariantNumeric: "tabular-nums",
                    pointerEvents: "none",
                    borderRadius: "var(--border-radius-rounded)",
                    backgroundColor: "var(--color-background-number-badge)",
                    color: "var(--color-text-number-badge)"
                  }}
                >
                  0
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  updatePill() {
    if (!this.buttonElement) return;
    const pill = this.buttonElement.querySelector(".trubbel-mod-channels-pill");
    if (!pill) return;

    if (this.liveCount === 0) {
      pill.style.display = "none";
    } else {
      pill.style.display = "";
      const badge = pill.querySelector(".trubbel-mod-channels-pill__badge");
      if (badge) badge.textContent = String(this.liveCount);
    }
  }

  handleClick() {
    window.open("/moderator", "_blank");
  }

  handleAuxClick(e) {
    if (e.button === 1) {
      e.preventDefault();
      window.open("/moderator", "_blank");
    }
  }

  handleProviderChange(key, value, deleted) {
    if (key !== this.CACHE_KEY || deleted || !value) return;

    this.edges = value.edges;
    this.liveCount = value.liveCount;
    this.updatePill();
  }

  loadFromCache() {
    const cached = this.settings.provider.get(this.CACHE_KEY);
    if (!cached) return false;

    const age = Date.now() - cached.timestamp;
    if (age > 5 * 60 * 1000) return false;

    this.edges = cached.edges;
    this.liveCount = cached.liveCount;
    this.updatePill();
    return true;
  }

  shouldFetch() {
    if (this.isMaster) {
      this.settings.provider.set(this.CACHE_LOCK_KEY, Date.now());
      return true;
    }

    const lock = this.settings.provider.get(this.CACHE_LOCK_KEY);
    const isLocked = lock && (Date.now() - lock) < 6 * 60 * 1000;

    if (!isLocked) {
      this.isMaster = true;
      this.settings.provider.set(this.CACHE_LOCK_KEY, Date.now());
      return true;
    }

    return false;
  }

  checkLiveChannels() {
    if (!this.isActive) return;
    if (!this.shouldFetch()) return;
    this.loadChannels();
  }

  loadChannels() {
    this.loadPromise = (async () => {
      try {
        const apollo = this.site.children.apollo;
        if (!apollo) {
          this.log.warn("[ModeratedChannels] Apollo client not available");
          this.edges = [];
          return;
        }

        const edges = await this.fetchAllModeratedChannels(apollo);

        edges.sort((a, b) => {
          if (a.isLive !== b.isLive) return a.isLive ? -1 : 1;
          return (a.node?.displayName || "").localeCompare(b.node?.displayName || "");
        });

        this.edges = edges;
        this.liveCount = edges.filter(e => e.isLive).length;

        this.settings.provider.set(this.CACHE_KEY, {
          edges: this.edges,
          liveCount: this.liveCount,
          timestamp: Date.now()
        });

        this.updatePill();

      } catch (error) {
        this.log.error("[ModeratedChannels] Error loading channels:", error);
        this.edges = [];
        this.loadError = true;
      }
    })();

    return this.loadPromise;
  }

  async fetchAllModeratedChannels(apollo, cursor = null, edges = []) {
    const result = await apollo.client.query({
      query: MODERATED_CHANNELS,
      variables: { after: cursor, first: 100 },
      fetchPolicy: "network-only"
    });

    const data = result?.data;
    if (!data?.moderatedChannels?.edges) {
      this.log.warn("[ModeratedChannels] No data received");
      return edges;
    }

    const currentEdges = get("moderatedChannels.edges", data) || [];
    const hasNextPage = get("moderatedChannels.pageInfo.hasNextPage", data);
    const nextCursor = get("moderatedChannels.edges.@last.cursor", data);

    const allEdges = edges.concat(currentEdges);

    if (hasNextPage && nextCursor) {
      return this.fetchAllModeratedChannels(apollo, nextCursor, allEdges);
    }

    return allEdges;
  }

  buildContent() {
    if (this.edges) return this.renderEdges();
    return (this.loadPromise || this.loadChannels()).then(() => this.renderEdges());
  }

  renderEdges() {
    const container = createElement("div", {
      style: { width: "40rem", maxHeight: "40rem", overflowY: "auto" }
    });

    if (this.loadError) {
      setChildren(container, createElement("div", { className: "tw-pd-2 tw-align-center tw-c-text-error" }, "Failed to load moderated channels."));
      this.log.info("[ModeratedChannels] Failed to load moderated channels.");
      return container;
    }

    if (!this.edges.length) {
      setChildren(container, createElement("div", { className: "tw-pd-2 tw-align-center tw-c-text-alt-2" }, "You are not a moderator in any channels."));
      this.log.info("[ModeratedChannels] You are not a moderator in any channels.");
      return container;
    }

    const liveEdges = this.edges.filter(edge => edge.isLive);
    if (!liveEdges.length) {
      setChildren(container, createElement("div", { className: "tw-pd-2 tw-align-center tw-c-text-alt-2" }, "No moderated channels are currently live."));
      return container;
    }

    setChildren(container, liveEdges.map(edge => this.renderChannelRow(edge)));
    return container;
  }

  renderChannelRow(edge) {
    const node = edge.node;
    const isLive = edge.isLive;
    const title = node?.broadcastSettings?.title;
    const game = node?.broadcastSettings?.game?.displayName;
    const viewersCount = node?.stream?.viewersCount;
    const createdAt = node?.stream?.createdAt;
    const previewImageURL = node?.stream?.previewImageURL;
    const thumbSrc = isLive && previewImageURL ? previewImageURL : node.profileImageURL;

    return (
      <a
        className="tw-flex tw-pd-1 tw-border-b"
        href={`https://www.twitch.tv/moderator/${node.login}`}
        target="_blank"
        rel="noopener"
        style={{ textDecoration: "none", color: "inherit" }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--color-background-interactable-hover)"}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ""}
      >
        <div style={{ position: "relative", flexShrink: 0, width: "10rem", marginRight: "1rem" }}>
          <img
            src={thumbSrc}
            alt={node.displayName}
            style={{
              width: "100%",
              aspectRatio: "16 / 9",
              objectFit: "cover",
              objectPosition: "center",
              display: "block",
              borderRadius: "var(--border-radius-small)",
              backgroundColor: "var(--color-background-alt-2)"
            }}
          />
          {isLive && createdAt && (
            <div style={{
              position: "absolute",
              bottom: "0.4rem",
              left: "0.4rem",
              backgroundColor: "rgba(0,0,0,0.8)",
              color: "#fff",
              fontSize: "1.1rem",
              padding: "0.1rem 0.4rem",
              borderRadius: "2px",
              fontVariantNumeric: "tabular-nums"
            }}>
              {this.formatUptime(createdAt)}
            </div>
          )}
        </div>
        <div className="tw-flex-grow-1 tw-overflow-hidden tw-flex tw-flex-column tw-justify-content-center">
          <div className="tw-flex tw-align-items-center tw-justify-content-between">
            <span className="tw-semibold tw-ellipsis">
              {isIntl(node.displayName, node.login)}
            </span>
            {isLive && viewersCount != null && (
              <span
                className="tw-flex-shrink-0 tw-mg-l-1 tw-flex tw-align-items-center"
                style={{ color: "var(--color-text-accessible-red)", fontSize: "1.2rem", whiteSpace: "nowrap" }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  style={{ fill: "currentColor", marginRight: "0.3rem", flexShrink: 0 }}
                >
                  <path
                    fill-rule="evenodd"
                    d="M6 8a6 6 0 1 1 7.025 5.913l.012.036A3 3 0 0 0 15.883 16H17a4 4 0 0 1 4 4v2h-2v-2a2 2 0 0 0-2-2h-1.117A5 5 0 0 1 12 16.15 5 5 0 0 1 8.117 18H7a2 2 0 0 0-2 2v2H3v-2a4 4 0 0 1 4-4h1.117a3 3 0 0 0 2.846-2.051l.012-.036A6.002 6.002 0 0 1 6 8Zm6 4a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z"
                    clip-rule="evenodd"
                  />
                </svg>
                {viewersCount.toLocaleString()}
              </span>
            )}
          </div>
          {title && (
            <div className="tw-c-text-alt-2 tw-ellipsis" style={{ fontSize: "1.2rem", marginTop: "0.2rem" }} title={title}>
              {title}
            </div>
          )}
          {game && (
            <div className="tw-c-text-alt-2 tw-ellipsis" style={{ fontSize: "1.2rem", marginTop: "0.1rem" }}>
              {game}
            </div>
          )}
        </div>
      </a>
    );
  }

  formatUptime(createdAt) {
    const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    const pad = n => String(n).padStart(2, "0");
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }
}