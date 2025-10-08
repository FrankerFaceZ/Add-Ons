import { BAD_USERS } from "../../../utilities/constants/types";

const { createElement } = FrankerFaceZ.utilities.dom;

export default class RecentMessages {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.router = parent.router;
    this.style = parent.style;
    this.chat = parent.chat;
    this.fine = parent.fine;
    this.site = parent.site;
    this.log = parent.log;

    this.isActive = false;

    this.handleNavigation = this.handleNavigation.bind(this);
    this.enableRecentMessages = this.enableRecentMessages.bind(this);
    this.disableRecentMessages = this.disableRecentMessages.bind(this);
    this.handleSettingChange = this.handleSettingChange.bind(this);
    this.checkViewerCard = this.checkViewerCard.bind(this);
    this.onNewMessage = this.onNewMessage.bind(this);

    this.ChatLine = this.fine.define(
      "chat-line",
      n => n.onExtensionMessageClick || (n.props && n.props.message && n.props.message.user),
      this.site.constructor.CHAT_ROUTES
    );

    this.activeViewerCard = {
      targetLogin: null,
      container: null,
      messageList: null,
      isListening: false,
      messageCount: 0,
      processedMessageIds: new Set()
    };

    this.observer = null;
    this.pollInterval = null;
  }

  initialize() {
    const enabled = this.settings.get("addon.trubbel.channel.chat.viewer_cards.recent_messages");
    if (enabled) {
      this.handleNavigation();
    } else {
      this.disableRecentMessages();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.log.info("[Recent Messages] Enabling recent messages in viewer cards");
      this.handleNavigation();
    } else {
      this.log.info("[Recent Messages] Disabling recent messages in viewer cards");
      this.disableRecentMessages();
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
      const enabled = this.settings.get("addon.trubbel.channel.chat.viewer_cards.recent_messages");
      if (enabled && !this.isActive) {
        this.log.info("[Recent Messages] Entering chat page, enabling recent messages");
        this.enableRecentMessages();
      }
    } else {
      if (this.isActive) {
        this.log.info("[Recent Messages] Leaving chat page, disabling recent messages");
        this.disableRecentMessages();
      }
    }
  }

  enableRecentMessages() {
    if (this.isActive) return;

    this.log.info("[Recent Messages] Setting up viewer card recent messages");
    this.isActive = true;

    this.chat.on("chat:receive-message", this.onNewMessage);
    this.startDOMObserver();
    this.style.set("trubbel-previous-messages", `
        .trubbel-previous-messages {
          border-top: 1px solid #222;
          background-color: var(--color-background-base) !important;
        }
        .trubbel-previous-messages .message-list {
          overflow-y: auto;
          max-height: 200px;
          width: 100%;
          display: none;
        }
        .trubbel-previous-messages .message-list::-webkit-scrollbar {
          width: 5px;
        }
        .trubbel-previous-messages .message-list::-webkit-scrollbar-thumb {
          border-radius: 10px;
          box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
          background-color: #777;
        }
        .trubbel-previous-messages .label {
          padding: 5px 8px;
          position: relative;
          font-size: 12px;
          font-weight: bold;
          cursor: pointer;
          user-select: none;
        }
        .trubbel-previous-messages .triangle {
          width: 0;
          height: 0;
          opacity: 0.5;
          position: absolute;
          right: 8px;
          top: 8px;
          border-top: 7px solid transparent;
          border-bottom: 7px solid transparent;
          border-left: 7px solid #6441a4;
          transition: all 50ms ease-in;
        }
        .trubbel-previous-messages .triangle.open {
          transform: rotate(90deg);
        }
        .tw-root--theme-dark .trubbel-previous-messages .triangle {
          border-left-color: white;
        }
        .trubbel-previous-messages .message-list .chat-line__mod-icons {
          display: none !important;
        }
        .trubbel-previous-messages .message-list .chat-line__message--deleted > a {
          pointer-events: none;
        }
        .trubbel-previous-messages .message-list .ffz--hover-actions {
          display: none !important;
        }
      `);
  }

  disableRecentMessages() {
    if (!this.isActive) return;

    this.log.info("[Recent Messages] Removing viewer card recent messages");
    this.isActive = false;

    this.chat.off("chat:receive-message", this.onNewMessage);

    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    this.style.delete("trubbel-previous-messages");
    this.cleanupContainer();
  }

  startDOMObserver() {
    this.observer = new MutationObserver(() => {
      this.checkViewerCard();
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    this.pollInterval = setInterval(() => this.checkViewerCard(), 200);
  }

  checkViewerCard() {
    if (!this.isActive) return;

    const cards = document.querySelectorAll("div.viewer-card");

    if (cards.length === 0) {
      if (this.activeViewerCard.targetLogin) {
        this.log.info("[Recent Messages] Viewer card closed");
        this.cleanupContainer();
      }
      return;
    }

    for (const card of cards) {
      const profileLink = card.querySelector("a[href^=\"/\"]");
      if (profileLink) {
        const href = profileLink.getAttribute("href");
        const username = href?.replace(/^\//, "").split("/")[0].toLowerCase();

        if (username && username !== this.activeViewerCard.targetLogin) {
          this.log.info("[Recent Messages] Viewer card detected for:", username);
          this.onViewerCardDetected(username, card);
          return;
        }
      }
    }
  }

  onViewerCardDetected(targetLogin, viewerCard) {
    if (this.activeViewerCard.targetLogin && this.activeViewerCard.targetLogin !== targetLogin) {
      this.log.info("[Recent Messages] Switching from", this.activeViewerCard.targetLogin, "to", targetLogin);
      this.cleanupContainer();
    }

    this.activeViewerCard.targetLogin = targetLogin;
    this.activeViewerCard.isListening = true;

    const userMessages = this.getUserMessages(targetLogin);
    this.log.info("[Recent Messages] Found", userMessages.length, "messages");

    if (userMessages.length > 0) {
      this.displayMessages(userMessages, viewerCard);
    }

    this.log.info("[Recent Messages] Listening for real-time updates:", targetLogin);
  }

  getUserMessages(targetLogin) {
    const userMessages = [];
    for (const inst of this.ChatLine.instances) {
      const msg = inst.props?.message;
      if (msg?.user?.login?.toLowerCase() === targetLogin) {
        userMessages.push({
          message: msg,
          _instance: inst,
          update: () => inst.forceUpdate()
        });
      }
    }

    return userMessages;
  }

  displayMessages(messages, viewerCard) {
    const container = this.createSimpleContainer(messages.length);
    const messageList = container.querySelector(".message-list");

    this.activeViewerCard.container = container;
    this.activeViewerCard.messageList = messageList;
    this.activeViewerCard.messageCount = messages.length;

    let successCount = 0;

    // show latest messages at the top
    for (let i = messages.length - 1; i >= 0; i--) {
      const msgObj = messages[i];
      const messageElement = this.createOptimizedMessageElement(msgObj);
      if (messageElement) {
        messageList.appendChild(messageElement);
        successCount++;
      }
    }

    this.log.info("[Recent Messages] Added", successCount, "out of", messages.length, "messages");

    viewerCard.appendChild(container);
  }

  onNewMessage(event) {
    if (!this.isActive || !this.activeViewerCard.isListening || !this.activeViewerCard.targetLogin) {
      return;
    }

    const msg = event?.message;
    if (!msg || !msg.user) return;

    const userLogin = msg.user.login?.toLowerCase();
    if (userLogin !== this.activeViewerCard.targetLogin) return;

    const messageId = msg.id;
    const fallbackId = messageId || `${msg.timestamp || Date.now()}-${msg.message || ""}`;

    if (messageId && this.activeViewerCard.processedMessageIds.has(messageId)) return;
    if (this.activeViewerCard.processedMessageIds.has(fallbackId)) return;

    this.activeViewerCard.processedMessageIds.add(messageId || fallbackId);

    if (this.activeViewerCard.processedMessageIds.size > 50) {
      const idsArray = Array.from(this.activeViewerCard.processedMessageIds);
      const toRemove = idsArray.slice(0, idsArray.length - 50);
      toRemove.forEach(id => this.activeViewerCard.processedMessageIds.delete(id));
    }

    setTimeout(() => {
      this.findAndCloneNewMessage(msg);
    }, 250);
  }

  findAndCloneNewMessage(msg) {
    let foundInstance = null;
    let bestMatch = null;
    let bestScore = 0;

    for (const inst of this.ChatLine.instances) {
      const instMsg = inst.props?.message;
      if (!instMsg) continue;

      let score = 0;

      if (msg.id && instMsg.id === msg.id) {
        foundInstance = inst;
        break;
      }

      if (instMsg.user?.login?.toLowerCase() === msg.user?.login?.toLowerCase()) {
        score += 10;

        const msgContent = msg.message || msg.messageBody || "";
        const instContent = instMsg.message || instMsg.messageBody || "";
        if (msgContent && instContent && msgContent === instContent) {
          score += 20;
        }

        const timeDiff = Math.abs((instMsg.timestamp || 0) - (msg.timestamp || Date.now()));
        if (timeDiff < 2000) {
          score += 15;
        }

        if (score > bestScore) {
          bestScore = score;
          bestMatch = inst;
        }
      }
    }

    if (!foundInstance && bestMatch && bestScore >= 30) {
      foundInstance = bestMatch;
    }

    if (!foundInstance) return;

    const msgObj = {
      message: msg,
      _instance: foundInstance,
      update: () => foundInstance.forceUpdate()
    };

    this.addNewMessageToDisplay(msgObj);
  }

  addNewMessageToDisplay(msgObj) {
    const { messageList, container } = this.activeViewerCard;

    if (!messageList || !container || !document.contains(container)) {
      this.cleanupContainer();
      return;
    }

    const messageElement = this.createOptimizedMessageElement(msgObj);
    if (!messageElement) return;

    if (messageList.firstElementChild) {
      messageList.insertBefore(messageElement, messageList.firstElementChild);
    } else {
      messageList.appendChild(messageElement);
    }

    this.activeViewerCard.messageCount++;

    // limit displayed messages to 50
    const MAX_MESSAGES = 50;
    while (messageList.children.length > MAX_MESSAGES) {
      messageList.lastElementChild.remove();
      this.activeViewerCard.messageCount--;
    }

    const header = container.querySelector(".label span");
    if (header) {
      header.textContent = `Recent Messages (${this.activeViewerCard.messageCount})`;
    }
  }

  createOptimizedMessageElement(msgObj) {
    const instance = msgObj._instance;
    if (!instance) return null;

    const fiber = instance._reactInternals || instance._reactInternalFiber;
    if (!fiber) return null;

    const childFiber = this.fine.getFirstChild(fiber);
    const sourceElement = childFiber?.stateNode;

    return (sourceElement && sourceElement.nodeType === Node.ELEMENT_NODE)
      ? sourceElement.cloneNode(true)
      : null;
  }

  createSimpleContainer(messageCount) {
    const container = createElement("div");
    container.classList.add("trubbel-previous-messages");

    const header = createElement("div");
    header.classList.add("label");
    container.appendChild(header);

    const headerText = createElement("span");
    headerText.textContent = `Recent Messages (${messageCount})`;
    header.appendChild(headerText);

    const triangle = createElement("div");
    triangle.classList.add("triangle");
    header.appendChild(triangle);

    const messageList = createElement("div");
    messageList.classList.add("message-list");
    messageList.style.display = "none";
    container.appendChild(messageList);

    header.addEventListener("click", () => {
      triangle.classList.toggle("open");
      const isOpen = triangle.classList.contains("open");
      messageList.style.display = isOpen ? "block" : "none";
    });

    return container;
  }

  cleanupContainer() {
    if (this.activeViewerCard.container && this.activeViewerCard.container.parentNode) {
      this.activeViewerCard.container.remove();
    }

    const orphans = document.querySelectorAll(".trubbel-previous-messages");
    orphans.forEach(el => el.remove());

    this.activeViewerCard.targetLogin = null;
    this.activeViewerCard.container = null;
    this.activeViewerCard.messageList = null;
    this.activeViewerCard.isListening = false;
    this.activeViewerCard.messageCount = 0;
    this.activeViewerCard.processedMessageIds.clear();
  }
}