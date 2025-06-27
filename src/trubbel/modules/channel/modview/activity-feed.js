import { notification } from "../../../utilities/notification";

const { createElement, on, off } = FrankerFaceZ.utilities.dom;

export class ActivityFeed {
  constructor(parent) {
    this.parent = parent;
    this.isActive = false;
    this.modviewPopup = null;
    this.modviewPopupClickHandler = null;
    this.modviewPopupKeyHandler = null;

    this.onRightClick = this.onRightClick.bind(this);
    this.getUserDataFromReact = this.getUserDataFromReact.bind(this);
    this.showModeratorPopup = this.showModeratorPopup.bind(this);
    this.handleButtonClick = this.handleButtonClick.bind(this);
    this.handleNavigation = this.handleNavigation.bind(this);
    this.enableActivityFeedModeration = this.enableActivityFeedModeration.bind(this);
    this.disableActivityFeedModeration = this.disableActivityFeedModeration.bind(this);
  }

  initialize() {
    const enabled = this.parent.settings.get("addon.trubbel.channel.mod-view-activity_feed");
    if (enabled) {
      this.handleNavigation();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.parent.log.info("[Activity Feed] Enabling activity feed moderation");
      this.handleNavigation();
    } else {
      this.parent.log.info("[Activity Feed] Disabling activity feed moderation");
      this.disableActivityFeedModeration();
    }
  }

  handleNavigation() {
    const currentRoute = ["dash-stream-manager", "mod-view"];
    if (currentRoute.includes(this.parent.router?.current?.name)) {
      const enabled = this.parent.settings.get("addon.trubbel.channel.mod-view-activity_feed");
      if (enabled && !this.isActive) {
        this.parent.log.info("[Activity Feed] Entering mod-view, enabling activity feed moderation");
        this.enableActivityFeedModeration();
      }
    } else {
      if (this.isActive) {
        this.parent.log.info("[Activity Feed] Leaving mod-view, disabling activity feed moderation");
        this.disableActivityFeedModeration();
      }
    }
  }

  enableActivityFeedModeration() {
    if (this.isActive) return;
    this.parent.log.info("[Activity Feed] Setting up right-click event listener");
    on(document, "contextmenu", this.onRightClick);
    this.isActive = true;
    this.updateCSS();
  }

  disableActivityFeedModeration() {
    if (!this.isActive) return;

    this.parent.log.info("[Activity Feed] Removing right-click event listener");
    off(document, "contextmenu", this.onRightClick);

    if (this.modviewPopup) {
      this.modviewPopup.remove();
      this.modviewPopup = null;

      if (this.modviewPopupClickHandler) {
        off(document, "click", this.modviewPopupClickHandler);
        this.modviewPopupClickHandler = null;
      }
      if (this.modviewPopupKeyHandler) {
        off(document, "keydown", this.modviewPopupKeyHandler);
        this.modviewPopupKeyHandler = null;
      }
    }
    this.updateCSS();

    this.isActive = false;
  }

  onRightClick(event) {
    if (!this.parent.settings.get("addon.trubbel.channel.mod-view-activity_feed") || !this.isActive) return;

    const element = event.target;
    const activityItem = element.closest(".activity-base-list-item");
    if (!activityItem) return;

    const react = this.parent.site.fine.searchParentNode(activityItem, n => n?.memoizedProps?.actionsMenu);
    if (!react) {
      this.parent.log.error("[Activity Feed] No React component found with actionsMenu");
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const userData = this.getUserDataFromReact(react);
    if (userData) {
      this.showModeratorPopup(event, userData);
    } else {
      this.parent.log.warn("[Activity Feed] Could not extract user data from React component");
      this.parent.log.warn("[Activity Feed] Event:", event);
      this.parent.log.warn("[Activity Feed] UserData:", userData);
    }
  }

  // Helper function to extract user data from React component
  getUserDataFromReact(react) {
    try {
      // Extract user data from the React component
      const eventData = react.memoizedProps;
      const actionsMenu = eventData.actionsMenu?.props;
      const activityProps = actionsMenu?.activity;
      const anonymous = actionsMenu?.anonymous;
      const activityType = eventData.eventType;

      if (!activityProps) {
        this.parent.log.error("[Activity Feed] No activity props found in React component");
        return null;
      }

      // Extract user data based on event type
      let userData = null;

      // User is null when anonymous
      if (activityProps?.user === null) {
        // In cases like these we get the giftee instead of anonymous gifter
        if (activityProps?.type === "INDIVIDUAL_GIFT_SUBSCRIPTION" && anonymous) {

          // Find the fragment that has a token with __typename = "User"
          const userFragment = activityProps.content.fragments.find(
            fragment => fragment.token?.__typename === "User"
          );

          if (userFragment?.token) {
            const userToken = userFragment.token;
            userData = {
              id: userToken.userID,
              login: userToken.login,
              displayName: userToken.displayName,
              timestamp: activityProps.timestamp,
              eventType: activityProps.type
            };

            this.parent.log.info(`[Activity Feed] Found user data in content fragments: ${userData.displayName}`);
          } else {
            this.parent.log.warn("[Activity Feed] No user fragment found in content fragments");
          }
        } else if (activityProps?.type === "FOLLOW" && anonymous) {
          notification("⚠️", "Unknown User - no data found", 8000);
          this.parent.log.debug("[Activity Feed] No data found:", eventData);
        } else {
          notification("⚠️", "Unknown User - no data found", 8000);
          this.parent.log.debug("[Activity Feed] No data found:", eventData);
        }
      } else if (activityProps?.user !== null) {
        userData = {
          id: activityProps.user.id,
          login: activityProps.user.login,
          displayName: activityProps.user.displayName,
          timestamp: activityProps.timestamp,
          eventType: activityProps.type
        };
      }

      this.parent.log.info(`[Activity Feed] eventData (${activityType}):`, eventData);
      this.parent.log.debug("[Activity Feed] Extracted user data:", userData);
      return userData;
    } catch (err) {
      this.parent.log.error("[Activity Feed] Error extracting React data:", err);
      return null;
    }
  }

  showModeratorPopup(event, userData) {
    if (this.modviewPopup) {
      this.modviewPopup.remove();
      this.modviewPopup = null;
    }

    this.modviewPopup = (
      <div
        className="mod-popup"
        style={{
          position: "fixed"
        }}
      >
        <div className="mod-popup-user">
          {userData.displayName.toLowerCase() === userData.login
            ? userData.displayName
            : `${userData.displayName} (${userData.login})`}
        </div>

        {userData.eventType && (
          <div className="mod-popup-event">
            Event type: {userData.eventType}
          </div>
        )}

        {userData.timestamp && (
          <div className="mod-popup-info">
            Event time: {this.parent.i18n.formatDateTime(new Date(userData.timestamp), "short")}
          </div>
        )}

        <button
          className="mod-popup-button"
          data-action="timeout-10"
          onClick={() => this.handleButtonClick("timeout-10", userData)}
        >
          <span class="ffz-i-clock">
            Timeout (10m)
          </span>
        </button>

        <button
          className="mod-popup-button"
          data-action="timeout-60"
          onClick={() => this.handleButtonClick("timeout-60", userData)}
        >
          <span class="ffz-i-clock">
            Timeout (1h)
          </span>
        </button>

        <button
          className="mod-popup-button"
          data-action="ban"
          style={{ backgroundColor: "#e81815" }}
          onClick={() => this.handleButtonClick("ban", userData)}
        >
          <span class="ffz-i-block">
            Ban User
          </span>
        </button>

        <button
          className="mod-popup-button"
          data-action="profile"
          style={{ backgroundColor: "#3a85ff" }}
          onClick={() => this.handleButtonClick("profile", userData)}
        >
          <span class="ffz-i-viewers">
            View Profile
          </span>
        </button>

        <button
          className="mod-popup-button"
          data-action="user-id"
          style={{ backgroundColor: "#3a85ff" }}
          onClick={() => this.handleButtonClick("user-id", userData)}
        >
          <span class="ffz-i-docs">
            Copy User ID
          </span>
        </button>

        <button
          className="mod-popup-button"
          data-action="close"
          style={{ backgroundColor: "#555" }}
          onClick={() => this.handleButtonClick("close", userData)}
        >
          <span class="ffz-i-cancel">
            Close
          </span>
        </button>
      </div>
    );

    this.modviewPopup.style.visibility = "hidden";
    document.body.appendChild(this.modviewPopup);

    const popupRect = this.modviewPopup.getBoundingClientRect();
    const popupWidth = popupRect.width;
    const popupHeight = popupRect.height;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = event.clientX;
    let top = event.clientY;

    if (left + popupWidth > viewportWidth) {
      left = Math.max(0, viewportWidth - popupWidth - 5);
    }

    if (top + popupHeight > viewportHeight) {
      top = Math.max(0, viewportHeight - popupHeight - 5);
    }

    this.modviewPopup.style.left = `${left}px`;
    this.modviewPopup.style.top = `${top}px`;
    this.modviewPopup.style.visibility = "visible";

    this.modviewPopupClickHandler = (e) => {
      if (this.modviewPopup && !this.modviewPopup.contains(e.target)) {
        this.modviewPopup.remove();
        this.modviewPopup = null;
        off(document, "click", this.modviewPopupClickHandler);
        off(document, "keydown", this.modviewPopupKeyHandler);
        this.modviewPopupClickHandler = null;
        this.modviewPopupKeyHandler = null;
      }
    };

    this.modviewPopupKeyHandler = (e) => {
      if (e.key === "Escape" && this.modviewPopup) {
        this.modviewPopup.remove();
        this.modviewPopup = null;
        off(document, "click", this.modviewPopupClickHandler);
        off(document, "keydown", this.modviewPopupKeyHandler);
        this.modviewPopupClickHandler = null;
        this.modviewPopupKeyHandler = null;
      }
    };

    on(document, "click", this.modviewPopupClickHandler);
    on(document, "keydown", this.modviewPopupKeyHandler);
  }

  handleButtonClick(action, userData) {
    switch (action) {
      case "timeout-10":
        this.parent.resolve("site.chat").ChatService.first.sendMessage(
          `/timeout ${userData.login} 600`
        );
        this.parent.log.info(`[Activity Feed] Timed out ${userData.displayName} for 10 minutes`);
        break;
      case "timeout-60":
        this.parent.resolve("site.chat").ChatService.first.sendMessage(
          `/timeout ${userData.login} 3600`
        );
        this.parent.log.info(`[Activity Feed] Timed out ${userData.displayName} for 1 hour`);
        break;
      case "ban":
        this.parent.resolve("site.chat").ChatService.first.sendMessage(
          `/ban ${userData.login}`
        );
        this.parent.log.info(`[Activity Feed] Banned ${userData.displayName}`);
        break;
      case "profile":
        this.parent.resolve("site.chat").ChatContainer.first.onUsernameClick(userData.login);
        this.parent.log.info("[Activity Feed] Extracted user data for profile:", userData);
        break;
      case "user-id":
        navigator.clipboard.writeText(userData.id);
        notification("", `Copied user ID: ${userData.id}`, 6000);
        break;
      case "close":
        break;
    }

    if (this.modviewPopup) {
      this.modviewPopup.remove();
      this.modviewPopup = null;
      if (this.modviewPopupClickHandler) {
        off(document, "click", this.modviewPopupClickHandler);
        this.modviewPopupClickHandler = null;
      }
      if (this.modviewPopupKeyHandler) {
        off(document, "keydown", this.modviewPopupKeyHandler);
        this.modviewPopupKeyHandler = null;
      }
    }
  }

  updateCSS() {
    if (this.parent.settings.get("addon.trubbel.channel.mod-view-activity_feed")) {
      this.parent.style.set("activity-feed-moderation", `
        .mod-popup {
          position: fixed;
          background: #18181b;
          border: 1px solid #3b3b44;
          border-radius: 4px;
          padding: 10px;
          color: white;
          z-index: 9999;
          width: 200px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
        }
        .mod-popup-user {
          font-weight: bold;
          margin-bottom: 10px;
          padding-bottom: 5px;
          border-bottom: 1px solid #3b3b44;
        }
        .mod-popup-event {
          font-size: 12px;
          color: #adadb8;
        }
        .mod-popup-info {
          font-size: 12px;
          color: #adadb8;
        }
        .mod-popup-button {
          background: #9147ff;
          color: white;
          border: none;
          padding: 5px 10px;
          margin: 5px;
          border-radius: 4px;
          cursor: pointer;
          display: block;
          width: calc(100% - 10px);
          text-align: left;
        }
        .mod-popup-button:hover {
          filter: brightness(1.1);
        }
      `);
    } else {
      this.parent.style.delete("activity-feed-moderation");
    }
  }
}