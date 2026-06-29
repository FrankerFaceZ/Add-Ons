export default class Declutter {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.loadable = parent.loadable;
    this.style = parent.style;
    this.site = parent.site;

    this.CLASSES = {
      "hide-celebration-overlays": ".celebration__overlay,.celebration__overlay *,.confetti-layer,.confetti-layer *",
      "hide-input-drops-button": ".chat-input__buttons-container div:has(> div > [data-a-target=\"drops-button\"])",
      "hide-following-title": ".common-centered-column:has(section#following-page-main-content) h1.tw-title",
      "hide-sidebar-for-you": ".side-nav--expanded [aria-label] :is(.side-nav__title):has(h3[class*=\"tw-title\"]:first-child)",
      "hide-sidebar-sort-paragraph": "[data-a-target=\"side-nav-header-expanded\"] p",
      "hide-sidebar-guest-avatar": ".side-nav-card :is(.primary-with-small-avatar__mini-avatar)",
      "hide-sidebar-guest-number": ".side-nav-card [data-a-target=\"side-nav-card-metadata\"] :is(p):nth-child(2)",
      "hide-sidebar-all-time-high-train": ".side-nav-card div:has(> .hype-train-icon__trophy)",
      "hide-sidebar-community-train": ".side-nav-card div:has(> .hype-train-icon__train--community)",
      "hide-sidebar-golden-kappa-train": ".side-nav-card div:has(> .hype-train-icon__train--golden-kappa)",
      "hide-sidebar-mythic-train": ".side-nav-card div:has(> .hype-train-icon__train--mythic)",
      "hide-sidebar-shared-hype-train": ".side-nav-card div:has(> .hype-train-icon__train--shared)",
      "hide-sidebar-treasure-train": ".side-nav-card div:has(> .hype-train-icon__train--treasure)",
      "hide-sidebar-hype-train": ".side-nav-card div:has(> .hype-train-icon__train--default)",
      "hide-sidebar-gift-discount": ".side-nav-card div:has(> [class*=\"giftGradient--\"])",
      "hide-sidebar-watch-streak": ".side-nav-card div:has(> div > svg path[d=\"M11 4.5L9 2L4.80069 6.8992C3.63871 8.25484 3 9.98143 3 11.7669C3 15.2094 5.79065 18 9.23308 18H10.8803C14.2601 18 17 15.2601 17 11.8803C17 10.0192 16.3475 8.21702 15.1561 6.78728L12 3L11 4.5ZM6.3192 8.20078L9 5L11 7.5L12 6L13.6196 8.06765C14.5115 9.13795 15 10.4871 15 11.8803C15 13.965 13.4516 15.688 11.4421 15.962C11.7975 15.4931 12 14.9133 12 14.3028C12 13.7831 11.8231 13.2789 11.4985 12.8731L10 11L8.50148 12.8731C8.17686 13.2789 8 13.7831 8 14.3028C8 14.9057 8.19744 15.4786 8.5446 15.9443C6.53418 15.6155 5 13.8704 5 11.7669C5 10.4589 5.46792 9.19394 6.3192 8.20078Z\"])",
      "hide-player-cc": "[data-a-target=\"player-settings-menu\"] div:has(> button.tw-interactable [d=\"M2 5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5Zm2 0h16v14H4V5Z\"]),[data-a-target=\"player-settings-menu\"] div:has(> button.tw-interactable [d=\"M4 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H4Zm6.642 10.242c-.301.494-.763.758-1.163.758-.66 0-1.488-.717-1.488-2s.828-2 1.488-2c.4 0 .862.264 1.163.758l.858-.494C11.05 9.498 10.313 9 9.479 9 8.109 9 7 10.343 7 12s1.11 3 2.479 3c.834 0 1.572-.499 2.021-1.264l-.858-.494Zm5.5 0c-.301.494-.763.758-1.163.758-.66 0-1.488-.717-1.488-2s.828-2 1.488-2c.4 0 .862.264 1.163.758l.858-.494C16.55 9.498 15.813 9 14.979 9c-1.37 0-2.479 1.343-2.479 3s1.11 3 2.479 3c.834 0 1.572-.499 2.021-1.264l-.858-.494Z\"])",
      "hide-player-disclosure": ".disclosure-tool",
      "hide-player-mrv": ".video-player__overlay :is(.player-overlay-background--darkness-3):has(.offline-recommendations-video-card)",
      "hide-about-section": "section#live-channel-about-panel:has(.about-section)",
      "hide-watch-streak": ".rewards-list > div:has([style*=\"cursor: pointer\"] svg [d*=\"M5.295 8.05 10 2l3 4 2-3 3.8 5.067a11 11 0 0 1 2.2 6.6A7.333 7.333 0 0 1 13.667 22h-3.405A7.262 7.262 0 0 1 3 14.738c0-2.423.807-4.776 2.295-6.688Zm7.801 1.411 2-3L17.2 9.267a9 9 0 0 1 1.8 5.4 5.334 5.334 0 0 1-4.826 5.31 3 3 0 0 0 .174-3.748L12 13l-2.348 3.229a3 3 0 0 0 .18 3.754A5.263 5.263 0 0 1 5 14.738c0-1.978.66-3.9 1.873-5.46l3.098-3.983 3.125 4.166Z\"])",
      "hide-vod-muted-segment-popup": ".video-player .muted-segments-alert__scroll-wrapper",
      "hide-sidebar-sponsored-content": ".side-nav .tw-transition:has(a[class*=\"side-nav-card__link--promoted\"]),.side-nav .tw-transition:has(a[class*=\"side-nav-card__collapsed\"])",
    };
  }

  onEnable() {
    this.toggleHide("hide-celebration-overlays", this.settings.get("addon.trubbel.appearance.declutter.channel.celebration"));
    this.toggleHide("hide-input-drops-button", this.settings.get("addon.trubbel.appearance.declutter.chat.drops_button"));
    this.toggleHide("hide-following-title", this.settings.get("addon.trubbel.appearance.declutter.directory.following_title"));
    this.toggleHide("hide-sidebar-for-you", this.settings.get("addon.trubbel.appearance.declutter.sidebar.for_you"));
    this.toggleHide("hide-sidebar-sort-paragraph", this.settings.get("addon.trubbel.appearance.declutter.sidebar.sort_paragraph"));
    this.toggleHide("hide-sidebar-guest-avatar", this.settings.get("addon.trubbel.appearance.declutter.sidebar.guest_avatar"));
    this.toggleHide("hide-sidebar-guest-number", this.settings.get("addon.trubbel.appearance.declutter.sidebar.guest_number"));
    this.toggleHide("hide-sidebar-all-time-high-train", this.settings.get("addon.trubbel.appearance.declutter.sidebar.all_time_high_train"));
    this.toggleHide("hide-sidebar-community-train", this.settings.get("addon.trubbel.appearance.declutter.sidebar.community_train"));
    this.toggleHide("hide-sidebar-golden-kappa-train", this.settings.get("addon.trubbel.appearance.declutter.sidebar.golden_kappa_train"));
    this.toggleHide("hide-sidebar-mythic-train", this.settings.get("addon.trubbel.appearance.declutter.sidebar.mythic_train"));
    this.toggleHide("hide-sidebar-shared-hype-train", this.settings.get("addon.trubbel.appearance.declutter.sidebar.shared_hype_train"));
    this.toggleHide("hide-sidebar-treasure-train", this.settings.get("addon.trubbel.appearance.declutter.sidebar.treasure_train"));
    this.toggleHide("hide-sidebar-hype-train", this.settings.get("addon.trubbel.appearance.declutter.sidebar.hype_train"));
    this.toggleHide("hide-sidebar-gift-discount", this.settings.get("addon.trubbel.appearance.declutter.sidebar.gift_discount"));
    this.toggleHide("hide-sidebar-watch-streak", this.settings.get("addon.trubbel.appearance.declutter.sidebar.watch_streak"));
    this.toggleHide("hide-player-cc", this.settings.get("addon.trubbel.appearance.declutter.player.cc"));
    this.toggleHide("hide-player-disclosure", this.settings.get("addon.trubbel.appearance.declutter.player.disclosure"));
    this.toggleHide("hide-player-mrv", this.settings.get("addon.trubbel.appearance.declutter.player.most_recent_video"));
    this.toggleHide("hide-about-section", this.settings.get("addon.trubbel.appearance.declutter.stream.about_section"));
    this.toggleHide("hide-watch-streak", this.settings.get("addon.trubbel.appearance.declutter.stream.watch_streak"));
    this.toggleHide("hide-vod-muted-segment-popup", this.settings.get("addon.trubbel.appearance.declutter.vods.muted_segment_popup"));
    this.toggleHide("hide-sidebar-sponsored-content", this.settings.get("addon.trubbel.appearance.declutter.sidebar.SideNavPromotedFollowedCardComponent"));
    this.updateCSS();

    // Appearance - Declutter - Left Navigation - Hide sponsored content
    this.settings.getChanges("addon.trubbel.appearance.declutter.sidebar.SideNavPromotedFollowedCardComponent", val => {
      this.loadable.toggle("SideNavPromotedFollowedCardComponent", !val);
    });

    // Appearance - Declutter - Stream - Hide channel panels
    this.settings.getChanges("addon.trubbel.appearance.declutter.stream.channel_panels", val => {
      this.loadable.toggle("ChannelPanels", !val);
    });

    // Appearance - Declutter - Stream - Hide sponsored banner above chat
    this.settings.getChanges("addon.trubbel.appearance.declutter.stream.ChannelSkinsBanner", val => {
      this.loadable.toggle("ChannelSkinsBanner", !val);
    });
    // Appearance - Declutter - Stream - Hide sponsored logo within player
    this.settings.getChanges("addon.trubbel.appearance.declutter.stream.ChannelSkinsOverlay", val => {
      this.loadable.toggle("ChannelSkinsOverlay", !val);
    });
    // Appearance - Declutter - Stream - Hide sponsored banner below player
    this.settings.getChanges("addon.trubbel.appearance.declutter.stream.ChannelSkinsRibbon", val => {
      this.loadable.toggle("ChannelSkinsRibbon", !val);
    });

    // Appearance - Declutter - Chat - Hide stream chat header
    this.settings.getChanges("addon.trubbel.appearance.declutter.chat.stream_header", val => {
      if (val) {
        this.patchSettingsMenu();
      } else {
        this.site?.children?.chat?.settings_menu?.SettingsMenu?.forceUpdate();
      }
    });
  }

  toggleHide(key, val) {
    const k = `hide--${key}`;
    if (!val) {
      this.style.delete(k);
      return;
    }
    if (!FrankerFaceZ.utilities.object.has(this.CLASSES, key)) {
      throw new Error(`cannot find class for "${key}"`);
    }
    this.style.set(k, `${this.CLASSES[key]} {display: none !important}`);
  }

  updateCSS() {
    // Appearance - Declutter - Chat - Hide stream chat header
    if (this.settings.get("addon.trubbel.appearance.declutter.chat.stream_header")) {
      this.style.set("hide-stream-chat-header", `
        .right-column:not(:has(#community-tab-content)) {
          .stream-chat-header,
          .toggle-visibility__right-column--expanded {
            display: none !important;
          }
        }
      `);
    } else {
      this.style.delete("hide-stream-chat-header");
    }
    // Appearance - Declutter - Left Navigation - Hide the "For You"-text
    if (this.settings.get("addon.trubbel.appearance.declutter.sidebar.for_you")
      && !this.settings.get("addon.trubbel.twilight.sidebar_extended.pinned_channels")) {
      this.style.set("hide-sidebar-for-you", `
        .followed-side-nav-header__dropdown-trigger {
          display: flex !important;
          justify-content: flex-start !important;
          align-items: center !important;
        }
        .followed-side-nav-header__dropdown-trigger > :last-child {
          order: -1 !important;
        }
        .followed-side-nav-header__dropdown-trigger [data-a-target="side-nav-header-expanded"] {
          margin-left: 4px !important;
        }
        .followed-side-nav-header__dropdown-trigger > :last-child {
          margin-right: 0 !important;
          padding-right: 0 !important;
        }
      `);
    } else {
      this.style.delete("hide-sidebar-for-you");
    }
    // Appearance - Declutter - Player - Hide the top gradient
    if (this.settings.get("addon.trubbel.appearance.declutter.player.top_gradient")) {
      this.style.set("hide-player-top-gradient", ".video-player .top-bar {background: transparent !important;}");
    } else {
      this.style.delete("hide-player-top-gradient");
    }
    // Appearance - Declutter - Player - Hide the bottom gradient
    if (this.settings.get("addon.trubbel.appearance.declutter.player.bottom_gradient")) {
      this.style.set("hide-player-bottom-gradient", ".video-player .player-controls {background: transparent !important;}");
    } else {
      this.style.delete("hide-player-bottom-gradient");
    }
    // Appearance - Declutter - Stream - Hide the about section and panels
    if (this.settings.get("addon.trubbel.appearance.declutter.stream.about_panels")) {
      this.style.set("hide-stream-about-panels1", "[id=\"live-channel-about-panel\"], .channel-panels {display: none !important;}");
      this.style.set("hide-stream-about-panels2", ".channel-info-content:not(:has(.timestamp-metadata__bar)) :is(div[style^=\"min-height:\"]) {min-height: 0px !important;}");
      this.style.set("hide-stream-about-panels3", ".channel-info-content:not(:has(.timestamp-metadata__bar)) :is(.tw-tower:has(.tw-placeholder-wrapper)) {display: none !important;}");
    } else {
      this.style.delete("hide-stream-about-panels1");
      this.style.delete("hide-stream-about-panels2");
      this.style.delete("hide-stream-about-panels3");
    }
    // Appearance - Declutter - Stream - Hide power-ups within the rewards popup
    if (this.settings.get("addon.trubbel.appearance.declutter.stream.power_ups")) {
      this.style.set("hide-stream-power-ups", `
          .reward-center__content {
            &:has([role="radiogroup"] button[data-a-target="reward-filter-all"][aria-checked="true"]) {
              .rewards-list {
                margin-inline: auto !important;
                > div:first-child:has(p) {
                  display: none !important;
                  padding-block-end: 0 !important;
                  padding-inline: 0 !important;
                  padding-block: 0 !important;
                }
                > [class*="bitsRewardListItem--"],
                > [class*="bitsCustomRewardListItem--"] {
                  display: none !important;
                }
                div:has(> div:first-child p) {
                  padding-block: 0 !important;
                }
              }
            }
          }
        `);
    } else {
      this.style.delete("hide-stream-power-ups");
    }
    // Appearance - Declutter - Stream - Hide sponsored player gradient
    if (this.settings.get("addon.trubbel.appearance.declutter.stream.sponsored_gradient")) {
      this.style.set("hide-sponsored-player-gradient", `
          .channel-page__video-player--with-border {
            background: transparent !important;
            padding: 0px !important;
          }
        `);
    } else {
      this.style.delete("hide-sponsored-player-gradient");
    }
  }

  async patchSettingsMenu() {
    if (this._sm_patch_started) return;
    this._sm_patch_started = true;

    const React = await this.site.findReact();
    if (!React) return;
    const createElement = React.createElement;

    const SettingsMenu = this.site?.children?.chat?.settings_menu?.SettingsMenu;
    if (!SettingsMenu) return;

    const t = this;

    SettingsMenu.ready(cls => {
      if (cls.prototype._trubbel_stream_header_patched) return;
      cls.prototype._trubbel_stream_header_patched = true;

      const old_universal = cls.prototype.renderUniversalOptions;

      cls.prototype.renderUniversalOptions = function () {
        const val = old_universal.call(this);

        if (!t.settings.get("addon.trubbel.appearance.declutter.chat.stream_header")) {
          return val;
        }

        if (!this._trubbel_collapseClick) {
          this._trubbel_collapseClick = () => {
            document.querySelector(".chat-settings__popover [data-test-selector=\"chat-settings-close-button-selector\"]")?.click();
            const btn = document.querySelector(".toggle-visibility__right-column--expanded button[data-a-target=\"right-column__toggle-collapse-btn\"]");
            if (btn) btn.click();
          };
        }
        if (!this._trubbel_viewerListClick) {
          this._trubbel_viewerListClick = () => {
            document.querySelector(".chat-settings__popover [data-test-selector=\"chat-settings-close-button-selector\"]")?.click();
            const btn = document.querySelector("button[data-test-selector=\"chat-viewer-list\"]");
            if (btn) btn.click();
          };
        }

        val.props.children.push(
          <div class="tw-full-width tw-relative">
            <button
              class="tw-block tw-border-radius-medium tw-full-width ffz-interactable ffz-interactable--hover-enabled ffz-interactable--default tw-interactive"
              onClick={this._trubbel_collapseClick}
            >
              <div class="tw-align-items-center tw-flex tw-pd-05 tw-relative">
                <div class="tw-flex-grow-1">Collapse Chat</div>
                <div class="tw-flex tw-align-items-center tw-mg-l-2 tw-flex-shrink-0">
                  <div style={{ display: "inline-flex", alignItems: "center", width: "var(--icon-size,2rem)", height: "var(--icon-size,2rem)", fill: "var(--color-fill-current)" }}>
                    <svg viewBox="0 0 24 24" style={{ width: "var(--icon-size,2rem)", height: "var(--icon-size,2rem)" }} aria-hidden="true" role="presentation">
                      <path d="M3 5h2v14H3V5Zm19.414 7-6.707-6.707-1.414 1.414L18.586 11H7v2h11.586l-4.293 4.293 1.414 1.414L22.414 12Z" />
                    </svg>
                  </div>
                </div>
              </div>
            </button>
          </div>,
          <div class="tw-full-width tw-relative">
            <button
              class="tw-block tw-border-radius-medium tw-full-width ffz-interactable ffz-interactable--hover-enabled ffz-interactable--default tw-interactive"
              onClick={this._trubbel_viewerListClick}
            >
              <div class="tw-align-items-center tw-flex tw-pd-05 tw-relative">
                <div class="tw-flex-grow-1">Community</div>
                <div class="tw-flex tw-align-items-center tw-mg-l-2 tw-flex-shrink-0">
                  <div style={{ display: "inline-flex", alignItems: "center", width: "var(--icon-size,2rem)", height: "var(--icon-size,2rem)", fill: "var(--color-fill-current)" }}>
                    <svg viewBox="0 0 24 24" style={{ width: "var(--icon-size,2rem)", height: "var(--icon-size,2rem)" }} aria-hidden="true" role="presentation">
                      <path fill-rule="evenodd" d="M8 2a5 5 0 0 0-1 9.9v.1a1 1 0 0 1-1 1H5a3 3 0 0 0-3 3v6h2v-6a1 1 0 0 1 1-1h1a2.99 2.99 0 0 0 2-.764A2.99 2.99 0 0 0 10 15h1a1 1 0 0 1 1 1v6h2v-6a3 3 0 0 0-3-3h-1a1 1 0 0 1-1-1v-.1A5.002 5.002 0 0 0 8 2ZM5 7a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z" clip-rule="evenodd" />
                      <path d="M22 11a4.002 4.002 0 0 1-2.956 3.862A1.5 1.5 0 0 0 20.5 16a1.5 1.5 0 0 1 1.5 1.5V22h-5v-7.126A4.002 4.002 0 0 1 18 7a4 4 0 0 1 4 4Z" />
                    </svg>
                  </div>
                </div>
              </div>
            </button>
          </div>
        );

        const highlights = t.site.children.chat?.community_stack?.highlights;
        const pinnedEntry = Array.isArray(highlights)
          ? highlights.find(entry => entry?.event?.type === "pinned_chat" && entry.hidden === true)
          : null;

        if (pinnedEntry) {
          if (!this._trubbel_pinnedClick) {
            this._trubbel_pinnedClick = () => {
              const highlights = t.site.children.chat?.community_stack?.highlights;
              const dispatch = t.site.children.chat?.community_dispatch;
              if (!highlights || !dispatch) return;

              const entry = highlights.find(
                e => e?.event?.type === "pinned_chat" && e.hidden === true
              );
              if (!entry) return;

              dispatch({ type: "unhide-highlight", id: entry.id });
              document.querySelector(".chat-settings__popover [data-test-selector=\"chat-settings-close-button-selector\"]")?.click();
            };
          }

          val.props.children.push(
            <div class="tw-full-width tw-relative">
              <button
                class="tw-block tw-border-radius-medium tw-full-width ffz-interactable ffz-interactable--hover-enabled ffz-interactable--default tw-interactive"
                onClick={this._trubbel_pinnedClick}
              >
                <div class="tw-align-items-center tw-flex tw-pd-05 tw-relative">
                  <div class="tw-flex-grow-1">Show pinned message</div>
                  <div class="tw-flex tw-align-items-center tw-mg-l-2 tw-flex-shrink-0">
                    <div style={{ display: "inline-flex", alignItems: "center", width: "var(--icon-size,2rem)", height: "var(--icon-size,2rem)", fill: "var(--color-fill-current)" }}>
                      <svg viewBox="0 0 24 24" style={{ width: "var(--icon-size,2rem)", height: "var(--icon-size,2rem)" }} aria-hidden="true" role="presentation">
                        <path fill-rule="evenodd" d="M18 4V2H6v2h2v5a3 3 0 0 0-3 3v4h14v-4a3 3 0 0 0-3-3V4h2Zm-1 10H7v-2a1 1 0 0 1 1-1h2V4h4v7h2a1 1 0 0 1 1 1v2Z" clip-rule="evenodd" />
                        <path d="M13 18h-2v4h2v-4Z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </button>
            </div>
          );
        }

        let chatRenderer = null;
        for (const inst of t.site.children.chat?.ChatRenderer?.instances ?? []) {
          if (inst.props?.sharedChatDataByChannelID?.size > 0) {
            chatRenderer = inst;
            break;
          }
        }

        const sharedChatData = chatRenderer?.props?.sharedChatDataByChannelID;
        if (sharedChatData?.size > 0) {
          const hostChannelID = chatRenderer.props.channelID
            ?? chatRenderer.props.currentChannelID;

          let sharedChatAvatarComponent = null;
          let currentUser = null;
          const avatarEl = document.querySelector("[class*=\"sharedChatHeaderAvatarSmall\"]");
          if (avatarEl) {
            const fiber = t.site.children.fine.getReactInstance(avatarEl);
            const componentFiber = fiber?.child;
            const componentType = componentFiber?.type;
            if (componentType && (typeof componentType === "function" || typeof componentType === "object")) {
              sharedChatAvatarComponent = componentType;
              currentUser = componentFiber.memoizedProps?.currentUser ?? null;
            }
          }

          const avatarItems = [...sharedChatData.entries()].map(([channelID, ch]) => (
            <div class="tw-flex tw-align-items-center tw-pd-x-1 tw-pd-y-05">
              {sharedChatAvatarComponent
                ? createElement(sharedChatAvatarComponent, {
                  data: ch,
                  cardInfo: {
                    __typename: "User",
                    id: channelID,
                    login: ch.login,
                    displayName: ch.displayName,
                    primaryColorHex: ch.primaryColorHex,
                    profileImageURL: ch.profileImageURL,
                    description: null,
                  },
                  currentChannelID: hostChannelID,
                  currentUser: currentUser,
                  showCardOnHover: true,
                })
                : createElement("img", {
                  src: ch.profileImageURL,
                  alt: ch.displayName,
                  class: "tw-image tw-image-avatar tw-border-radius-rounded",
                  style: { width: "2.8rem", height: "2.8rem", objectFit: "cover" },
                })
              }
              <span class="tw-mg-l-05">{ch.displayName}</span>
            </div>
          ));

          val.props.children.push(
            <div class="tw-full-width tw-relative tw-border-t tw-mg-t-05 tw-pd-t-05">
              <div class="tw-pd-x-1 tw-pd-y-05 tw-c-text-alt-2 tw-font-size-6">
                Shared Chat
              </div>
              {...avatarItems}
            </div>
          );
        }

        return val;
      };

      SettingsMenu.forceUpdate();
    });

    SettingsMenu.on("unmount", inst => {
      inst._trubbel_collapseClick = null;
      inst._trubbel_viewerListClick = null;
      inst._trubbel_pinnedClick = null;
    });
  }

}