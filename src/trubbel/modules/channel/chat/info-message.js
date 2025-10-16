import { BAD_USERS } from "../../../utilities/constants/types";

const { setChildren } = FrankerFaceZ.utilities.dom;

export default class InfoMessage {
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
    this.enableInfoHandler = this.enableInfoHandler.bind(this);
    this.disableInfoHandler = this.disableInfoHandler.bind(this);
    this.handleSettingChange = this.handleSettingChange.bind(this);
    this.handleInfoMessage = this.handleInfoMessage.bind(this);
    this.makeInfoUsernameClickable = this.makeInfoUsernameClickable.bind(this);

    this.UserStatusLine = this.fine.define(
      "user-notice-line-info",
      n => n.renderDefaultMessage && n.getSharedChatMessageEventProps,
      this.site.constructor.CHAT_ROUTES
    );
  }

  initialize() {
    const enabled = this.settings.get("addon.trubbel.channel.chat.viewer_cards.clickable_mods_vips");
    if (enabled) {
      this.handleNavigation();
    } else {
      this.disableInfoHandler();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.log.info("[Info Message Handler] Enabling clickable info usernames");
      this.handleNavigation();
    } else {
      this.log.info("[Info Message Handler] Disabling clickable info usernames");
      this.disableInfoHandler();
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
      const enabled = this.settings.get("addon.trubbel.channel.chat.viewer_cards.clickable_mods_vips");
      if (enabled && !this.isActive) {
        this.log.info("[Info Message Handler] Entering chat page, enabling info message handler");
        this.enableInfoHandler();
      }
    } else {
      if (this.isActive) {
        this.log.info("[Info Message Handler] Leaving chat page, disabling info message handler");
        this.disableInfoHandler();
      }
    }
  }

  enableInfoHandler() {
    if (this.isActive) return;

    this.log.info("[Info Message Handler] Setting up info message handling");
    this.isActive = true;

    this.UserStatusLine.on("mount", this.handleInfoMessage);
    this.UserStatusLine.on("mutate", this.handleInfoMessage);
    this.UserStatusLine.each(inst => this.handleInfoMessage(inst));
  }

  handleInfoMessage(inst) {
    if (!this.isActive) {
      this.log.debug("[Info Message Handler] Not active, skipping message handling");
      return;
    }

    const message = inst?.props?.message;
    const regex = /[:：]\s*([^.\n。]+)(?:[.。])?/;
    const INFO_TYPE = this?.site?.children?.chat?.chat_types?.Info;
    const regexMatch = message?.message?.match(regex);

    if (message?.type === INFO_TYPE && regexMatch) {
      this.makeInfoUsernameClickable(inst, message);
    }
  }

  makeInfoUsernameClickable(inst, message) {
    if (inst.trubbel_info_processed) return;

    requestAnimationFrame(() => {
      try {
        const hostNode = this.fine.getHostNode(inst);
        if (!hostNode) {
          this.log.warn("[Info Message Handler] Could not find host node for instance");
          return;
        }
        this.log.info("[Info Message Handler] hostNode:", hostNode);

        const element = hostNode.querySelector(".chat-line__status") || hostNode.closest(".chat-line__status");
        if (!element) {
          this.log.warn("[Info Message Handler] Could not find .chat-line__status element");
          return;
        }

        const textContent = element.textContent;
        const regex = /[:：]\s*([^.\n。]+)(?:[.。])?/;
        const match = textContent.match(regex);

        if (!match) {
          this.log.warn("[Info Message Handler] Could not match username pattern");
          return;
        }

        const usernamesText = match[1];
        const usernames = usernamesText.split(",")
          .map(username => username.trim())
          .filter(username => username.length > 0);

        if (usernames.length === 0) {
          this.log.warn("[Info Message Handler] No usernames found");
          return;
        }

        const beforeText = textContent.substring(0, match.index + 1) + " ";
        const afterText = ".";

        const children = [beforeText];

        usernames.forEach((username, index) => {
          const usernameElement = document.createElement("span");
          usernameElement.className = "chatter-name ffz-interactive";
          usernameElement.setAttribute("role", "button");
          usernameElement.style.cursor = "pointer";
          usernameElement.style.fontWeight = "bold";
          usernameElement.textContent = username;
          usernameElement.setAttribute("data-user-login", username.toLowerCase());

          const clickHandler = (event) => {
            event.preventDefault();
            event.stopPropagation();

            const chatContainer = this.fine.wrap("chat-container");
            if (chatContainer?.first?.onUsernameClick) {
              this.log.info("[Info Message Handler] Using ChatContainer.first.onUsernameClick");
              const rect = event.currentTarget.getBoundingClientRect();
              chatContainer.first.onUsernameClick(
                username.toLowerCase(),
                "chat_message",
                message.id,
                rect.bottom
              );
            } else {
              this.log.warn("[Info Message Handler] Could not find onUsernameClick handler");
            }
          };

          usernameElement.addEventListener("click", clickHandler);

          children.push(usernameElement);

          if (index < usernames.length - 1) {
            children.push(", ");
          }
        });

        children.push(afterText);
        setChildren(element, children);

        inst.trubbel_info_processed = true;
      } catch (err) {
        this.log.error("[Info Message Handler] Error in DOM manipulation:", err);
      }
    });
  }

  disableInfoHandler() {
    if (!this.isActive) return;

    this.isActive = false;

    this.UserStatusLine.off("mount", this.handleInfoMessage);
    this.UserStatusLine.off("mutate", this.handleInfoMessage);

    this.UserStatusLine.each(inst => {
      if (inst.trubbel_info_processed) {
        delete inst.trubbel_info_processed;
      }
    });

    this.removeExistingHandlers();
  }

  removeExistingHandlers() {
    const clickableUsernames = document.querySelectorAll(".chat-line__status .chatter-name.ffz-interactive");

    clickableUsernames.forEach(span => {
      const textNode = document.createTextNode(span.textContent);
      span.parentNode.replaceChild(textNode, span);
    });

    if (clickableUsernames.length > 0) {
      this.log.info(`[Info Message Handler] Stripped ${clickableUsernames.length} clickable username spans`);
    }
  }
}