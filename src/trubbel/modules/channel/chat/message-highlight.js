import { BAD_USERS } from "../../../utilities/constants/types";

const { createElement, on, off } = FrankerFaceZ.utilities.dom;

export default class MessageHighlight {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.scroller = parent.scroller;
    this.router = parent.router;
    this.style = parent.style;
    this.site = parent.site;
    this.log = parent.log;

    this.isActive = false;
    this.currentHoveredUser = null;

    this.handleNavigation = this.handleNavigation.bind(this);
    this.enableMessageHighlight = this.enableMessageHighlight.bind(this);
    this.disableMessageHighlight = this.disableMessageHighlight.bind(this);
    this.handleSettingChange = this.handleSettingChange.bind(this);
    this.handleMessageHover = this.handleMessageHover.bind(this);
    this.handleMessageLeave = this.handleMessageLeave.bind(this);
    this.onScrollerMount = this.onScrollerMount.bind(this);
    this.onScrollerUnmount = this.onScrollerUnmount.bind(this);
  }

  initialize() {
    const enabled = this.settings.get("addon.trubbel.channel.chat.messages.highlight");
    if (enabled > 0) {
      this.handleNavigation();
    } else {
      this.disableMessageHighlight();
    }
  }

  handleSettingChange(enabled) {
    if (enabled > 0) {
      this.log.info("[Message Highlight] Enabling message highlight");
      this.handleNavigation();
    } else {
      this.log.info("[Message Highlight] Disabling message highlight");
      this.disableMessageHighlight();
    }
  }

  handleNavigation() {
    const chatRoutes = this.site.constructor.CHAT_ROUTES;
    const currentRoute = this.router?.current?.name;

    let pathname;

    if (this.router?.match && this.router.match[1]) {
      pathname = this.router.match[1];
    } else {
      const location = this.router?.location;
      const segment = location?.split("/").filter(segment => segment.length > 0);
      pathname = segment?.[0];
    }

    if (chatRoutes.includes(currentRoute) && pathname && !BAD_USERS.includes(pathname)) {
      const enabled = this.settings.get("addon.trubbel.channel.chat.messages.highlight");
      if (enabled > 0 && !this.isActive) {
        this.log.info("[Message Highlight] Entering chat page, enabling message highlight");
        this.enableMessageHighlight();
      }
    } else {
      if (this.isActive) {
        this.log.info("[Message Highlight] Leaving chat page, disabling message highlight");
        this.disableMessageHighlight();
      }
    }
  }

  enableMessageHighlight() {
    if (this.isActive) return;

    this.log.info("[Message Highlight] Setting up message highlight");
    this.isActive = true;

    this.scroller.ChatScroller.on("mount", this.onScrollerMount, this);
    this.scroller.ChatScroller.on("unmount", this.onScrollerUnmount, this);

    for (const inst of this.scroller.ChatScroller.instances) {
      this.onScrollerMount(inst);
    }
  }

  disableMessageHighlight() {
    if (!this.isActive) return;

    this.log.info("[Message Highlight] Removing message highlight");
    this.isActive = false;

    if (this.currentHoveredUser) {
      this.style.delete("trubbel-message-highlight");
      this.currentHoveredUser = null;
    }

    for (const inst of this.scroller.ChatScroller.instances) {
      this.onScrollerUnmount(inst);
    }

    this.scroller.ChatScroller.off("mount", this.onScrollerMount, this);
    this.scroller.ChatScroller.off("unmount", this.onScrollerUnmount, this);
  }

  onScrollerMount(inst) {
    if (!this.isActive) return;

    const node = this.scroller.fine.getChildNode(inst);
    if (!node) return;

    const chatContainer = node.querySelector(".chat-scrollable-area__message-container");
    if (chatContainer) {
      on(chatContainer, "mouseover", this.handleMessageHover);
      on(chatContainer, "mouseout", this.handleMessageLeave);

      chatContainer._trubbel_highlight_attached = true;
    }
  }

  onScrollerUnmount(inst) {
    const node = this.scroller.fine.getChildNode(inst);
    if (!node) return;

    const chatContainer = node.querySelector(".chat-scrollable-area__message-container");
    if (chatContainer && chatContainer._trubbel_highlight_attached) {
      off(chatContainer, "mouseover", this.handleMessageHover);
      off(chatContainer, "mouseout", this.handleMessageLeave);
      delete chatContainer._trubbel_highlight_attached;
    }
  }

  handleMessageHover(event) {
    if (!this.isActive) return;

    const highlightMode = this.settings.get("addon.trubbel.channel.chat.messages.highlight");

    let target;
    if (highlightMode === 1) {
      // Usernames only
      target = event.target.closest(".chat-line__username");
    } else if (highlightMode === 2) {
      // Entire messages
      target = event.target.closest(".chat-line__message");
    }

    if (!target) return;

    const messageLine = target.closest(".chat-line__message");
    if (!messageLine) return;

    const username = messageLine.dataset.user;
    if (!username || username === this.currentHoveredUser) return;

    this.currentHoveredUser = username;
    this.applyHighlight(username);
  }

  handleMessageLeave(event) {
    if (!this.isActive || !this.currentHoveredUser) return;

    const highlightMode = this.settings.get("addon.trubbel.channel.chat.messages.highlight");

    let target;
    if (highlightMode === 1) {
      // Usernames only
      target = event.target.closest(".chat-line__username");
    } else if (highlightMode === 2) {
      // Entire messages
      target = event.target.closest(".chat-line__message");
    }

    if (!target) return;

    const relatedTarget = event.relatedTarget;
    if (relatedTarget) {
      if (highlightMode === 1 && relatedTarget.closest(".chat-line__username")) return;
      if (highlightMode === 2 && relatedTarget.closest(".chat-line__message")) return;
    }

    this.currentHoveredUser = null;
    this.style.delete("trubbel-message-highlight");
  }

  applyHighlight(username) {
    const color = this.settings.get("addon.trubbel.channel.chat.messages.highlight.color");
    if (!color) return;

    this.style.set("trubbel-message-highlight", `
      body .chat-room .chat-scrollable-area__message-container > div:nth-child(1n+0) > .chat-line__message:not(.chat-line--inline)[data-user="${username}"],
      body .chat-room .chat-scrollable-area__message-container > div:nth-child(1n+0) > div > .chat-line__message:not(.chat-line--inline)[data-user="${username}"],
      body .chat-room .chat-line__message:not(.chat-line--inline):nth-child(1n+0)[data-user="${username}"] {
        background-color: ${color} !important;
      }
    `);
  }
}