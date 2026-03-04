import { BAD_USERS } from "../../../utilities/constants/types";

import { STOP_EMOTE_ANIM_KEY_CONFIG } from "../../../utilities/constants/config";

const { createElement, on, off } = FrankerFaceZ.utilities.dom;

export default class StopEmoteAnimate {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.router = parent.router;
    this.style = parent.style;
    this.site = parent.site;

    this.isActive = false;

    this.contextMenu = null;
    this.boundContextMenu = null;
    this.boundCloseMenu = null;
    this.boundEscKey = null;

    this.handleNavigation = this.handleNavigation.bind(this);
    this.handleSettingChange = this.handleSettingChange.bind(this);

    this.noAnimTokenizer = {
      type: "stop-emote-animate",
      priority: 0,
      process: (tokens) => {
        const blocked = this.getBlocklist();
        if (!blocked.length) return;

        const blockSet = new Set(blocked.map(e => `${e.provider}:${e.id}`));

        let changed = false;
        for (const token of tokens) {
          if (token.type !== "emote") continue;
          if (!token.animSrc) continue;

          const key = `${token.provider}:${token.id}`;
          if (!blockSet.has(key)) continue;

          token.animSrc = null;
          token.animSrc2 = null;
          token.animSrcSet = null;
          token.animSrcSet2 = null;
          token.anim = 0;
          changed = true;
        }

        return changed ? tokens : null;
      }
    };
  }

  initialize() {
    const enabled = this.settings.get("addon.trubbel.channel.chat.accessibility.stop_emote_animate");
    if (enabled) {
      this.handleNavigation();
    } else {
      this.disable();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.handleNavigation();
    } else {
      this.disable();
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
      const enabled = this.settings.get("addon.trubbel.channel.chat.accessibility.stop_emote_animate");
      if (enabled && !this.isActive) {
        this.enable();
      }
    } else {
      if (this.isActive) {
        this.disable();
      }
    }
  }

  enable() {
    if (this.isActive) return;

    const chat = this.site.children.chat.chat;
    chat.addTokenizer(this.noAnimTokenizer);

    this.boundContextMenu = this.onContextMenu.bind(this);
    this.boundCloseMenu = this.closeContextMenu.bind(this);
    this.boundEscKey = (e) => { if (e.key === "Escape") this.closeContextMenu(); };

    on(document, "contextmenu", this.boundContextMenu, true);
    on(document, "click", this.boundCloseMenu, true);
    on(document, "keydown", this.boundEscKey, true);

    this.style.set("stop-anim-menu", `
      .trubbel-stop-anim-menu {
        position: fixed;
        z-index: 9999;
        background: #18181b;
        border: 1px solid #464649;
        border-radius: 4px;
        padding: 4px 0;
        min-width: 190px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.6);
        font-size: 13px;
        font-family: inherit;
      }
      .trubbel-stop-anim-menu__header {
        padding: 5px 12px 4px;
        color: #adadb8;
        font-size: 11px;
        /*text-transform: uppercase;*/
        letter-spacing: 0.06em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 200px;
      }
      .trubbel-stop-anim-menu__divider {
        height: 1px;
        background: #464649;
        margin: 4px 0;
      }
      .trubbel-stop-anim-menu__btn {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        padding: 7px 12px;
        background: none;
        border: none;
        color: #efeff1;
        cursor: pointer;
        text-align: left;
        font-size: 13px;
        font-family: inherit;
        transition: background 0.1s;
      }
      .trubbel-stop-anim-menu__btn:hover {
        background: #26262c;
      }
      .trubbel-stop-anim-menu__btn--active {
        color: #bf94ff;
      }
      .trubbel-stop-anim-icon {
        width: 16px;
        text-align: center;
        flex-shrink: 0;
      }
    `);

    this.parent.emit("chat:update-lines");
    this.isActive = true;
  }

  getBlocklist() {
    return this.settings.provider.get(STOP_EMOTE_ANIM_KEY_CONFIG) || [];
  }

  setBlocklist(list) {
    if (!list?.length) {
      this.settings.provider.delete(STOP_EMOTE_ANIM_KEY_CONFIG);
    } else {
      this.settings.provider.set(STOP_EMOTE_ANIM_KEY_CONFIG, list);
    }
    this.parent.emit("stop-anim:blocklist-changed");
  }

  isBlocked(provider, id) {
    return this.getBlocklist().some(
      e => e.provider === provider && String(e.id) === String(id)
    );
  }

  toggleEmote(provider, id, name, source) {
    const list = this.getBlocklist();
    const idx = list.findIndex(
      e => e.provider === provider && String(e.id) === String(id)
    );

    if (idx === -1) {
      list.push({ provider, source, id, name });
    } else {
      list.splice(idx, 1);
    }

    this.setBlocklist(list);
    this.parent.emit("chat:update-lines");
  }

  removeEmote(provider, id) {
    const list = this.getBlocklist();
    const idx = list.findIndex(
      e => e.provider === provider && String(e.id) === String(id)
    );
    if (idx === -1) return;

    list.splice(idx, 1);
    this.setBlocklist(list);
    this.parent.emit("chat:update-lines");
  }

  clearBlocklist() {
    this.settings.provider.delete(STOP_EMOTE_ANIM_KEY_CONFIG);
    this.parent.emit("chat:update-lines");
  }

  getEmoteSource(setId) {
    if (!setId) return "ffz";
    if (setId.includes("seventv")) return "7tv";
    if (setId.includes("ffzap.betterttv") || setId.includes("betterttv")) return "bttv";
    return "ffz";
  }

  resolveEmoteTarget(event) {
    const chatEmote = event.target.closest(".chat-line__message--emote[data-tooltip-type=\"emote\"]");
    if (chatEmote) {
      return {
        element: chatEmote,
        provider: chatEmote.dataset.provider,
        id: chatEmote.dataset.id,
        name: chatEmote.getAttribute("alt"),
        setId: chatEmote.dataset.set
      };
    }

    const pickerEmote = event.target.closest(".emote-picker__emote-link[data-tooltip-type=\"emote\"]");
    if (pickerEmote) {
      return {
        element: pickerEmote,
        provider: pickerEmote.dataset.provider,
        id: pickerEmote.dataset.id,
        name: pickerEmote.dataset.name,
        setId: pickerEmote.dataset.set
      };
    }

    return null;
  }

  onContextMenu(event) {
    const resolved = this.resolveEmoteTarget(event);
    if (!resolved) return;

    const { provider, id, name, setId } = resolved;

    if (!provider || !id) return;
    if (provider !== "ffz" && provider !== "twitch") return;

    const source = provider === "twitch"
      ? "twitch"
      : this.getEmoteSource(setId);
    const alreadyBlocked = this.isBlocked(provider, id);

    const hasAnimation = alreadyBlocked
      || resolved.element.dataset.hoverSrc
      || this.emoteIsAnimated(provider, id);

    if (!hasAnimation) return;

    event.preventDefault();
    event.stopPropagation();

    this.showContextMenu(event.clientX, event.clientY, provider, id, name || id, source, alreadyBlocked);
  }

  emoteIsAnimated(provider, id) {
    if (provider === "ffz") {
      const emotes = this.parent.resolve("chat")?.emotes;
      if (!emotes) return false;
      for (const set of Object.values(emotes.emote_sets || {})) {
        if (!set) continue;
        const emote = set.emotes?.[id] ?? set.disabled_emotes?.[id];
        if (emote?.animated) return true;
      }
    } else if (provider === "twitch") {
      return true;
    }
    return false;
  }

  showContextMenu(x, y, provider, id, name, source, isBlocked) {
    this.closeContextMenu();

    const btn = createElement("button", {
      className: `trubbel-stop-anim-menu__btn${isBlocked ? " trubbel-stop-anim-menu__btn--active" : ""}`,
      onclick: () => {
        this.toggleEmote(provider, id, name, source);
        this.closeContextMenu();
      }
    }, [
      createElement("span", { className: "trubbel-stop-anim-icon" }, isBlocked ? "▶" : "⏸"),
      isBlocked ? " Re-enable Animation" : " Disable Animation"
    ]);

    const menu = createElement("div", { className: "trubbel-stop-anim-menu" }, [
      createElement("div", { className: "trubbel-stop-anim-menu__header" }, name),
      createElement("div", { className: "trubbel-stop-anim-menu__divider" }),
      btn
    ]);

    document.body.appendChild(menu);
    this.contextMenu = menu;

    const rect = menu.getBoundingClientRect();
    menu.style.left = `${x + rect.width > window.innerWidth ? window.innerWidth - rect.width - 8 : x}px`;
    menu.style.top = `${y + rect.height > window.innerHeight ? window.innerHeight - rect.height - 8 : y}px`;
  }

  closeContextMenu() {
    if (this.contextMenu) {
      this.contextMenu.remove();
      this.contextMenu = null;
    }
  }

  disable() {
    if (!this.isActive) return;

    const chat = this.site.children.chat.chat;
    chat.removeTokenizer(this.noAnimTokenizer);

    if (this.boundContextMenu) {
      off(document, "contextmenu", this.boundContextMenu, true);
    }
    if (this.boundCloseMenu) {
      off(document, "click", this.boundCloseMenu, true);
    }
    if (this.boundEscKey) {
      off(document, "keydown", this.boundEscKey, true);
    }

    this.boundContextMenu = null;
    this.boundCloseMenu = null;
    this.boundEscKey = null;

    this.closeContextMenu();

    if (this.style.has("stop-anim-menu")) {
      this.style.delete("stop-anim-menu");
    }

    this.parent.emit("chat:update-lines");
    this.isActive = false;
  }
}