import { FOLLOWAGE_USERCARD_SELECTOR } from "../../../utilities/constants/selectors";

const { createElement } = FrankerFaceZ.utilities.dom;

export default class FollowedChannels {
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
    this.enableFollowageHandler = this.enableFollowageHandler.bind(this);
    this.disableFollowageHandler = this.disableFollowageHandler.bind(this);
    this.handleSettingChange = this.handleSettingChange.bind(this);
    this.updateFollowingCard = this.updateFollowingCard.bind(this);
    this._updateFollowingCard = this._updateFollowingCard.bind(this);
    this.clearFollowageDate = this.clearFollowageDate.bind(this);
    this.formatDate = this.formatDate.bind(this);

    this.FollowingCard = this.elemental.define(
      "following-card",
      ".channel-follow-listing--card",
      ["dir-following"], null, 0, 0
    );
  }

  initialize() {
    const enabled = this.settings.get("addon.trubbel.directory.following.followed_channels");
    if (enabled) {
      this.handleNavigation();
    } else {
      this.disableFollowageHandler();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.log.info("[Followed Channels] Enabling followage date display");
      this.handleNavigation();
    } else {
      this.log.info("[Followed Channels] Disabling followage date display");
      this.disableFollowageHandler();
    }
  }

  handleNavigation() {
    if (this.router?.current?.name === "dir-following") {
      const enabled = this.settings.get("addon.trubbel.directory.following.followed_channels");
      if (enabled && !this.isActive) {
        this.log.info("[Followed Channels] Entering following directory page, enabling followage handler");
        this.enableFollowageHandler();
      }
    } else {
      if (this.isActive) {
        this.log.info("[Followed Channels] Leaving following directory page, disabling followage handler");
        this.disableFollowageHandler();
      }
    }
  }

  enableFollowageHandler() {
    if (this.isActive) return;

    this.log.info("[Followed Channels] Setting up followage handling");
    this.isActive = true;

    this.FollowingCard.each(el => this.updateFollowingCard(el));
    this.FollowingCard.on("mount", this.updateFollowingCard);
    this.FollowingCard.on("mutate", this.updateFollowingCard);
  }

  updateFollowingCard(el) {
    if (!this.isActive) {
      this.log.debug("[Followed Channels] Not active, skipping followage handling");
      return;
    }

    this.log.info("[Followed Channels] updateFollowingCard called with element:", el);

    this.site.awaitElement(".user-card", el, 5000).then(() => {
      const parent = this.fine.searchParentNode(el, n => n.memoizedProps?.children?.props?.userData?.user);
      if (!parent) {
        this.log.warn("[Followed Channels] No parent with memoizedProps found");
        return;
      }

      this.log.info("[Followed Channels] Found parent with memoizedProps, calling _updateFollowingCard");
      const props = parent.memoizedProps;

      this._updateFollowingCard(el, props, props.children.props.trackingProps).catch(err => {
        this.log.error("[Followed Channels] Async _updateFollowingCard failed:", err);
      });
    }).catch(err => {
      this.log.warn("[Followed Channels] Failed to find required element:", err);
    });
  }

  async _updateFollowingCard(el, item, tracking) {
    this.log.info("[Followed Channels] _updateFollowingCard called - ENTRY POINT");
    try {
      const showFollowage = this.settings.get("addon.trubbel.directory.following.followed_channels");
      this.log.info("[Followed Channels] showFollowage setting:", showFollowage);

      if (!showFollowage) {
        this.log.info("[Followed Channels] Setting disabled, clearing and returning");
        this.clearFollowageDate(el);
        return;
      }

      const userData = item.children.props.userData?.user;
      if (!userData) {
        this.log.warn("[Followed Channels] No userData found in props");
        this.log.info("[Followed Channels] Props structure:", item);
        return;
      }

      this.log.info("[Followed Channels] Found userData for user:", userData.login);

      const followedAt = userData.self?.follower?.followedAt;
      if (!followedAt) {
        this.log.warn("[Followed Channels] No followedAt found for:", userData.login);
        this.log.info("[Followed Channels] userData.self:", userData.self);
        return;
      }

      this.log.info("[Followed Channels] Found followedAt:", followedAt);

      if (el._channel_followage) {
        this.log.info("[Followed Channels] Element already has followage, skipping");
        return;
      }

      this.log.info("[Followed Channels] About to set attributes...");

      if (userData.id) {
        el.setAttribute("data-room-id", userData.id);
        this.log.info("[Followed Channels] Set data-room-id:", userData.id);
      }
      if (userData.login) {
        el.setAttribute("data-room", userData.login);
        this.log.info("[Followed Channels] Set data-room:", userData.login);
      }
      el.setAttribute("data-followed-at", followedAt);
      this.log.info("[Followed Channels] Set data-followed-at:", followedAt);

      const formattedDate = this.formatDate(followedAt);
      this.log.info("[Followed Channels] Formatted date:", formattedDate);

      this.log.info("[Followed Channels] Waiting for username element...");
      let usernameElement;
      try {
        usernameElement = await this.site.awaitElement(FOLLOWAGE_USERCARD_SELECTOR, el, 5000);
        this.log.info("[Followed Channels] awaitElement found username element:", !!usernameElement);
      } catch (awaitError) {
        this.log.error("[Followed Channels] awaitElement failed:", awaitError);
        return;
      }

      if (!usernameElement) {
        this.log.warn("[Followed Channels] Username element not found even after awaiting");
        return;
      }

      this.log.info("[Followed Channels] Username element found, creating followage element...");

      el._channel_followage = (
        <div
          className="channel-followage-date ffz-tooltip"
          data-title={`<span style="font-size:1.4rem;">${this.i18n.formatDateTime(followedAt, "full")}</span>`}
          data-tooltip-type="html"
          style={{
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            overflow: "hidden",
            color: "var(--color-text-overlay)",
            fontSize: "1.3rem",
            lineHeight: 1.5,
            marginTop: "2px"
          }}
        >
          Followed {formattedDate}
        </div>
      );

      this.log.info("[Followed Channels] Attempting to insert element...");
      try {
        usernameElement.parentNode.insertBefore(el._channel_followage, usernameElement.nextSibling);
        this.log.info("[Followed Channels] Element inserted successfully!");

        const checkElement = el.querySelector(".channel-followage-date");
        this.log.info("[Followed Channels] Element found in DOM after insert:", !!checkElement);

      } catch (insertError) {
        this.log.error("[Followed Channels] Insert failed:", insertError);
        this.log.info("[Followed Channels] Trying appendChild instead...");
        try {
          usernameElement.parentNode.appendChild(el._channel_followage);
          this.log.info("[Followed Channels] appendChild successful!");
        } catch (appendError) {
          this.log.error("[Followed Channels] appendChild failed too:", appendError);
        }
      }

      this.log.info("[Followed Channels] _updateFollowingCard completed successfully");
    } catch (err) {
      this.log.error("[Followed Channels] Error in _updateFollowingCard:", err);
      this.log.error("[Followed Channels] Error stack:", err.stack);
    }
  }

  disableFollowageHandler() {
    if (!this.isActive) return;

    this.log.info("[Followed Channels] Removing followage handling");
    this.isActive = false;

    this.FollowingCard.off("mount", this.updateFollowingCard);
    this.FollowingCard.off("mutate", this.updateFollowingCard);

    this.FollowingCard.each(inst => {
      this.clearFollowageDate(inst);
    });

    this.removeExistingFollowage();
  }

  removeExistingFollowage() {
    const existingFollowage = document.querySelectorAll(".channel-followage-date");
    existingFollowage.forEach(element => {
      element.remove();
    });
  }

  clearFollowageDate(el) {
    if (el._channel_followage) {
      this.log.debug("[Followed Channels] Clearing followage date from card");
      el._channel_followage.remove();
      el._channel_followage = null;
    }

    el.removeAttribute("data-room-id");
    el.removeAttribute("data-room");
    el.removeAttribute("data-followed-at");
    el.removeAttribute("data-followage-processed");
  }

  formatDate(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }
}