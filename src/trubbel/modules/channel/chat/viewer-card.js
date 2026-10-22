const { createElement } = FrankerFaceZ.utilities.dom;

const getDialogNextZ = FrankerFaceZ.utilities.dialog?.getDialogNextZ;
const { deep_copy } = FrankerFaceZ.utilities.object;

import STYLE_URL from "../../../components/viewer_card/styles/style.scss";

const NOTES_KEY = "addon.trubbel.channel.chat.viewer-cards.notes";

export default class ViewerCards {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.router = parent.router;
    this.style = parent.style;
    this.site = parent.site;
    this.log = parent.log;

    this.isActive = false;

    this.notes_cache = null;
    this.temp_highlights = null;

    this.open_cards = new Map();
    this.last_card = null;
    this.style_link = null;
    this.last_login = null;
    this._vue_loaded = false;

    this.mentionClickHandler = null;
    this.viewerListClickHandler = null;
    this.pinnedMessageClickHandler = null;

    this.handleNavigation = this.handleNavigation.bind(this);
    this.handleSettingChange = this.handleSettingChange.bind(this);
    this.enable = this.enable.bind(this);
    this.disable = this.disable.bind(this);
  }

  resolve(...args) { return this.parent.resolve(...args); }
  on(...args) { return this.parent.on(...args); }
  off(...args) { return this.parent.off(...args); }
  emit(...args) { return this.parent.emit(...args); }

  get vue() { return this.parent.resolve("vue"); }

  initialize() {
    const enabled = this.settings.get("addon.trubbel.channel.chat.viewer-cards.enabled");
    if (enabled) {
      this.enable();
    } else {
      this.disable();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.log.info("[Viewer Cards] Enabling viewer cards");
      this.enable();
    } else {
      this.log.info("[Viewer Cards] Disabling viewer cards");
      this.disable();
    }
  }

  handleNavigation() {
    this.closeAllCards();
    this.clearTempHighlights();
  }

  enable() {
    if (this.isActive) return;
    this.isActive = true;

    if (!this.style_link) {
      document.head.appendChild(this.style_link = createElement("link", {
        id: "trubbel-viewer-cards-css",
        "data-addon": "trubbel",
        href: STYLE_URL,
        rel: "stylesheet",
        type: "text/css",
        crossOrigin: "anonymous"
      }));
    }

    this.settings.provider.on("changed", this.onProviderChange, this);

    this.on("chat:user-click", this.handleUserClick, this);
    this.on("trubbel:mention-click", this.handleMentionClick, this);
    this.on("trubbel:viewer-list-click", this.handleViewerListClick, this);
    this.on("trubbel:pinned-message-click", this.handlePinnedMessageClick, this);

    this.setupDOMListeners();
  }

  disable() {
    if (!this.isActive) return;
    this.isActive = false;

    this.settings.provider.off("changed", this.onProviderChange, this);

    this.off("chat:user-click", this.handleUserClick, this);
    this.off("trubbel:mention-click", this.handleMentionClick, this);
    this.off("trubbel:viewer-list-click", this.handleViewerListClick, this);
    this.off("trubbel:pinned-message-click", this.handlePinnedMessageClick, this);

    this.removeDOMListeners();
    this.closeAllCards();
    this.clearTempHighlights();
    this.style.delete("trubbel-viewer-card-highlight");

    if (this.style_link) {
      this.style_link.remove();
      this.style_link = null;
    }
  }

  refreshHighlight() {
    this.updateStyle(this.last_login);
  }

  updateStyle(login) {
    if (typeof login === "string") {
      login = login.toLowerCase();
    }
    this.last_login = login;

    const allLogins = [...this.open_cards.values()]
      .filter(c => c.isActive())
      .map(c => c.user.login.toLowerCase());

    if (allLogins.length && this.settings.get("addon.trubbel.channel.chat.viewer-cards.highlight-chat")) {
      let color = this.settings.get("addon.trubbel.channel.chat.viewer-cards.highlight-color");
      if (!color || !color.length) {
        color = this.settings.get("theme.is-dark") !== false
          ? "rgba(0,80,255,0.2)"
          : "rgba(128,170,255,0.2)";
      }

      const selectors = allLogins.flatMap(l => [
        `body .chat-room .chat-scrollable-area__message-container > div:nth-child(1n+0) > .chat-line__message:not(.chat-line--inline)[data-user="${l}"]`,
        `body .chat-room .chat-scrollable-area__message-container > div:nth-child(1n+0) > div > .chat-line__message:not(.chat-line--inline)[data-user="${l}"]`,
        `body .chat-room .chat-line__message:not(.chat-line--inline):nth-child(1n+0)[data-user="${l}"]`
      ]).join(",\n");

      this.style.set("trubbel-viewer-card-highlight", `${selectors} {\n  background-color: ${color} !important;\n}`);
    } else {
      this.style.delete("trubbel-viewer-card-highlight");
    }
  }

  setupDOMListeners() {
    this.mentionClickHandler = (event) => {
      if (!this.settings.get("addon.trubbel.channel.chat.viewer-cards.enabled") ||
        !this.settings.get("addon.trubbel.channel.chat.viewer-cards.handle-mentions")) {
        return;
      }

      const target = event.target.closest(".chat-line__message-mention[data-login]");
      if (!target) return;

      const login = target.dataset.login;
      if (!login) return;

      event.preventDefault();
      event.stopPropagation();

      const chatLine = target.closest("[data-room-id][data-room]");
      const room = chatLine ? {
        id: chatLine.dataset.roomId,
        login: chatLine.dataset.room
      } : null;

      this.emit("trubbel:mention-click", {
        login: login,
        displayName: target.textContent.replace("@", ""),
        room: room,
        event: event
      });
    };

    this.viewerListClickHandler = (event) => {
      if (!this.settings.get("addon.trubbel.channel.chat.viewer-cards.enabled") ||
        !this.settings.get("addon.trubbel.channel.chat.viewer-cards.handle-viewer-list")) {
        return;
      }

      const target = event.target.closest("#community-tab-content .chatter-list-item button");
      if (!target) return;

      const span = target.querySelector("span");
      if (!span) return;

      const login = span.textContent.trim();
      if (!login) return;

      event.preventDefault();
      event.stopPropagation();

      const room = this.getCurrentRoom();

      this.emit("trubbel:viewer-list-click", {
        login: login,
        displayName: login,
        room: room,
        event: event
      });
    };

    this.pinnedMessageClickHandler = (event) => {
      if (!this.settings.get("addon.trubbel.channel.chat.viewer-cards.enabled") ||
        !this.settings.get("addon.trubbel.channel.chat.viewer-cards.handle-pinned-messages")) {
        return;
      }

      const target = event.target.closest(".pinned-chat__highlight-card .chatter-name span[style]");
      if (!target) return;

      const login = target.textContent.trim();
      if (!login) return;

      event.preventDefault();
      event.stopPropagation();

      const room = this.getCurrentRoom();

      this.emit("trubbel:pinned-message-click", {
        login: login,
        displayName: login,
        room: room,
        event: event
      });
    };

    document.addEventListener("click", this.mentionClickHandler, true);
    document.addEventListener("click", this.viewerListClickHandler, true);
    document.addEventListener("click", this.pinnedMessageClickHandler, true);
  }

  removeDOMListeners() {
    if (this.mentionClickHandler) {
      document.removeEventListener("click", this.mentionClickHandler, true);
      this.mentionClickHandler = null;
    }

    if (this.viewerListClickHandler) {
      document.removeEventListener("click", this.viewerListClickHandler, true);
      this.viewerListClickHandler = null;
    }

    if (this.pinnedMessageClickHandler) {
      document.removeEventListener("click", this.pinnedMessageClickHandler, true);
      this.pinnedMessageClickHandler = null;
    }
  }

  getCurrentRoom() {
    const site = this.resolve("site");
    if (site && site.getUser) {
      const router = site.router;
      if (router && router.current_name) {
        const params = router.match && router.match.params;
        if (params && params.userName) {
          return {
            login: params.userName,
            id: null
          };
        }
      }
    }

    const chatContainer = document.querySelector("[data-room-id][data-room]");
    if (chatContainer) {
      return {
        id: chatContainer.dataset.roomId,
        login: chatContainer.dataset.room
      };
    }

    const match = window.location.pathname.match(/\/([^\/]+)(?:\/|$)/);
    if (match && match[1] && match[1] !== "directory" && match[1] !== "following") {
      return {
        login: match[1],
        id: null
      };
    }

    return null;
  }

  handleUserClick(evt) {
    if (!this.settings.get("addon.trubbel.channel.chat.viewer-cards.enabled")) {
      return;
    }

    evt.preventDefault();

    const source = evt.source && evt.room && String(evt.source.id) !== String(evt.room.id)
      ? { id: evt.source.id, login: evt.source.login }
      : null;

    this.openCard({
      id: evt.user.id,
      login: evt.user.login,
      displayName: evt.user.displayName
    }, {
      id: evt.room ? evt.room.id : null,
      login: evt.room ? evt.room.login : null
    }, evt.event, source);
  }

  handleMentionClick(data) {
    this.openCard({
      login: data.login,
      displayName: data.displayName
    }, data.room, data.event);
  }

  handleViewerListClick(data) {
    this.openCard({
      login: data.login,
      displayName: data.displayName
    }, data.room, data.event);
  }

  handlePinnedMessageClick(data) {
    this.openCard({
      login: data.login,
      displayName: data.displayName
    }, data.room, data.event);
  }

  async loadVue() {
    if (this._vue_loaded) {
      return;
    }

    try {
      await this.vue.enable();

      const card_component = await import(/* webpackChunkName: "viewer-cards" */ "../../../components/viewer_card/card.vue");
      this.vue.component("trubbel-viewer-card", card_component.default);

      this._vue_loaded = true;
    } catch (err) {
      console.error("[ViewerCards] Error loading Vue component:", err);
      throw err;
    }
  }

  async loadData(user, room, source) {
    try {
      const apollo = this.resolve("site.apollo");
      if (!apollo)
        throw new Error("Unable to load user data");

      if (room && (!room.id || !room.login) && (room.id || room.login)) {
        try {
          const twitch_data = this.resolve("site.twitch_data");
          const basic = await twitch_data?.getUserBasic(room.id || null, room.id ? null : room.login);
          if (basic) room = { id: basic.id, login: basic.login };
        } catch (err) {
          console.warn("[ViewerCards] Could not resolve channel", room, err);
        }
      }

      const channelID = room?.id || null;
      const channelLogin = room?.login || "";

      // Shared Chat: resolve the source channel natively (login, display name and avatar)
      if (source && (source.id || source.login)) {
        try {
          const basic = await this.resolve("site.twitch_data")?.getUserBasic(source.id || null, source.id ? null : source.login);
          if (basic) source = { id: basic.id, login: basic.login, displayName: basic.displayName, profileImageURL: basic.profileImageURL };
        } catch (err) { /* */ }
      }
      const badgeChannelLogin = source?.login || channelLogin;
      const currentUserID = this.resolve("site")?.getUser?.()?.id || null;

      const result = await apollo.client.query({
        query: await import(/* webpackChunkName: "queries" */ "../../../utilities/graphql/viewer_card/card.gql"),
        variables: {
          targetLogin: user.login,
          channelID,
          channelIDStr: channelID ? String(channelID) : "",
          badgeChannelLogin,
          hasChannel: !!channelID,
          currentUserID: currentUserID ? String(currentUserID) : "0",
          hasViewer: !!(channelID && currentUserID)
        },
        fetchPolicy: "network-only"
      });

      if (!result?.data)
        throw new Error("Unable to load user data");

      const data = result.data;
      const targetUser = data.targetUser;
      const channelUser = data.channelUser;
      const currentUser = data.currentUser;
      const channelViewer = data.channelViewer;

      if (!targetUser) {
        return {
          id: null,
          login: user.login,
          displayName: user.displayName || user.login,
          notFound: true,
          channel: channelUser ? {
            id: channelUser.id,
            login: channelUser.login,
            displayName: channelUser.displayName,
            moderationSettings: data.channel?.moderationSettings
          } : null,
          channelUser: channelUser || null,
          currentUser: currentUser ? { id: currentUser.id, login: currentUser.login } : null,
          channelViewer: null
        };
      }

      const out = {
        id: targetUser.id,
        login: targetUser.login,
        displayName: targetUser.displayName,
        description: targetUser.description,
        chatColor: targetUser.chatColor,
        profileImageURL: targetUser.profileImageURL,
        bannerImageURL: targetUser.bannerImageURL,
        primaryColorHex: targetUser.primaryColorHex,
        profileViewCount: targetUser.profileViewCount,
        createdAt: targetUser.createdAt,
        updatedAt: targetUser.updatedAt,
        followers: targetUser.followers,
        roles: targetUser.roles,
        broadcastSettings: targetUser.broadcastSettings,
        stream: targetUser.stream,
        isModerator: !!targetUser.isModerator,

        suspended: data.activeTargetUser === null ? {
          reason: data.targetStatus?.__typename === "UserDoesNotExist" ? data.targetStatus.reason : "UNKNOWN"
        } : null,

        sourceChannel: source?.login && source.login !== channelLogin
          ? { id: source.id, login: source.login, displayName: source.displayName || source.login, profileImageURL: source.profileImageURL || null }
          : null,

        self: targetUser.self ? {
          canFollow: targetUser.self.canFollow,
          follower: targetUser.self.follower
        } : null,

        relationship: targetUser.relationship ? {
          followedAt: targetUser.relationship.followedAt,
          followedByAt: targetUser.relationship.followedByAt,
          isFollowing: !!targetUser.relationship.followedAt,
          subscriptionBenefit: targetUser.relationship.subscriptionBenefit,
          isSubscribed: !!targetUser.relationship.subscriptionBenefit,
          subscriptionTier: targetUser.relationship.subscriptionBenefit?.tier,
          purchasedWithPrime: targetUser.relationship.subscriptionBenefit?.purchasedWithPrime,
          gift: targetUser.relationship.subscriptionBenefit?.gift,
          cumulativeTenure: targetUser.relationship.cumulativeTenure
        } : null,

        channel: channelUser ? {
          id: channelUser.id,
          login: channelUser.login,
          displayName: channelUser.displayName,
          subscriptionProducts: channelUser.subscriptionProducts,
          moderatorAccess: channelUser.self,
          moderationSettings: data.channel?.moderationSettings,
          canAddMods: !!data.channel?.canAddMods,
          canRemoveMods: !!data.channel?.canRemoveMods
        } : null,

        channelUser: channelUser ? {
          id: channelUser.id,
          login: channelUser.login,
          displayName: channelUser.displayName,
          self: channelUser.self
        } : null,

        currentUser: currentUser ? {
          id: currentUser.id,
          login: currentUser.login,
          roles: currentUser.roles,
          blockedUsers: currentUser.blockedUsers,
          hasBlocked: currentUser.blockedUsers?.some(blocked => blocked.id === targetUser.id) || false
        } : null,

        channelViewer: channelViewer ? {
          id: channelViewer.id,
          earnedBadges: channelViewer.earnedBadges
        } : null,

        _raw: {
          targetUser: data.targetUser,
          channelUser: data.channelUser,
          currentUser: data.currentUser,
          channelViewer: data.channelViewer
        }
      };

      return out;

    } catch (err) {
      console.error("[ViewerCards] Error loading viewer card data:", err);
      throw err;
    }
  }

  async fetch7TVData(userId) {
    try {
      const response = await fetch("https://7tv.io/v3/gql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `query GetUserByConnection($platform: ConnectionPlatform!, $id: String!) {
                  userByConnection(platform: $platform, id: $id) {
                    style {
                      color
                      paint_id
                      paint {
                        id
                        name
                        color
                        gradients {
                          function
                          canvas_repeat
                          at
                          stops { at color center_at }
                          image_url
                          shape
                          angle
                          repeat
                        }
                        shadows { x_offset y_offset radius color }
                        text {
                          weight
                          shadows { x_offset y_offset radius color }
                          transform
                          stroke { color width }
                        }
                        function
                        repeat
                        angle
                        shape
                        image_url
                        stops { at color center_at }
                      }
                    }
                  }
                }`,
          variables: { platform: "TWITCH", id: String(userId) }
        })
      });

      if (!response.ok) return null;

      const json = await response.json();
      return json?.data?.userByConnection?.style ?? null;
    } catch (err) {
      console.error("[ViewerCards] 7TV fetch error:", err);
      return null;
    }
  }

  async openCard(user, room, event, source) {
    const card_key = user.login;
    const old_card = this.open_cards.get(card_key);

    if (old_card && old_card.isActive()) {
      old_card.focus();
      old_card.bringToFront();
      return;
    }

    let pos_x = event ? event.clientX : window.innerWidth / 2;
    let pos_y = event ? event.clientY + 15 : window.innerHeight / 2;

    if (this.last_card && this.last_card.isActive()) {
      if (!event) {
        const lastPos = this.last_card.getPosition();
        pos_x = lastPos.x;
        pos_y = lastPos.y;
      }
      this.last_card.close();
    }

    try {
      const showPaints = this.settings.get("addon.trubbel.channel.chat.viewer-cards.show-paints");
      const [data, , knownSeventv] = await Promise.all([
        this.loadData(user, room, source),
        this.loadVue(),
        showPaints && user.id ? this.fetch7TVData(user.id) : Promise.resolve(null)
      ]);

      const seventvData = !showPaints ? null
        : user.id ? knownSeventv
        : (data?.id ? await this.fetch7TVData(data.id) : null);

      const card = this.buildCard(pos_x, pos_y, user, data, seventvData);
      this.open_cards.set(card_key, card);
      this.last_card = card;
      this.updateStyle(user.login);

    } catch (err) {
      console.error("[ViewerCards] Error creating card:", err);
    }
  }

  buildCard(pos_x, pos_y, user, data, seventvData) {
    const timeoutButtons = this.settings.provider.get("addon.trubbel.channel.chat.viewer-cards.timeout-buttons.config") || [
      { value: 1, unit: "second" },
      { value: 5, unit: "minute" },
      { value: 10, unit: "minute" },
      { value: 1, unit: "hour" },
      { value: 2, unit: "hour" },
      { value: 1, unit: "day" },
      { value: 1, unit: "week" },
      { value: 2, unit: "week" }
    ];

    const card = new ViewerCard({
      ffz: this,
      user: deep_copy(user),
      data: data,
      seventvData: seventvData,
      position: { x: pos_x, y: pos_y },
      settings: {
        showBanner: this.settings.get("addon.trubbel.channel.chat.viewer-cards.show-banner"),
        showBadges: this.settings.get("addon.trubbel.channel.chat.viewer-cards.show-badges"),
        showAvatarTooltip: this.settings.get("addon.trubbel.channel.chat.viewer-cards.show-avatar-tooltip"),
        showNativeButton: this.settings.get("addon.trubbel.channel.chat.viewer-cards.show-native-button"),
        showPopoutButton: this.settings.get("addon.trubbel.channel.chat.viewer-cards.show-popout-button"),
        modTabs: this.settings.get("addon.trubbel.channel.chat.viewer-cards.mod-tabs"),
        menuItems: this.settings.get("addon.trubbel.channel.chat.viewer-cards.more-options"),
        showPaints: this.settings.get("addon.trubbel.channel.chat.viewer-cards.show-paints"),
        timeoutButtons: timeoutButtons
      },
      onClose: () => {
        const card_key = user.login;
        this.open_cards.delete(card_key);

        if (this.last_card === card) {
          this.last_card = null;
        }

        const remaining = [...this.open_cards.values()].find(c => c.isActive());
        this.updateStyle(remaining ? remaining.user.login : null);
        this.emit("tooltips:cleanup");
      },
      onPin: () => {
        if (this.last_card === card) {
          this.last_card = null;
        }
        this.updateStyle(user.login);
      }
    });

    return card;
  }

  isTempHighlighted(login) {
    return !!(login && this.temp_highlights && this.temp_highlights.has(login.toLowerCase()));
  }

  toggleTempHighlight(login) {
    if (!login) return false;
    login = login.toLowerCase();
    if (!this.temp_highlights) this.temp_highlights = new Set();

    if (this.temp_highlights.has(login)) this.temp_highlights.delete(login);
    else this.temp_highlights.add(login);

    this.updateTempHighlights();
    this.emit("trubbel:temp-highlight-changed", login);
    return this.temp_highlights.has(login);
  }

  clearTempHighlights() {
    if (!this.temp_highlights || !this.temp_highlights.size) return;
    this.temp_highlights.clear();
    this.updateTempHighlights();
    this.emit("trubbel:temp-highlight-changed");
  }

  updateTempHighlights() {
    const logins = this.temp_highlights ? [...this.temp_highlights] : [];
    if (!logins.length) {
      this.style.delete("trubbel-viewer-card-temp-highlight");
      return;
    }

    let color = this.settings.get("addon.trubbel.channel.chat.viewer-cards.temp-highlight-color");
    if (!color || !color.length)
      color = this.settings.get("theme.is-dark") !== false ? "rgba(255,170,0,0.2)" : "rgba(255,200,80,0.3)";

    const selectors = logins.flatMap(l => [
      `body .chat-room .chat-scrollable-area__message-container > div:nth-child(1n+0) > .chat-line__message:not(.chat-line--inline)[data-user="${l}"]`,
      `body .chat-room .chat-scrollable-area__message-container > div:nth-child(1n+0) > div > .chat-line__message:not(.chat-line--inline)[data-user="${l}"]`,
      `body .chat-room .chat-line__message:not(.chat-line--inline):nth-child(1n+0)[data-user="${l}"]`
    ]).join(",\n");

    this.style.set("trubbel-viewer-card-temp-highlight", `${selectors} {\n  background-color: ${color} !important;\n}`);
  }

  get notes() {
    if (!this.notes_cache) this.notes_cache = { ...(this.settings.provider.get(NOTES_KEY) || {}) };
    return this.notes_cache;
  }

  onProviderChange(key) {
    if (key !== NOTES_KEY) return;
    this.notes_cache = null;
    this.emit("trubbel:notes-changed");
  }

  getNote(id) {
    return (id && this.notes[id]) || null;
  }

  setNote(user, text) {
    if (!user || !user.id) return;
    text = (text || "").trim();
    if (!text) return this.deleteNote(user.id);

    this.notes[user.id] = {
      login: user.login,
      displayName: user.displayName || user.login,
      text,
      updatedAt: new Date().toISOString()
    };
    this.settings.provider.set(NOTES_KEY, this.notes);
    this.emit("trubbel:notes-changed", user.id);
  }

  deleteNote(id) {
    if (!id || !this.notes[id]) return;
    delete this.notes[id];
    this.settings.provider.set(NOTES_KEY, this.notes);
    this.emit("trubbel:notes-changed", id);
  }

  closeAllCards() {
    for (const card of this.open_cards.values()) {
      if (card.isActive()) {
        card.close();
      }
    }
    this.open_cards.clear();
    this.last_card = null;
    this.updateStyle(null);
  }
}

class ViewerCard {
  constructor({ ffz, user, data, seventvData, position, settings, onClose, onPin }) {

    this.ffz = ffz;
    this.user = user;
    this.data = data;
    this.seventvData = seventvData;
    this.position = position;
    this.settings = settings;
    this.onClose = onClose;
    this.onPin = onPin;

    this._active = true;
    this._pinned = false;
    this._component = null;
    this._child = null;

    this._createComponent();
  }

  _createComponent() {
    try {
      this._component = new this.ffz.vue.Vue({
        el: createElement("div"),
        render: h => h("trubbel-viewer-card", {
          props: {
            raw_user: this.user,
            data: Promise.resolve(this.data),
            seventvData: this.seventvData,
            getFFZ: () => this.ffz,
            getZ: getDialogNextZ,
            showBanner: this.settings.showBanner,
            showBadges: this.settings.showBadges,
            showAvatarTooltip: this.settings.showAvatarTooltip,
            showNativeButton: this.settings.showNativeButton,
            showPopoutButton: this.settings.showPopoutButton,
            modTabs: this.settings.modTabs,
            menuItems: this.settings.menuItems,
            showPaints: this.settings.showPaints,
            timeoutButtons: this.settings.timeoutButtons
          },
          on: {
            emit: (event, ...args) => this.ffz.emit(event, ...args),
            close: () => this._handleClose(),
            "close-all": () => this.ffz.closeAllCards(),
            pin: () => this._handlePin()
          }
        })
      });

      this._child = this._component.$children[0];

      const el = this._component.$el;
      el.style.left = `${this.position.x}px`;
      el.style.top = `${this.position.y}px`;

      const container = document.querySelector(
        this.ffz.site.constructor.DIALOG_SELECTOR ??
        "#root>div>.tw-full-height,.twilight-minimal-root>.tw-full-height"
      );

      if (!container) {
        console.error("[ViewerCards] Could not find container element");
        return;
      }

      container.appendChild(el);

      requestAnimationFrame(() => {
        if (this._child && this._child.constrain) {
          this._child.constrain();
        }
      });

    } catch (err) {
      console.error("[ViewerCards] Error creating component:", err);
    }
  }

  _handleClose() {
    if (!this._active) return;

    this._active = false;

    if (this._component) {
      this._component.$destroy();
    }

    if (this._component && this._component.$el && this._component.$el.parentNode) {
      this._component.$el.parentNode.removeChild(this._component.$el);
    }

    this._component = null;
    this._child = null;

    if (this.onClose) {
      this.onClose();
    }
  }

  _handlePin() {
    this._pinned = true;
    if (this.onPin) {
      this.onPin();
    }
  }

  isActive() {
    return this._active;
  }

  isPinned() {
    return this._pinned;
  }

  close() {
    this._handleClose();
  }

  focus() {
    if (this._child && this._child.focus) {
      this._child.focus();
    }
  }

  bringToFront() {
    if (this._component && this._component.$el) {
      this._component.$el.style.zIndex = getDialogNextZ();
    }
  }

  getPosition() {
    if (this._component && this._component.$el) {
      return {
        x: this._component.$el.offsetLeft,
        y: this._component.$el.offsetTop
      };
    }
    return this.position;
  }
}