const { createElement, on, off } = FrankerFaceZ.utilities.dom;

export class BTTVModeration {
  constructor(parent) {
    this.parent = parent;
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
    this.updateHighlightCSS = this.updateHighlightCSS.bind(this);
  }

  initialize() {
    const enabled = this.parent.settings.get("addon.trubbel.channel.chat-moderation-bttv");
    if (enabled) {
      this.handleNavigation();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.parent.log.info("[BTTV Moderation] Enabling BTTV-like mod actions");
      this.handleNavigation();
    } else {
      this.parent.log.info("[BTTV Moderation] Disabling BTTV-like mod actions");
      this.disableBTTVModeration();
    }
  }

  updateHighlightCSS() {
    if (this.parent.settings.get("addon.trubbel.channel.chat-moderation-bttv")) {
      this.parent.style.set("bttv-moderation-highlight", `
      .trubbel-bttv-mod-highlight {
        background-color: ${this.parent.settings.get("addon.trubbel.channel.chat-moderation-bttv-message-highlight")};
        transition: background-color 0.2s ease;
      }
    `);
    } else {
      this.parent.style.delete("bttv-moderation-highlight");
    }
  }

  highlightMessage(messageElement) {
    this.removeMessageHighlight();
    messageElement.classList.add("trubbel-bttv-mod-highlight");
    this.highlightedMessage = messageElement;
  }

  removeMessageHighlight() {
    if (this.highlightedMessage) {
      this.highlightedMessage.classList.remove("trubbel-bttv-mod-highlight");
      this.highlightedMessage = null;
    }
  }

  handleNavigation() {
    const chatRoutes = this.parent.site.constructor.CHAT_ROUTES;
    if (chatRoutes.includes(this.parent.router?.current?.name)) {
      const enabled = this.parent.settings.get("addon.trubbel.channel.chat-moderation-bttv");
      if (enabled && !this.isActive) {
        this.parent.log.info("[BTTV Moderation] Entering user page, enabling BTTV moderation:", this.parent.router?.current?.name);
        this.enableBTTVModeration();
      }
    } else {
      if (this.isActive) {
        this.parent.log.info("[BTTV Moderation] Leaving user page, disabling BTTV moderation");
        this.disableBTTVModeration();
      }
    }
  }

  enableBTTVModeration() {
    if (this.isActive) return;

    this.parent.log.info("[BTTV Moderation] Setting up right-click event listener");
    on(document, "contextmenu", this.onRightClick);
    this.isActive = true;
    this.updateHighlightCSS();
  }

  disableBTTVModeration() {
    if (!this.isActive) return;

    this.parent.log.info("[BTTV Moderation] Removing right-click event listener");
    off(document, "contextmenu", this.onRightClick);

    if (this.sliderContainer) {
      this.sliderContainer.remove();
      this.sliderContainer = null;
    }

    this.removeMessageHighlight();
    this.updateHighlightCSS();

    this.isActive = false;
  }

  getChatMessageObject(element) {
    try {
      const instance = this.parent.site.fine.getReactInstance(element);
      if (!instance?.return) {
        return null;
      }
      const props = instance.return.memoizedProps || instance.return.pendingProps;
      if (props?.message) {
        return props;
      }
      return null;
    } catch (err) {
      this.parent.log.error("[BTTV Moderation]: Error getting chat message object:", err);
      return null;
    }
  }

  onRightClick(event) {
    if (!this.parent.settings.get("addon.trubbel.channel.chat-moderation-bttv") || !this.isActive) return;
    if (event.ctrlKey || event.shiftKey) return;

    const settingValue = this.parent.settings.get("addon.trubbel.channel.chat-moderation-bttv-options");
    const selectors = {
      usernames: ".chat-line__message .chat-line__username",
      messages1: ".chat-line__message",
      messages2: ".chat-line__message"
    };
    const selector = event.target.closest(selectors[settingValue]);
    if (!selector) return;

    // Rich content embeds and links
    if (
      settingValue === "messages2" &&
      event.target.closest(".ffz-tooltip.link-fragment, .ffz--chat-card")
    ) {
      return;
    }

    const element = event.target;
    const chatMessage = element.closest(".chat-line__message");
    if (!chatMessage) return;

    event.preventDefault();
    event.stopPropagation();

    const messageObject = this.getChatMessageObject(chatMessage);
    if (!messageObject) {
      this.parent.log.error("[BTTV Moderation]: Could not get message object from React");
      this.parent.log.error("[BTTV Moderation]: Could not get message object from React (target)", element);
      return;
    }

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

    // Show the timeout slider
    this.showTimeoutSlider(event, messageData, chatMessage);
  }

  createTimeoutSlider(event, messageData) {
    const sliderHeight = 224;
    const sliderWidth = 90;

    // Create the main container
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

    // Create the slider track container
    const sliderContainer = createElement("div", {
      style: {
        height: `${sliderHeight}px`,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden"
      }
    });

    // Create the action display text
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

    // Create the slider track
    const sliderTrack = createElement("div", {
      className: "slider-track",
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column"
      }
    });

    // Ban zone (top) - 10% height
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

    // Timeout zone (middle) - 70% height
    const timeoutZone = createElement("div", {
      className: "zone timeout-zone",
      style: {
        width: "100%",
        height: "70%",
        flexShrink: "0"
      }
    });

    // Purge zone - 10% height
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

    // Delete zone (bottom) - 10% height
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

    // Create cursor indicator
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