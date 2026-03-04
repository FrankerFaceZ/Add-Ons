import { BAD_USERS } from "../../../utilities/constants/types";

const { createElement, on, setChildren } = FrankerFaceZ.utilities.dom;

export default class RaidMessage {
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
    this.enableRaidHandler = this.enableRaidHandler.bind(this);
    this.disableRaidHandler = this.disableRaidHandler.bind(this);
    this.handleSettingChange = this.handleSettingChange.bind(this);
    this.processRaidMessage = this.processRaidMessage.bind(this);

    this.UserNoticeLine = this.fine.define(
      "user-notice-line-raid",
      n => n.renderDefaultMessage && n.getSharedChatMessageEventProps,
      this.site.constructor.CHAT_ROUTES
    );
  }

  initialize() {
    const enabled = this.settings.get("addon.trubbel.channel.chat.viewer_cards.clickable_raid");
    if (enabled) {
      this.handleNavigation();
    } else {
      this.disableRaidHandler();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.log.info("[Raid Message Handler] Enabling clickable raid usernames");
      this.handleNavigation();
    } else {
      this.log.info("[Raid Message Handler] Disabling clickable raid usernames");
      this.disableRaidHandler();
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
      const enabled = this.settings.get("addon.trubbel.channel.chat.viewer_cards.clickable_raid");
      if (enabled && !this.isActive) {
        this.log.info("[Raid Message Handler] Entering chat page, enabling raid message handler");
        this.enableRaidHandler();
      }
    } else {
      if (this.isActive) {
        this.log.info("[Raid Message Handler] Leaving chat page, disabling raid message handler");
        this.disableRaidHandler();
      }
    }
  }

  enableRaidHandler() {
    if (this.isActive) return;

    this.log.info("[Raid Message Handler] Setting up raid message handling");
    this.isActive = true;

    this.UserNoticeLine.each(inst => this.processRaidMessage(inst));
    this.UserNoticeLine.on("mount", this.processRaidMessage);
    this.UserNoticeLine.on("update", this.processRaidMessage);
  }

  processRaidMessage(inst) {
    if (!this.isActive) return;

    const message = inst?.props?.message;
    const chat = this.site.children.chat
    const RAID_TYPE = chat?.chat_types?.Raid;

    if (message?.type !== RAID_TYPE || message?.params?.msgId !== "raid") return;
    if (inst._trubbel_raid_msg_id === message.id) return;

    const hostNode = this.fine.getHostNode(inst);
    if (!hostNode) return;

    const element = hostNode.querySelector("[data-test-selector=\"user-notice-line\"]")
      || hostNode.closest("[data-test-selector=\"user-notice-line\"]");
    if (!element) return;

    const displayName = message.params.displayName;
    const textContent = element.textContent;

    if (!textContent?.includes(displayName)) return;

    const displayNameIndex = textContent.indexOf(displayName);
    if (displayNameIndex === -1) return;

    const beforeText = textContent.substring(0, displayNameIndex);
    const afterText = textContent.substring(displayNameIndex + displayName.length);

    if (!inst._trubbel_raid_click_handler) {
      inst._trubbel_raid_click_handler = (event) => {
        event.preventDefault();
        event.stopPropagation();

        const login = message.params.login;
        this.log.info("[Raid Message Handler] Raid username clicked:", login);

        const container = chat?.ChatContainer;
        if (container?.first?.onUsernameClick) {
          container.first.onUsernameClick(
            login,
            "chat_raid_message",
            message.id,
            event.currentTarget.getBoundingClientRect().bottom
          );
        } else {
          this.log.warn("[Raid Message Handler] Could not find onUsernameClick handler");
        }
      };
    }

    const usernameElement = createElement("span");
    usernameElement.className = "chatter-name ffz-interactive";
    usernameElement.setAttribute("role", "button");
    usernameElement.style.cursor = "pointer";
    usernameElement.style.fontWeight = "bold";
    usernameElement.textContent = displayName;
    usernameElement.setAttribute("data-user-id", message.params.userID);
    usernameElement.setAttribute("data-user-login", message.params.login);
    on(usernameElement, "click", inst._trubbel_raid_click_handler);

    const children = [];
    if (beforeText) children.push(beforeText);
    children.push(usernameElement);
    if (afterText) children.push(afterText);

    setChildren(element, children);

    inst._trubbel_raid_msg_id = message.id;
  }

  disableRaidHandler() {
    if (!this.isActive) return;

    this.log.info("[Raid Message Handler] Removing raid message handling");
    this.isActive = false;

    this.UserNoticeLine.off("mount", this.processRaidMessage);
    this.UserNoticeLine.off("update", this.processRaidMessage);

    this.UserNoticeLine.each(inst => {
      delete inst._trubbel_raid_msg_id;
      delete inst._trubbel_raid_click_handler;
    });
  }
}