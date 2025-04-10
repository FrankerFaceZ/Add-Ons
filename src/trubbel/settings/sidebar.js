const { createElement, ManagedStyle } = FrankerFaceZ.utilities.dom;

export class SideBarPreview extends FrankerFaceZ.utilities.module.Module {
  constructor(...args) {
    super(...args);

    this.style = new ManagedStyle;

    this.inject("settings");
    this.inject("site.fine");
    this.inject("site.elemental");

    // Bind methods
    this.updateSidebar = this.updateSidebar.bind(this);
    this.showPreview = this.showPreview.bind(this);
    this.hidePreview = this.hidePreview.bind(this);
    this.isSidebarOnRight = this.isSidebarOnRight.bind(this);

    // Create preview container
    this.previewContainer = null;
    this.previewIframe = null;
    this.previewTitleContainer = null;
    this.currentHoverCard = null;
    this.hoverTimeout = null;

    // Sidebar - Left Navigation - Enable Stream Previews
    this.settings.add("addon.trubbel.sidebar.left-nav-preview", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Sidebar >> Left Navigation",
        title: "Enable Stream Previews",
        description: "Show previews when hovering over channels in the sidebar.\n\n**Note:** For this to work properly, make sure your browser has granted **Autoplay** and **Sound** permissions for `player.twitch.tv`.",
        component: "setting-check-box"
      },
      changed: val => {
        this.log.info("[Sidebar Preview] Stream Previews setting changed:", val);
        if (!val) this.hidePreview();
      }
    });

    // Sidebar - Left Navigation - Stream Preview Delay
    this.settings.add("addon.trubbel.sidebar.left-nav-preview.delay", {
      default: 500,
      ui: {
        sort: 1,
        path: "Add-Ons > Trubbel\u2019s Utilities > Sidebar >> Left Navigation",
        title: "Stream Preview Delay",
        description: "How long to hover before showing the preview (in milliseconds). Use `0` for no delay.",
        component: "setting-text-box",
        process(val) {
          const cleanVal = val.toString().replace(/[^\d]/g, "");
          const num = parseInt(cleanVal, 10);
          if (isNaN(num) || num < 0 || num > 5000) return 500;
          return num;
        }
      }
    });

    // Sidebar - Left Navigation - Stream Preview Size
    this.settings.add("addon.trubbel.sidebar.left-nav-preview.size", {
      default: "small",
      ui: {
        sort: 2,
        path: "Add-Ons > Trubbel\u2019s Utilities > Sidebar >> Left Navigation",
        title: "Stream Preview Size",
        description: "Choose the size of the channel preview.",
        component: "setting-select-box",
        data: [
          { value: "small", title: "Small (280x158)" },
          { value: "medium", title: "Medium (320x180)" },
          { value: "large", title: "Large (400x225)" },
          { value: "xlarge", title: "Extra Large (480x270)" }
        ]
      },
      changed: val => {
        this.log.info("[Sidebar Preview] Stream Preview Size setting changed:", val);
        this.updatePreviewSize();
      }
    });

    // Sidebar - Left Navigation - Enable Audio for Stream Previews
    this.settings.add("addon.trubbel.sidebar.left-nav-preview.audio", {
      default: false,
      ui: {
        sort: 3,
        path: "Add-Ons > Trubbel\u2019s Utilities > Sidebar >> Left Navigation",
        title: "Enable Audio for Stream Previews",
        description: "Please keep in mind that this is using your default volume for streams. Some streams may be loud.",
        component: "setting-check-box"
      }
    });

    // Sidebar - Left Navigation - Stream Preview Quality
    this.settings.add("addon.trubbel.sidebar.left-nav-preview.quality", {
      default: "160p30",
      requires: ["addon.trubbel.sidebar.left-nav-preview"],
      process(ctx, val) {
        if (!ctx.get("addon.trubbel.sidebar.left-nav-preview"))
          return false;
        return val;
      },
      ui: {
        sort: 4,
        path: "Add-Ons > Trubbel\u2019s Utilities > Sidebar >> Left Navigation",
        title: "Stream Preview Quality",
        component: "setting-select-box",
        data: [
          { title: "Auto", value: "auto" },
          { title: "Source", value: "chunked" },
          { title: "1080p60", value: "1080p60" },
          { title: "720p60", value: "720p60" },
          { title: "720p", value: "720p30" },
          { title: "480p", value: "480p30" },
          { title: "360p", value: "360p30" },
          { title: "160p", value: "160p30" }
        ]
      }
    });

    // Sidebar - Left Navigation - Show Stream Title
    this.settings.add("addon.trubbel.sidebar.left-nav-preview.show-title", {
      default: false,
      ui: {
        sort: 5,
        path: "Add-Ons > Trubbel\u2019s Utilities > Sidebar >> Left Navigation",
        title: "Show Stream Title",
        component: "setting-check-box"
      },
      changed: val => {
        this.log.info("[Sidebar Preview] Show Stream Title setting changed:", val);
        if (this.previewContainer && this.previewTitleContainer) {
          this.previewTitleContainer.style.display = val ? "block" : "none";
        }
      }
    });

    // Sidebar - Left Navigation - Show Stream Category
    this.settings.add("addon.trubbel.sidebar.left-nav-preview.show-category", {
      default: false,
      ui: {
        sort: 6,
        path: "Add-Ons > Trubbel\u2019s Utilities > Sidebar >> Left Navigation",
        title: "Show Stream Category",
        component: "setting-check-box"
      },
      changed: val => {
        this.log.info("[Sidebar Preview] Show Stream Category setting changed:", val);
        if (this.previewContainer && this.previewCategoryContainer) {
          this.previewCategoryContainer.style.display = val ? "block" : "none";
        }
      }
    });

    // Sidebar - Left Navigation - Show Viewer Count
    this.settings.add("addon.trubbel.sidebar.left-nav-preview.show-viewers", {
      default: false,
      ui: {
        sort: 7,
        path: "Add-Ons > Trubbel\u2019s Utilities > Sidebar >> Left Navigation",
        title: "Show Viewer Count",
        component: "setting-check-box"
      },
      changed: val => {
        this.log.info("[Sidebar Preview] Show Viewer Count setting changed:", val);
        if (this.previewContainer && this.previewViewerContainer) {
          this.previewViewerContainer.style.display = val ? "block" : "none";
        }
      }
    });

    // Sidebar - Left Navigation - Show Hype Train
    this.settings.add("addon.trubbel.sidebar.left-nav-preview.show-hypetrain", {
      default: false,
      ui: {
        sort: 8,
        path: "Add-Ons > Trubbel\u2019s Utilities > Sidebar >> Left Navigation",
        title: "Show Hype Train",
        component: "setting-check-box"
      },
      changed: val => {
        this.log.info("[Sidebar Preview] Show Hype Train setting changed:", val);
        if (this.previewContainer && this.previewHypeTrainContainer) {
          this.previewHypeTrainContainer.style.display = val ? "block" : "none";
        }
      }
    });

    // Sidebar - Left Navigation - Show Stream Guests
    this.settings.add("addon.trubbel.sidebar.left-nav-preview.show-guests", {
      default: false,
      ui: {
        sort: 9,
        path: "Add-Ons > Trubbel\u2019s Utilities > Sidebar >> Left Navigation",
        title: "Show Stream Guests",
        component: "setting-check-box"
      },
      changed: val => {
        this.log.info("[Sidebar Preview] Show Stream Guests setting changed:", val);
        if (this.previewContainer && this.previewGuestsContainer) {
          this.previewGuestsContainer.style.display = val ? "block" : "none";
        }
      }
    });

    // Sidebar - Left Navigation - Tooltip Background
    this.settings.add("addon.trubbel.sidebar.left-nav-preview.tooltip-background", {
      default: "#1f1f23",
      ui: {
        sort: 10,
        path: "Add-Ons > Trubbel\u2019s Utilities > Sidebar >> Left Navigation",
        title: "Tooltip Background",
        component: "setting-color-box",
				openUp: true
      },
      changed: () => this.updateCSS()
    });

    // Sidebar - Left Navigation - Tooltip Title
    this.settings.add("addon.trubbel.sidebar.left-nav-preview.tooltip-text1", {
      default: "#dedee3",
      ui: {
        sort: 11,
        path: "Add-Ons > Trubbel\u2019s Utilities > Sidebar >> Left Navigation",
        title: "Tooltip Title",
        component: "setting-color-box",
				openUp: true
      },
      changed: () => this.updateCSS()
    });

    // Sidebar - Left Navigation - Tooltip Category
    this.settings.add("addon.trubbel.sidebar.left-nav-preview.tooltip-text2", {
      default: "#adadb8",
      ui: {
        sort: 12,
        path: "Add-Ons > Trubbel\u2019s Utilities > Sidebar >> Left Navigation",
        title: "Tooltip Category",
        component: "setting-color-box",
				openUp: true
      },
      changed: () => this.updateCSS()
    });

    // Sidebar - Left Navigation - Tooltip Viewer Count
    this.settings.add("addon.trubbel.sidebar.left-nav-preview.tooltip-text3", {
      default: "#adadb8",
      ui: {
        sort: 13,
        path: "Add-Ons > Trubbel\u2019s Utilities > Sidebar >> Left Navigation",
        title: "Tooltip Viewer Count",
        component: "setting-color-box",
				openUp: true
      },
      changed: () => this.updateCSS()
    });

    // Sidebar - Left Navigation - Tooltip Hype Train
    this.settings.add("addon.trubbel.sidebar.left-nav-preview.tooltip-text4", {
      default: "#adadb8",
      ui: {
        sort: 14,
        path: "Add-Ons > Trubbel\u2019s Utilities > Sidebar >> Left Navigation",
        title: "Tooltip Hype Train",
        component: "setting-color-box",
				openUp: true
      },
      changed: () => this.updateCSS()
    });

    // Sidebar - Left Navigation - Tooltip Guests
    this.settings.add("addon.trubbel.sidebar.left-nav-preview.tooltip-text5", {
      default: "#adadb8",
      ui: {
        sort: 15,
        path: "Add-Ons > Trubbel\u2019s Utilities > Sidebar >> Left Navigation",
        title: "Tooltip Guests",
        component: "setting-color-box",
				openUp: true
      },
      changed: () => this.updateCSS()
    });

    // Sidebar - Left Navigation - Border
    this.settings.add("addon.trubbel.sidebar.left-nav-preview.border", {
      default: "#26262c",
      ui: {
        sort: 16,
        path: "Add-Ons > Trubbel\u2019s Utilities > Sidebar >> Left Navigation",
        title: "Border",
        component: "setting-color-box",
				openUp: true
      },
      changed: () => this.updateCSS()
    });

    // Sidebar - Left Navigation - Hide Native Tooltip
    this.settings.add("addon.trubbel.sidebar.left-nav-preview.hide-native-tooltip", {
      default: false,
      ui: {
        sort: 17,
        path: "Add-Ons > Trubbel\u2019s Utilities > Sidebar >> Left Navigation",
        title: "Hide Native Tooltip",
        component: "setting-check-box"
      },
      changed: () => this.updateCSS()
    });

    this.SideBar = this.elemental.define(
      "sidebar",
      ".side-bar-contents",
      null,
      null,
      0
    );
  }

  onEnable() {
    this.SideBar.on("mount", this.updateSidebar, this);
    this.SideBar.on("mutate", this.updateSidebar, this);
    this.SideBar.each(el => this.updateSidebar(el));
    this.createPreviewContainer();
    this.updateCSS();
  }

  updateSidebar(el) {
    if (!this.settings.get("addon.trubbel.sidebar.left-nav-preview")) return;
    try {
      // Find all streams in left side navigation
      const cards = el.querySelectorAll(".side-nav-card");
      if (cards.length > 0) {
        // Get each stream
        for (const card of cards) {
          // Make sure said stream isn't offline
          if (card.querySelector(".tw-channel-status-indicator")) {
            // Make sure said stream isn't already processed
            if (!card._stream_processed) {

              // Mark stream as processed
              card._stream_processed = true;

              card.addEventListener("mouseenter", () => {
                if (!this.settings.get("addon.trubbel.sidebar.left-nav-preview")) {
                  this.log.info("[Sidebar Preview] Stream Previews disabled in settings");
                  return;
                }

                // Clear any existing timeout
                if (this.hoverTimeout) {
                  clearTimeout(this.hoverTimeout);
                }

                // Set a timeout before showing the preview
                const delay = this.settings.get("addon.trubbel.sidebar.left-nav-preview.delay");

                if (delay > 0) {
                  this.hoverTimeout = setTimeout(() => {
                    this.showPreview(card);
                  }, delay);
                } else {
                  this.showPreview(card);
                }
              });

              card.addEventListener("mouseleave", () => {
                // Clear the timeout if we leave before it triggers
                if (this.hoverTimeout) {
                  clearTimeout(this.hoverTimeout);
                  this.hoverTimeout = null;
                }
                this.hidePreview();
              });
            }
          }
        }
      }
      return true;
    } catch (err) {
      this.log.error("[Sidebar Preview] Error in updateSidebar:", err);
      return false;
    }
  }

  // Detect sidebar position
  isSidebarOnRight() {
    // Try to find the sidebar element
    const sidebarEl = document.querySelector(".side-bar-contents, .side-nav");

    if (!sidebarEl) {
      this.log.warn("[Sidebar Preview] Could not find sidebar element");
      return false;
    }

    // Get the sidebar position
    const sidebarRect = sidebarEl.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const isOnRight = (viewportWidth - sidebarRect.right) < sidebarRect.left;
    return isOnRight;
  }

  // Create preview container
  createPreviewContainer() {
    if (!this.settings.get("addon.trubbel.sidebar.left-nav-preview")) return;
    if (this.previewContainer) return;

    this.previewContainer = createElement("div", {
      className: "trubbel-sidebar-preview"
    });

    // Create wrapper for the iframe
    const wrapper = createElement("div", {
      className: "trubbel-sidebar-preview-wrapper"
    });
    this.previewContainer.appendChild(wrapper);

    this.previewIframe = createElement("iframe");
    wrapper.appendChild(this.previewIframe);

    // Add title container
    this.previewTitleContainer = createElement("div", {
      className: "trubbel-sidebar-preview-title"
    });
    this.previewContainer.appendChild(this.previewTitleContainer);

    // Add category title container
    this.previewCategoryContainer = createElement("div", {
      className: "trubbel-sidebar-preview-category"
    });
    this.previewContainer.appendChild(this.previewCategoryContainer);

    // Add viewer title container
    this.previewViewerContainer = createElement("div", {
      className: "trubbel-sidebar-preview-viewers"
    });
    this.previewContainer.appendChild(this.previewViewerContainer);

    // Add hype train container
    this.previewHypeTrainContainer = createElement("div", {
      className: "trubbel-sidebar-preview-hypetrain"
    });
    this.previewContainer.appendChild(this.previewHypeTrainContainer);

    // Add guests container
    this.previewGuestsContainer = createElement("div", {
      className: "trubbel-sidebar-preview-guests"
    });
    this.previewContainer.appendChild(this.previewGuestsContainer);

    // Apply size class
    this.updatePreviewSize();

    // Apply title visibility
    const showTitle = this.settings.get("addon.trubbel.sidebar.left-nav-preview.show-title");
    this.previewTitleContainer.style.display = showTitle ? "block" : "none";

    // Apply category title visibility
    const showCategory = this.settings.get("addon.trubbel.sidebar.left-nav-preview.show-category");
    this.previewCategoryContainer.style.display = showCategory ? "block" : "none";

    // Apply viewer count visibility
    const showViewerCount = this.settings.get("addon.trubbel.sidebar.left-nav-preview.show-viewers");
    this.previewViewerContainer.style.display = showViewerCount ? "block" : "none";

    // Apply hype train visibility
    const showHypeTrain = this.settings.get("addon.trubbel.sidebar.left-nav-preview.show-hypetrain");
    this.previewHypeTrainContainer.style.display = showHypeTrain ? "block" : "none";

    // Apply guests visibility
    const showGuests = this.settings.get("addon.trubbel.sidebar.left-nav-preview.show-guests");
    this.previewGuestsContainer.style.display = showGuests ? "block" : "none";

    document.body.appendChild(this.previewContainer);
  }

  // Update preview size based on settings
  updatePreviewSize() {
    if (!this.settings.get("addon.trubbel.sidebar.left-nav-preview")) return;
    if (!this.previewContainer) return;

    // Remove any existing size classes
    this.previewContainer.classList.remove(
      "trubbel-sidebar-preview--small",
      "trubbel-sidebar-preview--medium",
      "trubbel-sidebar-preview--large",
      "trubbel-sidebar-preview--xlarge"
    );

    // Add the new size class
    const size = this.settings.get("addon.trubbel.sidebar.left-nav-preview.size");
    this.previewContainer.classList.add(`trubbel-sidebar-preview--${size}`);
  }

  showPreview(card) {
    if (!card || !this.previewContainer || !this.previewIframe) {
      this.log.error("[Sidebar Preview] Missing elements for preview");
      return;
    }

    // Always hide any existing preview first
    if (this.currentHoverCard && this.currentHoverCard !== card) {
      this.hidePreview();
    }

    this.currentHoverCard = card;

    // Get the React properties to extract the channel username
    const react = this.fine.getReactInstance(card);
    const props = react?.return?.return?.memoizedProps;

    if (!props || !props.userLogin) {
      this.log.error("[Sidebar Preview] Could not find userLogin in props:", props);
      return;
    }

    const quality = this.settings.get("addon.trubbel.sidebar.left-nav-preview.quality");
    const muted = !this.settings.get("addon.trubbel.sidebar.left-nav-preview.audio");

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

    const newSrc = `https://player.twitch.tv/?${params}`;
    this.previewIframe.src = newSrc;

    // Extract stream title if available and setting is enabled
    if (this.settings.get("addon.trubbel.sidebar.left-nav-preview.show-title")) {
      let streamTitle = "";

      // Try to extract title from various props paths
      if (props.metadataRight?.props?.stream?.broadcaster?.broadcastSettings?.title) {
        streamTitle = props.metadataRight?.props?.stream?.broadcaster?.broadcastSettings?.title;
      } else if (props.tooltipContent?.props?.stream?.content?.broadcaster?.broadcastSettings?.title) {
        streamTitle = props.tooltipContent?.props?.stream?.content?.broadcaster?.broadcastSettings?.title;
      } else if (props.tooltipContent?.props?.stream?.user?.broadcastSettings?.title) {
        streamTitle = props.tooltipContent?.props?.stream?.user?.broadcastSettings?.title;
      }

      // Set title in the container
      if (streamTitle) {
        this.previewTitleContainer.textContent = streamTitle;
        this.previewTitleContainer.style.display = "block";
      } else {
        // this.previewTitleContainer.textContent = `${props.userLogin}'s Stream`;
        this.previewTitleContainer.textContent = `${props.avatarAlt}'s Stream`;
        this.previewTitleContainer.style.display = "block";
      }
    } else {
      this.previewTitleContainer.style.display = "none";
    }

    // Extract category name if available and setting is enabled
    if (this.settings.get("addon.trubbel.sidebar.left-nav-preview.show-category")) {
      let categoryName = "";

      // Try to extract category name from various props paths
      if (props?.metadataLeft) {
        categoryName = props?.metadataLeft;
      } else if (props.metadataRight?.props?.stream?.game?.displayName) {
        categoryName = props.metadataRight?.props?.stream?.game?.displayName;
      } else if (props.tooltipContent?.props?.stream?.content?.game?.displayName) {
        categoryName = props.tooltipContent?.props?.stream?.content?.game?.displayName;
      }

      // Set category in the container
      if (categoryName) {
        this.previewCategoryContainer.textContent = categoryName;
        this.previewCategoryContainer.style.display = "block";
      } else {
        this.previewCategoryContainer.textContent = "";
        this.previewCategoryContainer.style.display = "none";
      }
    } else {
      this.previewCategoryContainer.style.display = "none";
    }

    // Extract viewers if available and setting is enabled
    if (this.settings.get("addon.trubbel.sidebar.left-nav-preview.show-viewers")) {
      let viewerCount = "";

      // Try to extract viewer count
      if (props?.viewerCount) {
        viewerCount = props?.viewerCount;
      } else if (props.metadataRight?.props?.stream?.viewersCount) {
        viewerCount = props.metadataRight?.props?.stream?.viewersCount;
      } else if (props.tooltipContent?.props?.stream?.content?.viewersCount) {
        viewerCount = props.tooltipContent?.props?.stream?.content?.viewersCount;
      }

      // Set viewer count in the container
      if (viewerCount) {
        this.previewViewerContainer.textContent = this.resolve("i18n").formatNumber(viewerCount) + " viewers";
        this.previewViewerContainer.style.display = "block";
      } else {
        this.previewViewerContainer.textContent = "";
        this.previewViewerContainer.style.display = "none";
      }
    } else {
      this.previewViewerContainer.style.display = "none";
    }

    // Extract hype train info if available and setting is enabled
    if (this.settings.get("addon.trubbel.sidebar.left-nav-preview.show-hypetrain")) {

      // Try to extract hype train data
      if (props?.activeHypeTrain?.hypeTrainSideNavChannel) {
        const hypeTrainData = props.activeHypeTrain.hypeTrainSideNavChannel;

        if (hypeTrainData) {
          const level = hypeTrainData.level || 1;

          // Instead of using innerHTML
          while (this.previewHypeTrainContainer.firstChild) {
            this.previewHypeTrainContainer.removeChild(this.previewHypeTrainContainer.firstChild);
          }

          // Create the icon element
          const iconElement = createElement("span", {
            className: "trubbel-hype-train-icon"
          });

          // Determine the type of hype train and apply the appropriate class
          if (hypeTrainData.isGoldenKappaTrain) {
            iconElement.classList.add("trubbel-hype-train-golden");
            this.previewHypeTrainContainer.appendChild(iconElement);
            this.previewHypeTrainContainer.appendChild(document.createTextNode(`Golden Kappa Train • Level ${level}`));
          } else if (hypeTrainData.isAllTimeHighTrain) {
            iconElement.classList.add("trubbel-hype-train-alltime");
            this.previewHypeTrainContainer.appendChild(iconElement);
            this.previewHypeTrainContainer.appendChild(document.createTextNode(`All-Time High Train • Level ${level}`));
          } else {
            // Regular hype train
            iconElement.classList.add("trubbel-hype-train-regular");
            this.previewHypeTrainContainer.appendChild(iconElement);
            this.previewHypeTrainContainer.appendChild(document.createTextNode(`Hype Train • Level ${level}`));
          }
          this.previewHypeTrainContainer.style.display = "block";
        } else {
          while (this.previewHypeTrainContainer.firstChild) {
            this.previewHypeTrainContainer.removeChild(this.previewHypeTrainContainer.firstChild);
          }
          this.previewHypeTrainContainer.style.display = "none";
        }
      } else {
        while (this.previewHypeTrainContainer.firstChild) {
          this.previewHypeTrainContainer.removeChild(this.previewHypeTrainContainer.firstChild);
        }
        this.previewHypeTrainContainer.style.display = "none";
      }
    } else {
      this.previewHypeTrainContainer.style.display = "none";
    }

    // Extract guests if available and setting is enabled
    if (this.settings.get("addon.trubbel.sidebar.left-nav-preview.show-guests")) {

      // Clear the guests container first
      while (this.previewGuestsContainer.firstChild) {
        this.previewGuestsContainer.removeChild(this.previewGuestsContainer.firstChild);
      }

      // Try to extract guests data
      const guests = props?.tooltipContent?.props?.guests || [];

      if (guests && guests.length > 0) {

        // Create the guests list
        const guestsListElement = createElement("div", {
          className: "trubbel-sidebar-preview-guests-list"
        });

        // Add each guest
        guests.forEach(guest => {
          // Create guest item container
          const guestItem = createElement("div", {
            className: "trubbel-sidebar-preview-guest-item"
          });

          // Create avatar container
          const avatarContainer = createElement("div", {
            className: "trubbel-sidebar-preview-guest-avatar"
          });

          // Add border-color, using default #9147ff if primaryColorHex is not available
          const borderColor = guest.primaryColorHex ? `#${guest.primaryColorHex}` : "#9147ff";
          avatarContainer.style.setProperty("--avatar-border-color", borderColor);

          // Create avatar image
          const avatarImg = createElement("img", {
            src: guest.profileImageURL,
            alt: guest.displayName
          });
          avatarContainer.appendChild(avatarImg);

          // Create guest name element
          const nameElement = createElement("div", {
            className: "trubbel-sidebar-preview-guest-name"
          });

          const displayName = guest.displayName;
          const login = guest.login;
          const username = displayName.toLowerCase() !== login ? `${displayName} (${login})` : displayName;
          nameElement.textContent = username;

          // Create viewer count element
          const viewerCountElement = createElement("div", {
            className: "trubbel-sidebar-preview-guest-viewers"
          });

          // Add viewer count if streaming
          if (guest.stream && guest.stream.viewersCount) {
            const viewerCount = this.resolve("i18n").formatNumber(guest.stream.viewersCount);
            viewerCountElement.textContent = viewerCount;

            // Add online indicator
            const indicator = createElement("span", {
              className: "trubbel-sidebar-preview-guest-online-indicator"
            });
            viewerCountElement.insertBefore(indicator, viewerCountElement.firstChild);
          } else {
            viewerCountElement.textContent = "offline";
          }

          // Assemble the guest item
          guestItem.appendChild(avatarContainer);
          guestItem.appendChild(nameElement);
          guestItem.appendChild(viewerCountElement);

          // Add to the guests list
          guestsListElement.appendChild(guestItem);
        });

        this.previewGuestsContainer.appendChild(guestsListElement);
        this.previewGuestsContainer.style.display = "block";
      } else {
        this.previewGuestsContainer.style.display = "none";
      }
    } else {
      this.previewGuestsContainer.style.display = "none";
    }

    // Position the preview relative to the card
    const cardRect = card.getBoundingClientRect();
    const previewRect = this.previewContainer.getBoundingClientRect();
    const previewHeight = previewRect.height;

    // Check if the sidebar is on the right
    const isOnRight = this.isSidebarOnRight();

    // Center the preview vertically next to the card
    let top = cardRect.top + (cardRect.height / 2) - (previewHeight / 2);

    // Get sidebar element
    const sidebarEl = document.querySelector(".side-bar-contents, .side-nav");
    const sidebarRect = sidebarEl.getBoundingClientRect();

    // Position horizontally based on sidebar position with offset
    if (isOnRight) {
      // If sidebar is on right, position preview to the left of the sidebar with offset
      this.previewContainer.style.left = "auto";
      this.previewContainer.style.right = `${window.innerWidth - sidebarRect.left + 10}px`;
    } else {
      // If sidebar is on left, position preview to the right of it with offset
      this.previewContainer.style.right = "auto";
      this.previewContainer.style.left = `${sidebarRect.right + 10}px`;
    }

    // Make sure the preview stays within the viewport vertically
    const viewportHeight = window.innerHeight;
    if (top < 10) top = 10;
    if (top + previewHeight > viewportHeight - 10) {
      top = viewportHeight - previewHeight - 10;
    }

    this.previewContainer.style.top = `${top}px`;
    this.previewContainer.classList.add("active");
  }

  hidePreview() {
    if (!this.previewContainer) return;
    this.previewContainer.classList.remove("active");

    // Clear iframe source immediately before hiding
    if (this.previewIframe) {
      this.previewIframe.src = "about:blank";
    }

    this.currentHoverCard = null;
  }

  updateCSS() {
    // Sidebar - Left Navigation - Enable Stream Previews
    if (this.settings.get("addon.trubbel.sidebar.left-nav-preview")) {
      this.style.set("left-nav-preview", `
        .trubbel-sidebar-preview {
          position: fixed;
          z-index: 9999;
          background-color: ${this.settings.get("addon.trubbel.sidebar.left-nav-preview.tooltip-background")};
          border-radius: 6px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.15s ease-out;
          pointer-events: none;
          display: flex;
          flex-direction: column;
          width: auto;
        }
        .trubbel-sidebar-preview.active {
          opacity: 1;
          visibility: visible;
          pointer-events: auto;
        }
        .trubbel-sidebar-preview-wrapper {
          width: 100%;
          position: relative;
        }
        .trubbel-sidebar-preview iframe {
          width: 100%;
          height: 100%;
          border: 0;
          display: block;
          background-color: black;
        }
        .trubbel-sidebar-preview-title {
          padding: 6px 8px;
          font-size: 1.3rem;
          font-weight: 600;
          color: ${this.settings.get("addon.trubbel.sidebar.left-nav-preview.tooltip-text1")};
          word-break: break-word;
          overflow-wrap: break-word;
          word-wrap: break-word;
          white-space: pre-wrap;
          text-overflow: ellipsis;
          max-height: none;
          overflow-y: visible;
          width: 100%;
          box-sizing: border-box;
          line-height: 1.5;
          max-width: 100%;
        }
        .trubbel-sidebar-preview-category {
          padding: 4px 8px;
          font-size: 1.2rem;
          color: ${this.settings.get("addon.trubbel.sidebar.left-nav-preview.tooltip-text2")};
          word-break: break-word;
          overflow-wrap: break-word;
          word-wrap: break-word;
          white-space: pre-wrap;
          max-height: none;
          overflow-y: visible;
          border-top: 1px solid ${this.settings.get("addon.trubbel.sidebar.left-nav-preview.border")};
          width: 100%;
          box-sizing: border-box;
          line-height: 1.3;
          max-width: 100%;
        }
        .trubbel-sidebar-preview-viewers {
          padding: 4px 8px;
          font-size: 1.2rem;
          color: ${this.settings.get("addon.trubbel.sidebar.left-nav-preview.tooltip-text3")};
          word-break: break-word;
          overflow-wrap: break-word;
          word-wrap: break-word;
          white-space: pre-wrap;
          max-height: none;
          overflow-y: visible;
          border-top: 1px solid ${this.settings.get("addon.trubbel.sidebar.left-nav-preview.border")};
          width: 100%;
          box-sizing: border-box;
          line-height: 1.3;
          max-width: 100%;
        }
        .trubbel-sidebar-preview-hypetrain {
          padding: 4px 8px;
          font-size: 1.2rem;
          color: ${this.settings.get("addon.trubbel.sidebar.left-nav-preview.tooltip-text4")};
          word-break: break-word;
          overflow-wrap: break-word;
          word-wrap: break-word;
          white-space: pre-wrap;
          max-height: none;
          overflow-y: visible;
          border-top: 1px solid ${this.settings.get("addon.trubbel.sidebar.left-nav-preview.border")};
          width: 100%;
          box-sizing: border-box;
          line-height: 1.3;
          max-width: 100%;
        }
        /* Preview size variations */
        .trubbel-sidebar-preview--small .trubbel-sidebar-preview-wrapper {
          width: 280px;
          height: 158px;
        }
        .trubbel-sidebar-preview--medium .trubbel-sidebar-preview-wrapper {
          width: 320px;
          height: 180px;
        }
        .trubbel-sidebar-preview--large .trubbel-sidebar-preview-wrapper {
          width: 400px;
          height: 225px;
        }
        .trubbel-sidebar-preview--xlarge .trubbel-sidebar-preview-wrapper {
          width: 480px;
          height: 270px;
        }
        /* Make sure the width of the preview containers matches the iframe width */
        .trubbel-sidebar-preview--small .trubbel-sidebar-preview-title,
        .trubbel-sidebar-preview--small .trubbel-sidebar-preview-category,
        .trubbel-sidebar-preview--small .trubbel-sidebar-preview-viewers,
        .trubbel-sidebar-preview--small .trubbel-sidebar-preview-hypetrain,
        .trubbel-sidebar-preview--small .trubbel-sidebar-preview-guests {
          max-width: 280px;
        }
        .trubbel-sidebar-preview--medium .trubbel-sidebar-preview-title,
        .trubbel-sidebar-preview--medium .trubbel-sidebar-preview-category,
        .trubbel-sidebar-preview--medium .trubbel-sidebar-preview-viewers,
        .trubbel-sidebar-preview--medium .trubbel-sidebar-preview-hypetrain,
        .trubbel-sidebar-preview--medium .trubbel-sidebar-preview-guests {
          max-width: 320px;
        }
        .trubbel-sidebar-preview--large .trubbel-sidebar-preview-title,
        .trubbel-sidebar-preview--large .trubbel-sidebar-preview-category,
        .trubbel-sidebar-preview--large .trubbel-sidebar-preview-viewers,
        .trubbel-sidebar-preview--large .trubbel-sidebar-preview-hypetrain,
        .trubbel-sidebar-preview--large .trubbel-sidebar-preview-guests {
          max-width: 400px;
        }
        .trubbel-sidebar-preview--xlarge .trubbel-sidebar-preview-title,
        .trubbel-sidebar-preview--xlarge .trubbel-sidebar-preview-category,
        .trubbel-sidebar-preview--xlarge .trubbel-sidebar-preview-viewers,
        .trubbel-sidebar-preview--xlarge .trubbel-sidebar-preview-hypetrain,
        .trubbel-sidebar-preview--xlarge .trubbel-sidebar-preview-guests {
          max-width: 480px;
        }
        /* Hype Train Styles */
        .trubbel-hype-train-icon {
          display: inline-block;
          vertical-align: middle;
          margin-right: 4px;
          height: 1.3rem;
          width: 1.3rem;
        }
        .trubbel-hype-train-regular {
          background: #bf94ff;
          -webkit-mask-image: url(https://static-cdn.jtvnw.net/c3-vg/leftnav/hype-train.svg);
          mask-image: url(https://static-cdn.jtvnw.net/c3-vg/leftnav/hype-train.svg);
          -webkit-mask-repeat: no-repeat;
          mask-repeat: no-repeat;
          -webkit-mask-size: 100%;
          mask-size: 100%;
        }
        .trubbel-hype-train-golden {
          background: linear-gradient(180deg, #ffb31a 1.19%, #e0e000);
          -webkit-mask-image: url(https://static-cdn.jtvnw.net/c3-vg/leftnav/hype-train.svg);
          mask-image: url(https://static-cdn.jtvnw.net/c3-vg/leftnav/hype-train.svg);
          -webkit-mask-repeat: no-repeat;
          mask-repeat: no-repeat;
          -webkit-mask-size: 100%;
          mask-size: 100%;
        }
        .trubbel-hype-train-alltime {
          background: linear-gradient(#9147ff, #ff75e6);
          -webkit-mask-image: url(https://static-cdn.jtvnw.net/c3-vg/leftnav/trophy.svg);
          mask-image: url(https://static-cdn.jtvnw.net/c3-vg/leftnav/trophy.svg);
          -webkit-mask-repeat: no-repeat;
          mask-repeat: no-repeat;
          -webkit-mask-size: 100%;
          mask-size: 100%;
        }
        /* Guests Container */
        .trubbel-sidebar-preview-guests {
          padding: 4px 8px;
          font-size: 1.2rem;
          color: ${this.settings.get("addon.trubbel.sidebar.left-nav-preview.tooltip-text5")};
          word-break: break-word;
          overflow-wrap: break-word;
          word-wrap: break-word;
          white-space: pre-wrap;
          max-height: none;
          overflow-y: visible;
          border-top: 1px solid ${this.settings.get("addon.trubbel.sidebar.left-nav-preview.border")};
          width: 100%;
          box-sizing: border-box;
          line-height: 1.3;
          max-width: 100%;
        }
        /* Guests List */
        .trubbel-sidebar-preview-guests-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        /* Individual Guest Item */
        .trubbel-sidebar-preview-guest-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        /* Guest Avatar */
        .trubbel-sidebar-preview-guest-avatar {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          flex-shrink: 0;
          position: relative;
          box-sizing: content-box;
        }
        .trubbel-sidebar-preview-guest-avatar::after {
          content: "";
          position: absolute;
          top: -3px;
          left: -3px;
          right: -3px;
          bottom: -3px;
          border-radius: 50%;
          pointer-events: none;
          z-index: 1;
          border: 0.2rem solid var(--avatar-border-color, #9147ff); /* Use CSS variable with fallback */
        }
        .trubbel-sidebar-preview-guest-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
          position: relative;
          z-index: 0;
        }
        /* Guest Name */
        .trubbel-sidebar-preview-guest-name {
          flex-grow: 1;
          font-size: 1.1rem;
          color: ${this.settings.get("addon.trubbel.sidebar.left-nav-preview.tooltip-text5")};
        }
        /* Guest Viewer Count */
        .trubbel-sidebar-preview-guest-viewers {
          font-size: 1.1rem;
          color: ${this.settings.get("addon.trubbel.sidebar.left-nav-preview.tooltip-text5")};
          display: flex;
          align-items: center;
          gap: 4px;
        }
        /* Online Indicator */
        .trubbel-sidebar-preview-guest-online-indicator {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #eb0400;
          margin-right: 4px;
        }
      `);
    } else {
      this.style.delete("left-nav-preview");
    }
    // Sidebar - Left Navigation - Hide Native Tooltip
    if (this.settings.get("addon.trubbel.sidebar.left-nav-preview.hide-native-tooltip")) {
      this.style.set("hide-native-tooltip1", "div :is(.tw-balloon) :has(.online-side-nav-channel-tooltip__body) { display: none !important; }");
      this.style.set("hide-native-tooltip2", "div :is(.tw-balloon) :has(.side-nav-guest-star-tooltip__body) { display: none !important; }");
    } else {
      this.style.delete("hide-native-tooltip1");
      this.style.delete("hide-native-tooltip2");
    }
  }
}