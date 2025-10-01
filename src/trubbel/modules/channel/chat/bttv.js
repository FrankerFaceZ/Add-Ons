const { createElement, on, off } = FrankerFaceZ.utilities.dom;

export default class BTTVModeration {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.router = parent.router;
    this.chat = parent.chat;
    this.fine = parent.fine;
    this.site = parent.site;
    this.log = parent.log;

    this.isActive = false;
    this.sliderContainer = null;
    this.highlightedMessage = null;

    this.onRightClick = this.onRightClick.bind(this);
    this.getChatMessageObject = this.getChatMessageObject.bind(this);
    this.createTimeoutSlider = this.createTimeoutSlider.bind(this);
    this.showTimeoutSlider = this.showTimeoutSlider.bind(this);
    this.enableBTTVModeration = this.enableBTTVModeration.bind(this);
    this.disableBTTVModeration = this.disableBTTVModeration.bind(this);
    this.highlightMessage = this.highlightMessage.bind(this);
    this.removeMessageHighlight = this.removeMessageHighlight.bind(this);

    this.highlightTokenizer = {
      type: "bttv_moderation_highlight",
      priority: 0,
      process(tokens, msg) {
        if (msg._bttvModerationHighlight) {
          const priority = msg._bttvModerationHighlight.priority;
          const color = msg._bttvModerationHighlight.color;

          this.applyHighlight(msg, priority, color, "bttv-moderation");
        }

        return tokens;
      }
    };
  }

  initialize() {
    this.chat.addHighlightReason("bttv-moderation", "BTTV Moderation Highlight");
    const enabled = this.settings.get("addon.trubbel.channel.chat.moderation.context");
    if (enabled) {
      this.handleNavigation();
    } else {
      this.disableBTTVModeration();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.log.info("[BTTV Moderation] Enabling BTTV-like mod actions");
      this.handleNavigation();
    } else {
      this.log.info("[BTTV Moderation] Disabling BTTV-like mod actions");
      this.disableBTTVModeration();
    }
  }

  handleNavigation() {
    const chatRoutes = this.site.constructor.CHAT_ROUTES;
    if (chatRoutes.includes(this.router?.current?.name)) {
      const enabled = this.settings.get("addon.trubbel.channel.chat.moderation.context");
      if (enabled && !this.isActive) {
        this.log.info("[BTTV Moderation] Entering user page, enabling BTTV moderation");
        this.enableBTTVModeration();
      }
    } else {
      if (this.isActive) {
        this.log.info("[BTTV Moderation] Leaving user page, disabling BTTV moderation");
        this.disableBTTVModeration();
      }
    }
  }

  highlightMessage(messageElement) {
    this.removeMessageHighlight();

    const messageObject = this.getChatMessageObject(messageElement);
    if (messageObject?.message) {
      const priority = this.settings.get("addon.trubbel.channel.chat.moderation.context.priority");
      const color = this.settings.get("addon.trubbel.channel.chat.moderation.context.highlight");

      messageObject.message._bttvModerationHighlight = {
        priority: priority,
        color: color
      };

      this.parent.emit("chat:update-lines");
    }

    this.highlightedMessage = messageElement;
  }

  removeMessageHighlight() {
    if (this.highlightedMessage) {
      const messageObject = this.getChatMessageObject(this.highlightedMessage);
      if (messageObject?.message) {
        delete messageObject.message._bttvModerationHighlight;
        this.parent.emit("chat:update-lines");
      }
      this.highlightedMessage = null;
    }
  }

  enableBTTVModeration() {
    if (this.isActive) return;

    on(document, "contextmenu", this.onRightClick);

    this.chat.addTokenizer(this.highlightTokenizer);
    this.isActive = true;
  }

  disableBTTVModeration() {
    if (!this.isActive) return;

    off(document, "contextmenu", this.onRightClick);

    this.chat.removeTokenizer(this.highlightTokenizer);

    if (this.sliderContainer) {
      this.sliderContainer.remove();
      this.sliderContainer = null;
    }

    this.removeMessageHighlight();

    this.isActive = false;
  }

  getChatMessageObject(element) {
    try {
      const instance = this.site.fine.getReactInstance(element);
      if (!instance?.return) {
        return null;
      }
      const props = instance.return.memoizedProps || instance.return.pendingProps;
      if (props?.message) {
        return props;
      }
      return null;
    } catch (err) {
      this.log.error("[BTTV Moderation]: Error getting chat message object:", err);
      return null;
    }
  }

  onRightClick(event) {
    if (!this.settings.get("addon.trubbel.channel.chat.moderation.context") || !this.isActive) return;
    if (event.ctrlKey || event.shiftKey) return;

    // Prevent firing on recent messages in viewer cards
    if (event.target.closest(".trubbel-previous-messages .message-list")) return;

    const settingValue = this.settings.get("addon.trubbel.channel.chat.moderation.context.options");
    const selectors = {
      usernames: ".chat-line__message .chat-line__username",
      messages1: ".chat-line__message",
      messages2: ".chat-line__message"
    };
    const selector = event.target.closest(selectors[settingValue]);
    if (!selector) return;

    if (
      settingValue === "messages2" &&
      event.target.closest(".ffz-tooltip.link-fragment, .ffz--chat-card")
    ) {
      return;
    }

    const element = event.target;
    const chatMessage = element.closest(".chat-line__message");
    if (!chatMessage) return;

    if (chatMessage.querySelector(".live-message-separator-line__hr")) return;

    event.preventDefault();
    event.stopPropagation();

    const messageObject = this.getChatMessageObject(chatMessage);
    if (!messageObject) {
      this.log.error("[BTTV Moderation]: Could not get message object from React");
      this.log.error("[BTTV Moderation]: Could not get message object from React (target)", element);
      return;
    }

    this.log.info("[BTTV Moderation]: messageObject:", messageObject);
    this.log.info("[BTTV Moderation]: messageObject type:", messageObject?.message?.type);

    const messageData = {
      roomId: messageObject.channelID,
      room: messageObject.channelLogin,
      color: messageObject.message?.user?.color,
      isIntl: messageObject.message?.user?.isIntl,
      isSubscriber: messageObject.message?.user?.isSubscriber,
      userLogin: messageObject.message?.user?.userLogin,
      userDisplayName: messageObject.message?.user?.userDisplayName,
      userId: messageObject.message?.user?.userID,
      userType: messageObject.message?.user?.userType,
      messageBody: messageObject.message?.messageBody,
      messageId: messageObject.message?.id,
      messageDeleted: messageObject.message?.deleted,
      timestamp: messageObject.message?.timestamp
    };

    this.showTimeoutSlider(event, messageData, chatMessage);
  }

  createTimeoutSlider(event, messageData) {
    const sliderHeight = 224;
    const sliderWidth = 90;

    const slider = createElement("div", {
      className: "trubbel-timeout-slider",
      style: {
        position: "fixed",
        width: `${sliderWidth}px`,
        height: `${sliderHeight}px`,
        backgroundColor: "rgba(200, 200, 200, 0.2)",
        backdropFilter: "blur(5px)",
        webkitBackdropFilter: "blur(5px)",
        borderRadius: "8px",
        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.5)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        zIndex: "99999",
        top: `${event.clientY}px`,
        left: `${event.clientX}px`
      }
    });

    const sliderContainer = createElement("div", {
      style: {
        height: `${sliderHeight}px`,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden"
      }
    });

    const actionDisplay = createElement("div", {
      className: "action-display",
      style: {
        position: "absolute",
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        width: "calc(100% - 8px)",
        textAlign: "center",
        color: "white",
        fontWeight: "bold",
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: "2",
        textShadow: "0 0 3px black",
        pointerEvents: "none",
        padding: "6px 0",
        borderRadius: "4px",
        margin: "0 4px"
      }
    }, "CANCEL");

    const sliderTrack = createElement("div", {
      className: "slider-track",
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column"
      }
    });

    const banZone = createElement("div", {
      className: "zone ban-zone",
      style: {
        width: "100%",
        height: "10%",
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: "0"
      }
    });

    const banText = createElement("span", {
      style: {
        color: "white",
        fontSize: "12px",
        fontWeight: "bold",
        textShadow: "0 0 2px black",
        pointerEvents: "none"
      }
    }, "BAN");
    banZone.appendChild(banText);

    const timeoutZone = createElement("div", {
      className: "zone timeout-zone",
      style: {
        width: "100%",
        height: "70%",
        flexShrink: "0"
      }
    });

    const purgeZone = createElement("div", {
      className: "zone purge-zone",
      style: {
        width: "100%",
        height: "10%",
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: "0"
      }
    });

    const purgeText = createElement("span", {
      style: {
        color: "white",
        fontSize: "12px",
        fontWeight: "bold",
        textShadow: "0 0 2px black",
        pointerEvents: "none"
      }
    }, "PURGE");
    purgeZone.appendChild(purgeText);

    const deleteZone = createElement("div", {
      className: "zone delete-zone",
      style: {
        width: "100%",
        height: "10%",
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: "0"
      }
    });

    const deleteText = createElement("span", {
      style: {
        color: "white",
        fontSize: "12px",
        fontWeight: "bold",
        textShadow: "0 0 2px black",
        pointerEvents: "none"
      }
    }, "DELETE");
    deleteZone.appendChild(deleteText);

    const cursorIndicator = createElement("div", {
      className: "cursor-indicator",
      style: {
        position: "absolute",
        width: "calc(100% - 8px)",
        height: "2px",
        zIndex: "3",
        backgroundColor: "white",
        pointerEvents: "none",
        top: "0px",
        left: "4px",
        borderRadius: "1px",
        boxShadow: "0 0 4px rgba(0,0,0,0.5)"
      }
    });

    sliderTrack.appendChild(banZone);
    sliderTrack.appendChild(timeoutZone);
    sliderTrack.appendChild(purgeZone);
    sliderTrack.appendChild(deleteZone);
    sliderContainer.appendChild(sliderTrack);
    sliderContainer.appendChild(actionDisplay);
    sliderContainer.appendChild(cursorIndicator);
    slider.appendChild(sliderContainer);

    let cursorY = 0;
    let action = {
      type: "cancel",
      length: 0,
      text: "CANCEL"
    };

    on(slider, "mousemove", (e) => {
      const sliderRect = slider.getBoundingClientRect();
      const offsetY = e.clientY - sliderRect.top;
      const offsetX = e.clientX - sliderRect.left;
      const totalHeight = sliderHeight;

      if (offsetY < 0) {
        action = { type: "cancel", length: 0, text: "CANCEL" };
        cursorIndicator.style.display = "none";
      } else {
        cursorIndicator.style.display = "block";

        cursorY = offsetY;
        cursorIndicator.style.top = `${offsetY}px`;

        const positionPercent = (offsetY / totalHeight) * 100;

        if (offsetX < 0 || offsetX > sliderRect.width || offsetY < 0 || offsetY > totalHeight) {
          action = { type: "cancel", length: 0, text: "CANCEL" };
        } else if (positionPercent < 10) {
          action = { type: "ban", length: 0, text: "BAN" };
        } else if (positionPercent >= 10 && positionPercent < 80) {
          const zonePosition = (80 - positionPercent) / 70;
          let time;

          if (zonePosition >= 0.75) {
            const daysPosition = (zonePosition - 0.75) / 0.25;
            const days = Math.min(14, Math.round(1 + daysPosition * 13));
            time = days * 86400;
          } else if (zonePosition >= 0.4) {
            const hoursPosition = (zonePosition - 0.4) / 0.35;
            const hours = Math.floor(1 + hoursPosition * 23);
            time = hours * 3600;
          } else {
            const minutesPosition = zonePosition / 0.4;
            const minutes = Math.floor(1 + minutesPosition * 59);
            time = minutes * 60;
          }

          if (positionPercent <= 10.5) {
            time = 1209600; // 14 days
          }

          time = Math.max(60, Math.min(1209600, time));

          let humanTime;
          if (time >= 86400) {
            const days = Math.floor(time / 86400);
            humanTime = days === 1 ? "1 Day" : `${days} Days`;
          } else if (time >= 3600) {
            const hours = Math.floor(time / 3600);
            humanTime = hours === 1 ? "1 Hour" : `${hours} Hours`;
          } else {
            const mins = Math.floor(time / 60);
            humanTime = mins === 1 ? "1 Minute" : `${mins} Minutes`;
          }

          action = { type: "timeout", length: time, text: humanTime };
        } else if (positionPercent >= 80 && positionPercent < 90) {
          action = { type: "timeout", length: 1, text: "PURGE" };
        } else {
          action = { type: "delete", length: 0, text: "DELETE" };
        }
      }

      actionDisplay.textContent = action.text;
    });

    on(slider, "mousedown", (e) => {
      if (e.button === 2) return;

      if (action.type === "cancel") {
        this.closeMenu();
        return;
      }

      if (action.type === "ban") {
        const reason = e.shiftKey ? this.promptForReason("ban") : "";
        this.parent.resolve("site.chat").ChatService.first.sendMessage(
          `/ban ${messageData.userLogin}${reason ? ` ${reason}` : ""}`
        );
      } else if (action.type === "timeout") {
        const reason = e.shiftKey ? this.promptForReason("timeout") : "";
        this.parent.resolve("site.chat").ChatService.first.sendMessage(
          `/timeout ${messageData.userLogin} ${action.length}${reason ? ` ${reason}` : ""}`
        );
      } else if (action.type === "delete") {
        this.parent.resolve("site.chat").ChatService.first.sendMessage(
          `/delete ${messageData.messageId}`
        );
      }

      this.closeMenu();
    });

    const handleOutsideClick = (e) => {
      if (slider && !slider.contains(e.target)) {
        this.closeMenu();
      }
    };

    const handleKeydown = (e) => {
      if (e.key === "Escape") {
        this.closeMenu();
      }
    };

    slider._handleOutsideClick = handleOutsideClick;
    slider._handleKeydown = handleKeydown;

    on(document, "click", handleOutsideClick);
    on(document, "keydown", handleKeydown);

    return slider;
  }

  promptForReason(actionType) {
    return prompt(`Enter ${actionType} reason: (leave blank for none)`) || "";
  }

  closeMenu() {
    if (this.sliderContainer) {
      if (this.sliderContainer._handleOutsideClick) {
        off(document, "click", this.sliderContainer._handleOutsideClick);
      }
      if (this.sliderContainer._handleKeydown) {
        off(document, "keydown", this.sliderContainer._handleKeydown);
      }

      this.sliderContainer.remove();
      this.sliderContainer = null;
      this.removeMessageHighlight();
    }
  }

  showTimeoutSlider(event, messageData, chatMessage) {
    if (this.sliderContainer) {
      this.closeMenu();
    }

    if (chatMessage) {
      this.highlightMessage(chatMessage);
    }

    const slider = this.createTimeoutSlider(event, messageData);

    const sliderHeight = 224;
    const sliderWidth = 90;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = event.clientX;
    let top = event.clientY;

    if (left + sliderWidth > viewportWidth) {
      left = Math.max(0, viewportWidth - sliderWidth - 5);
    }

    if (top + sliderHeight > viewportHeight) {
      top = Math.max(0, viewportHeight - sliderHeight - 5);
    }

    slider.style.top = `${top}px`;
    slider.style.left = `${left}px`;

    document.body.appendChild(slider);
    this.sliderContainer = slider;
  }
}