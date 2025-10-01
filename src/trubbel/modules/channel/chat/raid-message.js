import { BAD_USERS } from "../../../utilities/constants/types";

const { setChildren } = FrankerFaceZ.utilities.dom;

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
    this.handleRaidMessage = this.handleRaidMessage.bind(this);
    this.makeRaidUsernameClickable = this.makeRaidUsernameClickable.bind(this);

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

    this.UserNoticeLine.ready((cls, instances) => {
      for (const inst of instances) {
        this.handleRaidMessage(inst);
      }
    });
    this.UserNoticeLine.on("mount", this.handleRaidMessage);
    this.UserNoticeLine.on("mutate", this.handleRaidMessage);
    this.UserNoticeLine.each(inst => this.handleRaidMessage(inst));
  }

  handleRaidMessage(inst) {
    if (!this.isActive) {
      this.log.debug("[Raid Message Handler] Not active, skipping message handling");
      return;
    }

    const message = inst?.props?.message;

    const RAID_TYPE = this?.site?.children?.chat?.chat_types?.Raid;
    if (message?.type === RAID_TYPE && message?.params?.msgId === "raid") {
      this.log.info("[Raid Message Handler] Processing raid message:", message?.params?.displayName);
      this.makeRaidUsernameClickable(inst, message);
    }
  }

  makeRaidUsernameClickable(inst, message) {
    if (inst.trubbel_raid_processed) return;

    if (!inst.trubbel_raid_click_handler) {
      inst.trubbel_raid_click_handler = (event) => {
        event.preventDefault();
        event.stopPropagation();

        const target = event.currentTarget;
        const login = target.dataset.userLogin;
        const userID = target.dataset.userId;

        this.log.info("[Raid Message Handler] Raid user clicked:", login);

        const chatContainer = this.parent.resolve("site.chat")?.ChatContainer;
        if (chatContainer?.first?.onUsernameClick) {
          this.log.info("[Raid Message Handler] Using ChatContainer.first.onUsernameClick");
          chatContainer.first.onUsernameClick(
            login,
            "chat_message",
            message.id,
            target.getBoundingClientRect().bottom
          );
        } else {
          this.log.warn("[Raid Message Handler] Could not find onUsernameClick handler");
        }
      };
    }

    requestAnimationFrame(() => {
      try {
        const hostNode = this.fine.getHostNode(inst);
        if (!hostNode) {
          this.log.warn("[Raid Message Handler] Could not find host node for instance");
          return;
        }

        const element = hostNode.querySelector("[data-test-selector=\"user-notice-line\"]") || hostNode.closest("[data-test-selector=\"user-notice-line\"]");
        if (!element) {
          this.log.warn("[Raid Message Handler] Could not find .user-notice-line element");
          return;
        }

        const textContent = element.textContent;
        const displayName = message.params.displayName;

        if (!textContent || !textContent.includes(displayName)) {
          this.log.warn("[Raid Message Handler] Could not find raid username in text");
          return;
        }

        const displayNameIndex = textContent.indexOf(displayName);
        if (displayNameIndex === -1) return;

        const beforeText = textContent.substring(0, displayNameIndex);
        const afterText = textContent.substring(displayNameIndex + displayName.length);

        const children = [];

        if (beforeText) {
          children.push(beforeText);
        }

        const usernameElement = document.createElement("span");
        usernameElement.className = "chatter-name ffz-interactive";
        usernameElement.setAttribute("role", "button");
        usernameElement.style.cursor = "pointer";
        usernameElement.style.fontWeight = "bold";
        usernameElement.textContent = displayName;
        usernameElement.setAttribute("data-user-id", message.params.userID);
        usernameElement.setAttribute("data-user-login", message.params.login);
        usernameElement.addEventListener("click", inst.trubbel_raid_click_handler);

        children.push(usernameElement);

        if (afterText) {
          children.push(afterText);
        }

        setChildren(element, children);

        inst.trubbel_raid_processed = true;
      } catch (err) {
        this.log.error("[Raid Message Handler] Error in DOM manipulation:", err);
      }
    });
  }

  disableRaidHandler() {
    if (!this.isActive) return;

    this.log.info("[Raid Message Handler] Removing raid message handling");
    this.isActive = false;

    this.UserNoticeLine.off("mount", this.handleRaidMessage);
    this.UserNoticeLine.off("mutate", this.handleRaidMessage);

    this.UserNoticeLine.each(inst => {
      if (inst.trubbel_raid_processed) {
        delete inst.trubbel_raid_processed;
      }
      if (inst.trubbel_raid_click_handler) {
        delete inst.trubbel_raid_click_handler;
      }
    });
  }
}