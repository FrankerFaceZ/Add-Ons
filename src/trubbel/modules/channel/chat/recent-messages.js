import { BAD_USERS } from "../../../utilities/constants/types";

const { createElement, on, setChildren } = FrankerFaceZ.utilities.dom;

const MAX_MESSAGES = 50;

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
    this.expanded = false;
    this.state = null;
    this.siteChat = null;
    this.ViewerCardElement = null;

    this.handleNavigation = this.handleNavigation.bind(this);
    this.enableRecentMessages = this.enableRecentMessages.bind(this);
    this.disableRecentMessages = this.disableRecentMessages.bind(this);
    this.handleSettingChange = this.handleSettingChange.bind(this);

    this.ViewerCard = this.fine.define(
      "chat-viewer-card",
      n => n.props?.targetLogin && (n.props?.hideViewerCard || n.props?.modUserMutationResult)
    );
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

    this.siteChat = this.parent.resolve("site.chat");

    if (!this.ViewerCardElement) {
      this.ViewerCardElement = this.site.children.elemental.define(
        "trubbel-recent-messages-viewer-card",
        "div.viewer-card",
        this.site.constructor.CHAT_ROUTES,
        { childList: true },
        0,
        0
      );
    }

    this.ViewerCardElement.on("mount", this.syncCard, this);
    this.ViewerCardElement.on("mutate", this.syncCard, this);
    this.ViewerCardElement.on("unmount", this.onCardUnmount, this);
    this.ViewerCard.on("update", this.syncAllCards, this);
    this.chat.on("chat:receive-message", this.onNewMessage, this);

    this.style.set("trubbel-previous-messages", `
        .trubbel-previous-messages {
          border-top: 1px solid var(--color-border-base);
          background-color: var(--color-background-base);
        }
        .trubbel-previous-messages__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 5px 8px;
          border: none;
          background: none;
          font-size: 12px;
          font-weight: bold;
          color: var(--color-text-base);
          cursor: pointer;
          user-select: none;
        }
        .trubbel-previous-messages__chevron {
          display: flex;
          width: 14px;
          height: 14px;
          fill: currentColor;
          opacity: 0.5;
          transition: transform 50ms ease-in;
        }
        .trubbel-previous-messages--open .trubbel-previous-messages__chevron {
          transform: rotate(90deg);
        }
        .trubbel-previous-messages__list {
          display: none;
          overflow-y: auto;
          max-height: 200px;
          width: 100%;
        }
        .trubbel-previous-messages--open .trubbel-previous-messages__list {
          display: flex;
          flex-direction: column;
        }
        .trubbel-previous-messages--oldest-first .trubbel-previous-messages__list {
          flex-direction: column-reverse;
        }
        .trubbel-previous-messages__list::-webkit-scrollbar {
          width: 5px;
        }
        .trubbel-previous-messages__list::-webkit-scrollbar-thumb {
          border-radius: 10px;
          background-color: var(--color-text-alt-2);
        }
        .trubbel-previous-messages__reply {
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          font-size: 12px;
          color: var(--color-text-alt-2);
        }
        .trubbel-previous-messages__line--deleted .message {
          opacity: 0.5;
          text-decoration: line-through;
        }
      `);

    this.syncAllCards();
  }

  disableRecentMessages() {
    if (!this.isActive) return;

    this.log.info("[Recent Messages] Removing viewer card recent messages");
    this.isActive = false;

    this.chat.off("chat:receive-message", this.onNewMessage, this);
    this.ViewerCard.off("update", this.syncAllCards, this);

    if (this.ViewerCardElement) {
      this.ViewerCardElement.off("mount", this.syncCard, this);
      this.ViewerCardElement.off("mutate", this.syncCard, this);
      this.ViewerCardElement.off("unmount", this.onCardUnmount, this);
    }

    this.style.delete("trubbel-previous-messages");
    this.cleanupContainer();
  }

  syncAllCards() {
    this.ViewerCardElement?.each(card => this.syncCard(card));
  }

  getTargetLogin() {
    for (const inst of this.ViewerCard.instances) {
      const login = inst.props?.targetLogin;
      if (login) return login.toLowerCase();
    }
    return null;
  }

  syncCard(card) {
    if (!this.isActive) return;

    const login = this.getTargetLogin();
    if (!login) return;

    if (this.state?.card === card && this.state.login === login) {
      this.ensurePosition();
      return;
    }

    this.cleanupContainer();
    this.log.info("[Recent Messages] Viewer card detected for:", login);

    this.state = this.createContainer(card, login);

    const messages = this.getUserMessages(login);
    this.log.info("[Recent Messages] Found", messages.length, "messages");

    for (let i = messages.length - 1; i >= 0; i--)
      this.appendMessage(messages[i]);

    this.updateHeader();
    this.ensurePosition();
  }

  isOldestFirst() {
    return this.settings.get("addon.trubbel.channel.chat.viewer_cards.recent_messages.order") === "oldest";
  }

  handleOrderChange() {
    this.state?.container.classList.toggle("trubbel-previous-messages--oldest-first", this.isOldestFirst());
  }

  onCardUnmount(card) {
    if (this.state?.card === card) {
      this.log.info("[Recent Messages] Viewer card closed");
      this.cleanupContainer();
    }
  }

  ensurePosition() {
    const state = this.state;
    if (!state || state.ids.size === 0) return;

    if (state.card.lastElementChild !== state.container)
      state.card.appendChild(state.container);
  }

  getUserMessages(login) {
    const seen = new Set();
    const out = [];

    for (const { message: msg } of this.chat.iterateMessages(true, false, false)) {
      if (msg?.user?.login?.toLowerCase() !== login) continue;
      if (msg.id) {
        if (seen.has(msg.id)) continue;
        seen.add(msg.id);
      }
      out.push(msg);
    }

    out.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    return out.slice(-MAX_MESSAGES);
  }

  onNewMessage(event) {
    const state = this.state;
    if (!this.isActive || !state) return;

    const msg = event?.message;
    if (msg?.user?.login?.toLowerCase() !== state.login) return;

    this.addNewMessage(msg);
    this.updateHeader();
    this.ensurePosition();
  }

  appendMessage(msg) {
    const line = this.renderMessage(msg);
    if (line) this.state.list.appendChild(line);
  }

  addNewMessage(msg) {
    const { list } = this.state;
    const line = this.renderMessage(msg);
    if (!line) return;

    list.insertBefore(line, list.firstElementChild);

    while (list.children.length > MAX_MESSAGES) {
      const oldest = list.lastElementChild;
      this.state.ids.delete(oldest.dataset.messageId);
      oldest.remove();
    }
  }

  renderMessage(msg) {
    const { ids } = this.state;
    const id = msg.id || `${msg.timestamp}-${msg.message}`;
    if (ids.has(id)) return null;
    ids.add(id);

    const user = msg.user;
    const tokens = msg.ffz_tokens = msg.ffz_tokens || this.chat.tokenizeMessage(msg, this.site.getUser());

    const rawColor = this.chat.overrides.getColor(user.id) || user.color;
    const color = rawColor ? this.siteChat.colors.process(rawColor) : null;
    const overrideName = this.chat.overrides.getName(user.id);
    const isAction = this.siteChat.message_types?.Action === msg.messageType;
    const reply = msg.reply;

    const username = overrideName
      ? <span class="chat-author__display-name">{overrideName}</span>
      : this.chat.formatUser(user, createElement);

    return (
      <div
        class={`chat-line__message tw-relative trubbel-previous-messages__line${msg.deleted ? " trubbel-previous-messages__line--deleted" : ""}`}
        data-message-id={id}
        data-room-id={msg.roomID}
        data-room={msg.roomLogin}
        data-user-id={user.id}
        data-user={user.login}
      >
        <div class="chat-line__message-container tw-relative">
          {reply?.parentDisplayName && (
            <div class="trubbel-previous-messages__reply" title={reply.parentMessageBody}>
              {`Replying to @${reply.parentDisplayName}: ${reply.parentMessageBody || ""}`}
            </div>
          )}
          <span class="chat-line__timestamp">{this.chat.formatTime(msg.timestamp)}</span>
          <span class="chat-line__message--badges">{this.chat.badges.render(msg, createElement)}</span>
          <span class="chat-line__username notranslate" style={color ? { color } : null}>{username}</span>
          <span aria-hidden="true">{isAction ? " " : ": "}</span>
          <span class="message" style={isAction && color ? { color } : null}>
            {this.chat.renderTokens(tokens, createElement)}
          </span>
        </div>
      </div>
    );
  }

  createContainer(card, login) {
    const label = <span />;
    const header = (
      <button class="trubbel-previous-messages__header" aria-expanded={this.expanded ? "true" : "false"}>
        {label}
        <svg class="trubbel-previous-messages__chevron" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M7.5 15.5 6 14l4-4-4-4 1.5-1.5L13 10l-5.5 5.5Z" />
        </svg>
      </button>
    );
    const list = <div class="trubbel-previous-messages__list" />;
    const container = (
      <div class={`trubbel-previous-messages${this.expanded ? " trubbel-previous-messages--open" : ""}${this.isOldestFirst() ? " trubbel-previous-messages--oldest-first" : ""}`}>
        {header}
        {list}
      </div>
    );

    on(header, "click", () => {
      this.expanded = container.classList.toggle("trubbel-previous-messages--open");
      header.setAttribute("aria-expanded", this.expanded ? "true" : "false");    });

    return { card, login, container, header, label, list, ids: new Set() };
  }

  updateHeader() {
    const { label, list } = this.state;
    setChildren(label, [`Recent Messages (${list.children.length})`]);
  }

  cleanupContainer() {
    this.state?.container.remove();
    this.state = null;
  }
}