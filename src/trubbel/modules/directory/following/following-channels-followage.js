import { FOLLOWAGE_USERCARD_SELECTOR } from "../../../utilities/constants/selectors";

const { createElement } = FrankerFaceZ.utilities.dom;

export class FollowingChannelsFollowage {
  constructor(parent) {
    this.parent = parent;

    this.updateFollowingCards = this.updateFollowingCards.bind(this);
    this.updateFollowingCard = this.updateFollowingCard.bind(this);
    this._updateFollowingCard = this._updateFollowingCard.bind(this);
    this.clearFollowageDate = this.clearFollowageDate.bind(this);
    this.formatDate = this.formatDate.bind(this);
  }

  initialize() {
    const enabled = this.parent.settings.get("addon.trubbel.directory.show-followage");
    if (enabled) {
      this.parent.log.info("[Follow Date] Initializing follow date display");
      this.updateFollowingCards();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.parent.log.info("[Follow Date] Enabling follow date display");
      this.updateFollowingCards();
    } else {
      this.parent.log.info("[Follow Date] Disabling follow date display");
      this.clearAllFollowageDates();
    }
  }

  clearAllFollowageDates() {
    this.parent.FollowingCard.each(el => this.clearFollowageDate(el));
  }

  updateFollowingCards() {
    this.parent.FollowingCard.each(el => this.updateFollowingCard(el));
    this.parent.emit(":update-cards");
  }

  updateFollowingCard(el) {
    this.parent.log.info("[Directory] updateFollowingCard called with element:", el);

    const parent = this.parent.fine.searchParentNode(el, n => n.memoizedProps?.children?.props?.userData?.user);
    if (!parent) {
      this.parent.log.warn("[Directory] No parent with memoizedProps found");
      return;
    }

    this.parent.log.info("[Directory] Found parent with memoizedProps, calling _updateFollowingCard");
    const props = parent.memoizedProps;

    this._updateFollowingCard(el, props, props.children.props.trackingProps).catch(err => {
      this.parent.log.error("[Directory] Async _updateFollowingCard failed:", err);
    });
  }

  async _updateFollowingCard(el, item, tracking) {
    this.parent.log.info("[Directory] _updateFollowingCard called - ENTRY POINT");
    try {
      const showFollowage = this.parent.settings.get("addon.trubbel.directory.show-followage");
      this.parent.log.info("[Directory] showFollowage setting:", showFollowage);

      if (!showFollowage) {
        this.parent.log.info("[Directory] Setting disabled, clearing and returning");
        this.clearFollowageDate(el);
        return;
      }

      const userData = item.children.props.userData?.user;
      if (!userData) {
        this.parent.log.warn("[Directory] No userData found in props");
        this.parent.log.info("[Directory] Props structure:", item);
        return;
      }

      this.parent.log.info("[Directory] Found userData for user:", userData.login);

      const followedAt = userData.self?.follower?.followedAt;
      if (!followedAt) {
        this.parent.log.warn("[Directory] No followedAt found for:", userData.login);
        this.parent.log.info("[Directory] userData.self:", userData.self);
        return;
      }

      this.parent.log.info("[Directory] Found followedAt:", followedAt);

      if (el._channel_followage) {
        this.parent.log.info("[Directory] Element already has followage, skipping");
        return;
      }

      this.parent.log.info("[Directory] About to set attributes...");

      if (userData.id) {
        el.setAttribute("data-room-id", userData.id);
        this.parent.log.info("[Directory] Set data-room-id:", userData.id);
      }
      if (userData.login) {
        el.setAttribute("data-room", userData.login);
        this.parent.log.info("[Directory] Set data-room:", userData.login);
      }
      el.setAttribute("data-followed-at", followedAt);
      this.parent.log.info("[Directory] Set data-followed-at:", followedAt);

      const formattedDate = this.formatDate(followedAt);
      this.parent.log.info("[Directory] Formatted date:", formattedDate);

      this.parent.log.info("[Directory] Waiting for username element...");
      let usernameElement;
      try {
        usernameElement = await this.parent.site.awaitElement(FOLLOWAGE_USERCARD_SELECTOR, el, 5000);
        this.parent.log.info("[Directory] awaitElement found username element:", !!usernameElement);
      } catch (awaitError) {
        this.parent.log.error("[Directory] awaitElement failed:", awaitError);
        return;
      }

      if (!usernameElement) {
        this.parent.log.warn("[Directory] Username element not found even after awaiting");
        return;
      }

      this.parent.log.info("[Directory] Username element found, creating followage element...");

      el._channel_followage = (
        <div
          className="channel-followage-date ffz-tooltip"
          data-title={this.parent.i18n.formatDateTime(followedAt, "full")}
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

      this.parent.log.info("[Directory] Attempting to insert element...");
      try {
        usernameElement.parentNode.insertBefore(el._channel_followage, usernameElement.nextSibling);
        this.parent.log.info("[Directory] Element inserted successfully!");

        const checkElement = el.querySelector(".channel-followage-date");
        this.parent.log.info("[Directory] Element found in DOM after insert:", !!checkElement);

      } catch (insertError) {
        this.parent.log.error("[Directory] Insert failed:", insertError);
        this.parent.log.info("[Directory] Trying appendChild instead...");
        try {
          usernameElement.parentNode.appendChild(el._channel_followage);
          this.parent.log.info("[Directory] appendChild successful!");
        } catch (appendError) {
          this.parent.log.error("[Directory] appendChild failed too:", appendError);
        }
      }

      this.parent.log.info("[Directory] _updateFollowingCard completed successfully");
    } catch (err) {
      this.parent.log.error("[Directory] Error in _updateFollowingCard:", err);
      this.parent.log.error("[Directory] Error stack:", err.stack);
    }
  }

  clearFollowageDate(el) {
    if (el._channel_followage) {
      this.parent.log.debug("[Follow Date] Clearing followage date from card");
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