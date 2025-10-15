import { BAD_USERS } from "../../../utilities/constants/types";

export default class SharedChatMessage {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.router = parent.router;
    this.site = parent.site;
    this.log = parent.log;

    this.isActive = false;

    this.handleNavigation = this.handleNavigation.bind(this);
    this.enableSharedChatMessage = this.enableSharedChatMessage.bind(this);
    this.disableSharedChatMessage = this.disableSharedChatMessage.bind(this);
    this.handleSettingChange = this.handleSettingChange.bind(this);

    this.messageType = {
      type: "shared-chat-message",
      priority: 0,
      process: (tokens, msg) => {
        if (!tokens || !tokens.length) return;
        if (msg.sourceRoomID && msg.roomID && msg.sourceRoomID !== msg.roomID) {
          msg.ffz_removed = true;
          return tokens;
        }
        return tokens;
      }
    }
  }

  initialize() {
    const enabled = this.settings.get("addon.trubbel.channel.chat.shared_chat.hide-message");
    if (enabled) {
      this.handleNavigation();
    } else {
      this.disableSharedChatMessage();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.handleNavigation();
    } else {
      this.disableSharedChatMessage();
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
      const enabled = this.settings.get("addon.trubbel.channel.chat.shared_chat.hide-message");
      if (enabled && !this.isActive) {
        this.enableSharedChatMessage();
      }
    } else {
      if (this.isActive) {
        this.disableSharedChatMessage();
      }
    }
  }

  enableSharedChatMessage() {
    if (this.isActive) return;
    this.parent.resolve("site.chat").chat.addTokenizer(this.messageType);
    this.parent.emit("chat:update-lines");
    this.isActive = true;
  }

  disableSharedChatMessage() {
    if (!this.isActive) return;
    this.parent.resolve("site.chat").chat.removeTokenizer(this.messageType);
    this.parent.emit("chat:update-lines");
    this.isActive = false;
  }
}