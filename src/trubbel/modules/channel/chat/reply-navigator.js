import { BAD_USERS } from "../../../utilities/constants/types";

const { on } = FrankerFaceZ.utilities.dom;

export default class ReplyNavigator {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.router = parent.router;
    this.style = parent.style;
    this.chat = parent.chat;
    this.site = parent.site;
    this.fine = parent.fine;
    this.log = parent.log;

    this.isActive = false;
    this.currentReplyId = null;
    this.keydownCleanup = null;
    this.currentHighlightNode = null;
    this.activeInput = null;
    this.originalInputDidUpdate = null;
    this.trayOpen = false;

    this.handleNavigation = this.handleNavigation.bind(this);
    this.enableReplyNavigator = this.enableReplyNavigator.bind(this);
    this.disableReplyNavigator = this.disableReplyNavigator.bind(this);
    this.handleSettingChange = this.handleSettingChange.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.onChatInputUpdate = this.onChatInputUpdate.bind(this);
  }

  initialize() {
    const enabled = this.settings.get("addon.trubbel.channel.chat.reply_navigator");
    if (enabled) {
      this.handleNavigation();
    } else {
      this.disableReplyNavigator();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.handleNavigation();
    } else {
      this.disableReplyNavigator();
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
      const enabled = this.settings.get("addon.trubbel.channel.chat.reply_navigator")
        && !this.settings.get("addon.trubbel.channel.chat.navigator_conflict");
      if (enabled && !this.isActive) {
        this.enableReplyNavigator();
      } else if (!enabled && this.isActive) {
        this.disableReplyNavigator();
      }
    } else {
      if (this.isActive) {
        this.disableReplyNavigator();
      }
    }
  }

  enableReplyNavigator() {
    if (this.isActive) return;

    this.isActive = true;

    this.keydownCleanup = on(document, "keydown", this.handleKeyDown, { capture: true });

    this.updateStyle();
  }

  updateStyle() {
    if (!this.isActive) return;

    const color = this.settings.get("addon.trubbel.channel.chat.reply_navigator.color");

    this.style.set("reply-navigator-highlight", `
      [data-trubbel-reply-target] {
        outline: 2px solid ${color} !important;
        outline-offset: -2px;
        box-shadow: 0 0 10px 2px ${color} !important;
        background-color: color-mix(in srgb, ${color} 15%, transparent) !important;
      }
    `);
  }

  disableReplyNavigator() {
    if (!this.isActive) return;

    this.isActive = false;

    if (this.keydownCleanup) {
      this.keydownCleanup();
      this.keydownCleanup = null;
    }

    this.resetNavigation();
    this.style.delete("reply-navigator-highlight");
  }

  resetNavigation() {
    this.clearReplyHighlight();
    this.unhookChatInput();
    this.currentReplyId = null;
    this.trayOpen = false;
  }

  hookChatInput(input) {
    if (this.activeInput === input) return;
    this.unhookChatInput();

    const t = this;
    const original = input.componentDidUpdate;

    input.componentDidUpdate = function(...args) {
      const result = original?.apply(this, args);
      t.onChatInputUpdate(this);
      return result;
    };

    this.activeInput = input;
    this.originalInputDidUpdate = original;
  }

  unhookChatInput() {
    if (this.activeInput) {
      this.activeInput.componentDidUpdate = this.originalInputDidUpdate;
    }
    this.activeInput = null;
    this.originalInputDidUpdate = null;
  }

  onChatInputUpdate(inst) {
    if (!this.currentReplyId || inst !== this.activeInput) return;

    const hasTray = !!inst.props.tray;
    if (this.trayOpen && !hasTray) {
      this.resetNavigation();
      return;
    }
    this.trayOpen = hasTray;
  }

  handleKeyDown(event) {
    if (!this.isActive) return;

    const isUp = event.key === "ArrowUp";
    const isDown = event.key === "ArrowDown";

    if (!isUp && !isDown) {
      return;
    }

    const modifiers = this.getShortcutModifiers();
    if (!modifiers || this.getEventModifiers(event) !== modifiers) {
      return;
    }

    const input = this.getFocusedChatInput();

    if (!input) {
      if (this.currentReplyId) {
        this.resetNavigation();
      }
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const lines = this.getReplyableLines(input.props.channelID);

    if (!lines.length) {
      return;
    }

    const startId = this.currentReplyId
      ?? input.props.tray?.sendMessageHandler?.additionalMetadata?.reply?.parentMsgId
      ?? null;

    const index = startId ? lines.findIndex(inst => inst.props.message.id === startId) : -1;

    if (isUp) {
      const next = index === -1 ? lines[lines.length - 1] : lines[Math.max(index - 1, 0)];
      if (next.props.message.id !== this.currentReplyId) {
        this.highlightAndOpenReply(next, input);
      }

    } else if (isDown) {
      if (!this.currentReplyId) return;

      const next = index === -1 ? null : lines[index + 1];
      if (next) {
        this.highlightAndOpenReply(next, input);
      } else {
        this.closeReply(input);
      }
    }
  }

  getShortcutModifiers() {
    const shortcut = this.settings.get("addon.trubbel.channel.chat.reply_navigator.key");
    if (!shortcut) return null;
    return shortcut.split("+").slice(0, -1).join("+") || null;
  }

  getEventModifiers(event) {
    if (event.metaKey) return null;
    return [event.ctrlKey && "ctrl", event.altKey && "alt", event.shiftKey && "shift"].filter(Boolean).join("+");
  }

  getFocusedChatInput() {
    const activeEl = document.activeElement;
    if (!activeEl?.classList.contains("chat-wysiwyg-input__editor")) return null;
    return this.fine.searchParent(activeEl, "chat-input", 100);
  }

  getReplyableLines(channelID) {
    const lines = [];
    const seen = new Set();
    const currentUser = this.site.getUser();

    for (const { message: msg, _instance: inst } of this.chat.iterateMessages(true, false, false)) {
      if (!msg || !inst?.ffzOpenReply) continue;

      const props = inst.props;
      if (props.channelID !== channelID) continue;
      if (props.isReplyListItem) continue;
      if (!msg.id || typeof msg.id !== "string" || seen.has(msg.id)) continue;
      if (!/^[0-9a-f-]+$/i.test(msg.id)) continue;
      if (msg.deleted || msg.ffz_removed) continue;
      if (props.disableReplyClick) continue;
      if (!props.reply && !props.hasReply && props.replyRestrictedReason) continue;
      if (currentUser && msg.user?.userID === currentUser.id && !props.reply) continue;
      if (!msg.message || msg.message.length === 0) continue;

      seen.add(msg.id);
      lines.push(inst);
    }

    return lines.sort((a, b) => a.props.message.timestamp - b.props.message.timestamp);
  }

  cancel() {
    if (!this.currentReplyId) return;

    if (this.activeInput) {
      this.closeReply(this.activeInput);
    } else {
      this.resetNavigation();
    }
  }

  highlightAndOpenReply(inst, input) {
    this.parent.modNavigator?.resetNavigation();

    this.clearReplyHighlight();

    this.currentReplyId = inst.props.message.id;
    this.hookChatInput(input);
    this.trayOpen = !!input.props.tray;

    this.applyHighlight();

    inst.ffzOpenReply();
  }

  applyHighlight() {
    const id = this.currentReplyId;
    if (!id) return;

    for (const { message: msg, _instance: inst } of this.chat.iterateMessages(true, false, false)) {
      if (msg?.id !== id || !inst) continue;

      const node = this.fine.getFirstChild(inst._reactInternals)?.stateNode;

      if (node?.nodeType !== Node.ELEMENT_NODE || !node.closest(".chat-scrollable-area__message-container")) continue;

      this.clearReplyHighlight();
      node.dataset.trubbelReplyTarget = "";
      this.currentHighlightNode = node;
      node.scrollIntoView({ block: "nearest" });
      return;
    }
  }

  closeReply(input) {
    input.props.clearTray();
    this.resetNavigation();
  }

  clearReplyHighlight() {
    if (this.currentHighlightNode) {
      delete this.currentHighlightNode.dataset.trubbelReplyTarget;
      this.currentHighlightNode = null;
    }
  }
}