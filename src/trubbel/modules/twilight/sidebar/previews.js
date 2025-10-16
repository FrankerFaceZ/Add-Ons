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
    this.isActive = true;
  }

  disable() {
    if (!this.isActive) {
      this.log.info("[Sidebar Previews] Already inactive, skipping disable");
      return;
    }

    this.log.info("[Sidebar Previews] Disabling sidebar previews functionality");
    this.hidePreview();
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

    try {
      const cards = el.querySelectorAll(".side-nav-card");
      if (cards.length > 0) {
        for (const card of cards) {
          if (!card._stream_processed) {
            card._stream_processed = true;

            const mouseEnterHandler = () => {
              if (!this.settings.get("addon.trubbel.twilight.sidebar.preview")) {
                this.log.info("[Sidebar Preview] Preview disabled in settings");
                return;
              }

              if (this.hoverTimeout) {
                clearTimeout(this.hoverTimeout);
              }

              const delay = this.settings.get("addon.trubbel.twilight.sidebar.preview.delay");

              if (delay > 0) {
                this.hoverTimeout = setTimeout(() => {
                  this.showPreview(card);
                }, delay);
              } else {
                this.showPreview(card);
              }
            };

            const mouseLeaveHandler = () => {
              if (this.hoverTimeout) {
                clearTimeout(this.hoverTimeout);
                this.hoverTimeout = null;
              }

              this.hidePreview();
            };

            card._mouseEnterHandler = mouseEnterHandler;
            card._mouseLeaveHandler = mouseLeaveHandler;

            on(card, "mouseenter", mouseEnterHandler);
            on(card, "mouseleave", mouseLeaveHandler);
          }
        }
      }
      return true;
    } catch (err) {
      this.log.error("[Sidebar Preview] Error in updateSidebar:", err);
      return false;
    }
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

    this.currentHoverCard = card;

    const react = this.fine.getReactInstance(card);
    const props = react?.return?.return?.memoizedProps;

    if (!props || !props.userLogin) {
      this.log.error("[Sidebar Preview] Could not find userLogin in props");
      this.log.error("[Sidebar Preview] props:", props);
      return;
    }

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

    let uptimeData = null;
    let uptimeText = null;

    if (showUptime) {
      if (card._stream_meta === undefined) {
        card._stream_meta = null;
        this.twitch_data.getStreamMeta(null, props.userLogin).then(data => {
          card._stream_meta = data;
          this.currentUptimeData = data;
          this.updateUptimeDisplay();
          if (data && !this.uptimeUpdateInterval) {
            this.uptimeUpdateInterval = setInterval(this.updateUptimeDisplay, 1000);
          }
        }).catch(err => {
          this.log.error(`[Sidebar Preview] Failed to fetch uptime for ${props.userLogin}:`, err);
        });
      } else if (card._stream_meta) {
        uptimeData = card._stream_meta;
        uptimeText = this.calculateUptime(uptimeData.createdAt);
        this.currentUptimeData = uptimeData;
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

    this.hidePreview();

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

                  return {
                    background: "#bf94ff",
                    WebkitMaskImage: "url(https://static-cdn.jtvnw.net/c3-vg/leftnav/hype-train.svg)",
                    maskImage: "url(https://static-cdn.jtvnw.net/c3-vg/leftnav/hype-train.svg)"
                  };
                })()
              }}
            />
            {(() => {
              if (hypeTrainData.isAllTimeHighTrain) {
                if (hypeTrainData.isGoldenKappaTrain) return "Golden Kappa Train";
                if (hypeTrainData.isSharedTrain) return "Shared Hype Train";
                if (hypeTrainData.isTreasureTrain) return "Treasure Train";
                return "All-Time High Train";
              }

              if (hypeTrainData.isGoldenKappaTrain) return "Golden Kappa Train";
              if (hypeTrainData.isSharedTrain) return "Shared Hype Train";
              if (hypeTrainData.isTreasureTrain) return "Treasure Train";
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
      </div>
    );

    document.body.appendChild(this.previewPopup);
    this.positionPreview(card);

    if (showUptime && this.currentUptimeData) {
      this.uptimeUpdateInterval = setInterval(this.updateUptimeDisplay, 1000);
    }

    document.addEventListener("keydown", this.handleKeyDown = (e) => {
      if (e.key === "Escape" && this.previewPopup) {
        this.hidePreview();
      }
    });
  }

  hidePreview() {
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
  }

  clearSidebar(el) {
    try {
      const cards = el.querySelectorAll(".side-nav-card");
      if (cards.length > 0) {
        for (const card of cards) {
          if (card._stream_processed) {
            if (card._mouseEnterHandler) {
              off(card, "mouseenter", card._mouseEnterHandler);
              delete card._mouseEnterHandler;
            }

            if (card._mouseLeaveHandler) {
              off(card, "mouseleave", card._mouseLeaveHandler);
              delete card._mouseLeaveHandler;
            }

            delete card._stream_processed;
            delete card._stream_meta;
          }
        }
      }
    } catch (err) {
      this.log.error("[Sidebar Preview] Error in clearSidebar:", err);
    }

    this.hidePreview();
  }
}