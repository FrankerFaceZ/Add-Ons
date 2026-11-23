import { BAD_USERS } from "../../../utilities/constants/types";

export default class ModShortcuts {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.router = parent.router;
    this.chat = parent.chat;
    this.site = parent.site;
    this.twitch_data = parent.twitch_data;
    this.log = parent.log;

    this.isActive = false;

    this.handleNavigation = this.handleNavigation.bind(this);
    this.enableModShortcuts = this.enableModShortcuts.bind(this);
    this.disableModShortcuts = this.disableModShortcuts.bind(this);
    this.handleSettingChange = this.handleSettingChange.bind(this);
    this.onUserClick = this.onUserClick.bind(this);
  }

  initialize() {
    const enabled = this.settings.get("addon.trubbel.channel.chat.mod_shortcuts");
    if (enabled) {
      this.handleNavigation();
    } else {
      this.disableModShortcuts();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.handleNavigation();
    } else {
      this.disableModShortcuts();
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
      const enabled = this.settings.get("addon.trubbel.channel.chat.mod_shortcuts")
        && !this.settings.get("addon.trubbel.channel.chat.mod_shortcuts.conflict");
      if (enabled && !this.isActive) {
        this.enableModShortcuts();
      } else if (!enabled && this.isActive) {
        this.disableModShortcuts();
      }
    } else {
      if (this.isActive) {
        this.disableModShortcuts();
      }
    }
  }

  enableModShortcuts() {
    if (this.isActive) return;
    this.isActive = true;

    this.chat.on("chat:user-click", this.onUserClick, this, 0, true);
  }

  disableModShortcuts() {
    if (!this.isActive) return;
    this.isActive = false;

    this.chat.off("chat:user-click", this.onUserClick, this);
  }

  getEventModifiers(event) {
    return [
      (event.ctrlKey || event.metaKey) && "ctrl",
      event.altKey && "alt",
      event.shiftKey && "shift"
    ].filter(Boolean).join("+");
  }

  getAction(modifiers) {
    if (modifiers === this.settings.get("addon.trubbel.channel.chat.mod_shortcuts.ban")) return "ban";
    if (modifiers === this.settings.get("addon.trubbel.channel.chat.mod_shortcuts.timeout")) return "timeout";
    if (modifiers === this.settings.get("addon.trubbel.channel.chat.mod_shortcuts.delete")) return "delete";
    return null;
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

  onUserClick(e) {
    if (!this.isActive) return;

    const event = e.event;
    const inst = e.inst;
    const msg = e.message;
    if (!event || !inst?.props || !msg?.id) return;

    const modifiers = this.getEventModifiers(event);
    if (!modifiers) return;

    const action = this.getAction(modifiers);
    if (!action) return;

    if (e.user?.id && msg.user?.id && e.user.id !== msg.user.id) return;

    e.preventDefault();
    e.stopPropagation();

    const perms = this.getPermissions(inst, msg);
    if (action === "delete" && (!perms.canDelete || msg.deleted)) return;
    if ((action === "ban" || action === "timeout") && !perms.canBan) return;

    const room = e.room?.login || inst.props.channelLogin;
    const login = msg.user?.login;

    if (action === "delete") {
      this.twitch_data.deleteChatMessage(inst.props.channelID, msg.id).catch(err => {
        this.site.children.chat.addNotice(room, err?.message || "Failed to delete message.");
      });

    } else if (action === "ban") {
      this.site.children.chat.sendMessage(room, `/ban ${login}`);

    } else if (action === "timeout") {
      const duration = this.settings.get("addon.trubbel.channel.chat.mod_shortcuts.timeout_duration");
      this.site.children.chat.sendMessage(room, `/timeout ${login} ${duration}`);
    }
  }
}