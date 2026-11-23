import { BAD_USERS } from "../../../utilities/constants/types";

const { on } = FrankerFaceZ.utilities.dom;

const KEYS_MAP = {
  Backquote: "`", Comma: ",", Period: ".", Slash: "/", Semicolon: ";", Quote: "'",
  BracketLeft: "[", BracketRight: "]", Backslash: "\\", Minus: "-", Equal: "=",
  ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down"
};

for (const num of [1, 2, 3, 4, 5, 6, 7, 8, 9, 0])
  KEYS_MAP[`Digit${num}`] = `${num}`;

for (const letter of "abcdefghijklmnopqrstuvwxyz")
  KEYS_MAP[`Key${letter.toUpperCase()}`] = letter;

const CONFIRM_TIMEOUT = 3000;

export default class ModNavigator {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.router = parent.router;
    this.style = parent.style;
    this.chat = parent.chat;
    this.site = parent.site;
    this.fine = parent.fine;
    this.twitch_data = parent.twitch_data;
    this.log = parent.log;

    this.isActive = false;
    this.currentId = null;
    this.keydownCleanup = null;
    this.currentHighlightNode = null;
    this.pendingConfirm = null;
    this.currentTimestamp = null;

    this.actionedIds = new Set();
    this.actionedUsers = new Set();
    this.doneNodes = new Set();

    this.handleNavigation = this.handleNavigation.bind(this);
    this.enableModNavigator = this.enableModNavigator.bind(this);
    this.disableModNavigator = this.disableModNavigator.bind(this);
    this.handleSettingChange = this.handleSettingChange.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  initialize() {
    const enabled = this.settings.get("addon.trubbel.channel.chat.mod_navigator");
    if (enabled) {
      this.handleNavigation();
    } else {
      this.disableModNavigator();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.handleNavigation();
    } else {
      this.disableModNavigator();
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
      const enabled = this.settings.get("addon.trubbel.channel.chat.mod_navigator")
        && !this.settings.get("addon.trubbel.channel.chat.navigator_conflict");
      if (enabled && !this.isActive) {
        this.enableModNavigator();
      } else if (!enabled && this.isActive) {
        this.disableModNavigator();
      }
    } else {
      if (this.isActive) {
        this.disableModNavigator();
      }
    }
  }

  enableModNavigator() {
    if (this.isActive) return;

    this.isActive = true;

    this.keydownCleanup = on(document, "keydown", this.handleKeyDown, { capture: true });

    this.updateStyle();
  }

  updateStyle() {
    if (!this.isActive) return;

    const color = this.settings.get("addon.trubbel.channel.chat.mod_navigator.color");

    this.style.set("mod-navigator-highlight", `
      [data-trubbel-mod-target] {
        outline: 2px solid ${color} !important;
        outline-offset: -2px;
        box-shadow: 0 0 10px 2px ${color} !important;
        background-color: color-mix(in srgb, ${color} 15%, transparent) !important;
      }
      [data-trubbel-mod-done] > :not(.ffz--hover-actions) {
        opacity: 0.5;
        filter: grayscale(1);
      }
    `);
  }

  disableModNavigator() {
    if (!this.isActive) return;

    this.isActive = false;

    if (this.keydownCleanup) {
      this.keydownCleanup();
      this.keydownCleanup = null;
    }

    this.resetNavigation();

    for (const node of this.doneNodes) delete node.dataset.trubbelModDone;
    this.doneNodes.clear();
    this.actionedIds.clear();
    this.actionedUsers.clear();

    this.style.delete("mod-navigator-highlight");
  }

  resetNavigation() {
    this.clearHighlight();
    this.currentId = null;
    this.currentTimestamp = null;
    this.pendingConfirm = null;
  }

  getShortcut(event) {
    const code = KEYS_MAP[event.code] || event.key;
    return `${event.ctrlKey ? "ctrl+" : ""}${event.altKey ? "alt+" : ""}${event.shiftKey ? "shift+" : ""}${code}`;
  }

  getShortcutModifiers() {
    const shortcut = this.settings.get("addon.trubbel.channel.chat.mod_navigator.key");
    if (!shortcut) return null;
    return shortcut.split("+").slice(0, -1).join("+") || null;
  }

  getEventModifiers(event) {
    if (event.metaKey) return null;
    return [event.ctrlKey && "ctrl", event.altKey && "alt", event.shiftKey && "shift"].filter(Boolean).join("+");
  }

  handleKeyDown(event) {
    if (!this.isActive) return;

    const input = this.getFocusedChatInput();

    if (!input) {
      if (this.currentId) this.resetNavigation();
      return;
    }

    const isUp = event.key === "ArrowUp";
    const isDown = event.key === "ArrowDown";

    const modifiers = this.getShortcutModifiers();
    if ((isUp || isDown) && modifiers && this.getEventModifiers(event) === modifiers) {
      event.preventDefault();
      event.stopPropagation();
      this.navigate(isUp, input);
      return;
    }

    if (!this.currentId) return;

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      this.resetNavigation();
      return;
    }

    if (["Control", "Shift", "Alt", "Meta"].includes(event.key)) return;

    event.preventDefault();
    event.stopPropagation();

    const shortcut = this.getShortcut(event);
    let action = null;

    if (shortcut === this.settings.get("addon.trubbel.channel.chat.mod_navigator.ban_key")) action = "ban";
    else if (shortcut === this.settings.get("addon.trubbel.channel.chat.mod_navigator.timeout_key")) action = "timeout";
    else if (shortcut === this.settings.get("addon.trubbel.channel.chat.mod_navigator.delete_key")) action = "delete";

    if (action) this.runAction(action, input);
  }

  navigate(isUp, input) {
    const lines = this.getModeratableLines(input);
    if (!lines.length) return;

    if (!this.currentId) {
      if (isUp) this.select(lines[lines.length - 1].msg);
      return;
    }

    const ts = this.currentTimestamp;

    if (isUp) {
      const older = lines.filter(entry => entry.msg.timestamp < ts);
      if (older.length) this.select(older[older.length - 1].msg);

    } else {
      const newer = lines.find(entry => entry.msg.timestamp > ts);
      if (newer) {
        this.select(newer.msg);
      } else {
        this.resetNavigation();
      }
    }
  }

  select(msg) {
    this.parent.replyNavigator?.cancel();

    if (msg.id !== this.currentId) this.pendingConfirm = null;
    this.currentId = msg.id;
    this.currentTimestamp = msg.timestamp;
    this.applyHighlight();
  }

  getFocusedChatInput() {
    const activeEl = document.activeElement;
    if (!activeEl?.classList.contains("chat-wysiwyg-input__editor")) return null;

    return this.fine.searchParent(activeEl, "chat-input", 100);
  }

  getMyLevel(inst) {
    const me = this.site.getUser();
    if (!me) return 0;

    if (me.id === inst.props.channelID) return 5;

    const perms = this.site.children.chat.input.CommandSuggestions.first?.props?.chatCommandPermissions;
    if (perms instanceof Set && perms.has("moderation.roles.mod:add")) return 4;

    if (inst.props.isCurrentUserModerator || inst.props.hasModPermissions) return 3;

    return 0;
  }

  getAuthorLevel(msg) {
    const badges = msg.badges || {};
    if (badges.broadcaster) return 5;
    if (badges.lead_moderator) return 4;
    if (badges.moderator) return 3;
    return 0;
  }

  getPermissions(inst, msg) {
    const me = this.site.getUser();
    const isSelf = !!me && msg.user?.id === me.id;
    const myLevel = this.getMyLevel(inst);
    const authorLevel = this.getAuthorLevel(msg);

    if (myLevel < 3) return { canDelete: false, canBan: false };

    return {
      canDelete: !msg.ffz_held && (isSelf || myLevel > authorLevel),
      canBan: !isSelf && (authorLevel === 0 || myLevel === 5)
    };
  }

  getModeratableLines(input) {
    const channelID = input.props.channelID;
    const lines = [];
    const seen = new Set();

    for (const { message: msg, _instance: inst } of this.chat.iterateMessages(true, false, false)) {

      if (!msg || !(inst?.ffzOpenReply || msg.ffz_held)) continue;
      if (inst.props.channelID !== channelID) continue;
      if (!msg.id || typeof msg.id !== "string" || seen.has(msg.id)) continue;
      if (!/^[0-9a-f-]+$/i.test(msg.id)) continue;
      if (msg.deleted || msg.ffz_removed) continue;
      if (this.actionedIds.has(msg.id) || this.actionedUsers.has(msg.user?.id)) continue;
      const node = this.getLineNode(inst);
      if (!node?.closest(".chat-scrollable-area__message-container")) continue;

      const perms = this.getPermissions(inst, msg);
      if (!perms.canDelete && !perms.canBan) continue;

      seen.add(msg.id);
      lines.push({ msg, inst, perms });
    }

    return lines.sort((a, b) => a.msg.timestamp - b.msg.timestamp);
  }

  getLineNode(inst) {
    const node = this.fine.getFirstChild(inst._reactInternals)?.stateNode;
    return node?.nodeType === Node.ELEMENT_NODE ? node : null;
  }

  getEntry(input) {
    return this.getModeratableLines(input).find(entry => entry.msg.id === this.currentId) || null;
  }

  needsConfirm(action) {
    const mode = this.settings.get("addon.trubbel.channel.chat.mod_navigator.confirm");
    if (action === "ban") return mode >= 1;
    if (action === "timeout") return mode >= 2;
    return false;
  }

  runAction(action, input) {
    if (this.actionedIds.has(this.currentId)) return;

    const entry = this.getEntry(input);
    if (!entry) {
      this.resetNavigation();
      return;
    }

    const { msg, inst, perms } = entry;
    const room = inst.props.channelLogin ?? msg.roomLogin;
    const login = msg.user?.login;

    if (action === "delete" && !perms.canDelete) return;
    if ((action === "ban" || action === "timeout") && !perms.canBan) return;

    if (this.needsConfirm(action)) {
      const pending = this.pendingConfirm;
      if (!pending || pending.action !== action || pending.id !== msg.id || Date.now() - pending.time > CONFIRM_TIMEOUT) {
        this.pendingConfirm = { action, id: msg.id, time: Date.now() };
        this.site.children.chat.addNotice(room, `Press the ${action} key again to ${action} ${login}.`);
        return;
      }
    }

    this.pendingConfirm = null;

    if (action === "delete") {
      this.twitch_data.deleteChatMessage(inst.props.channelID, msg.id).catch(err => {
        this.site.children.chat.addNotice(room, err?.message || "Failed to delete message.");
      });

    } else if (action === "ban") {
      this.site.children.chat.sendMessage(room, `/ban ${login}`);

    } else if (action === "timeout") {
      const duration = this.settings.get("addon.trubbel.channel.chat.mod_navigator.timeout_duration");
      this.site.children.chat.sendMessage(room, `/timeout ${login} ${duration}`);
    }

    this.actionedIds.add(msg.id);
    if (action !== "delete" && msg.user?.id) this.actionedUsers.add(msg.user.id);

    if (this.currentHighlightNode) {
      this.currentHighlightNode.dataset.trubbelModDone = "";
      this.doneNodes.add(this.currentHighlightNode);
    }

    if (!this.settings.get("addon.trubbel.channel.chat.mod_navigator.stay")) {
      this.resetNavigation();
    }
  }

  applyHighlight() {
    this.clearHighlight();

    for (const { message: msg, _instance: inst } of this.chat.iterateMessages(true, false, false)) {
      if (msg?.id !== this.currentId || !inst) continue;

      const node = this.getLineNode(inst);
      if (!node?.closest(".chat-scrollable-area__message-container")) continue;

      node.dataset.trubbelModTarget = "";
      this.currentHighlightNode = node;
      node.scrollIntoView({ block: "nearest" });
      return;
    }
  }

  clearHighlight() {
    if (this.currentHighlightNode) {
      delete this.currentHighlightNode.dataset.trubbelModTarget;
      this.currentHighlightNode = null;
    }
  }
}