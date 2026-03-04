import { BAD_USERS } from "../../../utilities/constants/types";

const { createElement, setChildren } = FrankerFaceZ.utilities.dom;

export default class TimestampHandler {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.router = parent.router;
    this.chat = parent.chat;
    this.fine = parent.fine;
    this.site = parent.site;
    this.log = parent.log;

    this.isActive = false;

    this.handleNavigation = this.handleNavigation.bind(this);
    this.enableTimestampHandler = this.enableTimestampHandler.bind(this);
    this.disableTimestampHandler = this.disableTimestampHandler.bind(this);
    this.handleSettingChange = this.handleSettingChange.bind(this);
    this.addTimestampToMessage = this.addTimestampToMessage.bind(this);

    this.ChatLine = this.fine.define(
      "chat-line-timestamp",
      n => n.renderDefaultMessage || n.props?.message,
      this.site.constructor.CHAT_ROUTES
    );

    this.StatusLine = this.fine.define(
      "status-line-timestamp",
      n => n.renderDefaultMessage && n.getSharedChatMessageEventProps,
      this.site.constructor.CHAT_ROUTES
    );
  }

  initialize() {
    const enabled = this.settings.get("addon.trubbel.channel.chat.timestamps.add_missing");
    if (enabled) {
      this.handleNavigation();
    } else {
      this.disableTimestampHandler();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.log.info("[Timestamp Handler] Enabling missing timestamp addition");
      this.handleNavigation();
    } else {
      this.log.info("[Timestamp Handler] Disabling missing timestamp addition");
      this.disableTimestampHandler();
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
      const enabled = this.settings.get("addon.trubbel.channel.chat.timestamps.add_missing");
      if (enabled && !this.isActive) {
        this.log.info("[Timestamp Handler] Entering chat page, enabling timestamp handler");
        this.enableTimestampHandler();
      }
    } else {
      if (this.isActive) {
        this.log.info("[Timestamp Handler] Leaving chat page, disabling timestamp handler");
        this.disableTimestampHandler();
      }
    }
  }

  enableTimestampHandler() {
    if (this.isActive) return;

    this.log.info("[Timestamp Handler] Setting up timestamp handling");
    this.isActive = true;

    this.ChatLine.each(inst => this.addTimestampToMessage(inst));
    this.StatusLine.each(inst => this.addTimestampToMessage(inst));

    this.ChatLine.on("mount", this.addTimestampToMessage);
    this.ChatLine.on("update", this.addTimestampToMessage);

    this.StatusLine.on("mount", this.addTimestampToMessage);
    this.StatusLine.on("update", this.addTimestampToMessage);
  }

  addTimestampToMessage(inst) {
    if (!this.isActive) return;

    const chatModule = this.parent.resolve("chat");
    const want_ts = chatModule?.context.get("chat.extra-timestamps");
    if (!want_ts) return;

    const message = inst.props?.message;
    const messageId = message?.id;

    if (messageId && inst._trubbel_timestamp_msg_id === messageId) return;

    const hostNode = this.fine.getHostNode(inst);
    if (!hostNode) return;

    const statusElement = hostNode.querySelector(".chat-line__status")
      || hostNode.closest(".chat-line__status");
    const messageElement = hostNode.querySelector(".chat-line__message")
      || hostNode.closest(".chat-line__message");

    const targetElement = statusElement || messageElement;
    if (!targetElement) return;

    const existingTimestamp = targetElement.querySelector(".chat-line__timestamp");
    if (existingTimestamp) {
      if (messageId) inst._trubbel_timestamp_msg_id = messageId;
      return;
    }

    const timestamp = createElement("span");
    timestamp.className = "chat-line__timestamp";
    timestamp.textContent = chatModule.formatTime(message?.timestamp || Date.now());

    const existingChildren = Array.from(targetElement.childNodes);
    setChildren(targetElement, [timestamp, ...existingChildren]);

    if (messageId) inst._trubbel_timestamp_msg_id = messageId;
  }

  disableTimestampHandler() {
    if (!this.isActive) return;

    this.log.info("[Timestamp Handler] Removing timestamp handling");
    this.isActive = false;

    this.ChatLine.off("mount", this.addTimestampToMessage);
    this.ChatLine.off("update", this.addTimestampToMessage);

    this.StatusLine.off("mount", this.addTimestampToMessage);
    this.StatusLine.off("update", this.addTimestampToMessage);

    this.ChatLine.each(inst => delete inst._trubbel_timestamp_msg_id);
    this.StatusLine.each(inst => delete inst._trubbel_timestamp_msg_id);
  }
}