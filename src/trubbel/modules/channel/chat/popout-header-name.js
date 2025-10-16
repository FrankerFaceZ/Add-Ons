import {
  POPOUT_CHAT_HEADER_SELECTOR,
  MOD_POPOUT_CHAT_HEADER_SELECTOR,
  DASH_POPOUT_CHAT_HEADER_SELECTOR
} from "../../../utilities/constants/selectors";

const { sleep } = FrankerFaceZ.utilities.object;

export default class PopoutChatName {
  constructor(parent) {
    this.parent = parent;
    this.twitch_data = parent.twitch_data;
    this.settings = parent.settings;
    this.router = parent.router;
    this.site = parent.site;
    this.log = parent.log;

    this.isActive = false;

    this.handleNavigation = this.handleNavigation.bind(this);
    this.enablePopoutChatName = this.enablePopoutChatName.bind(this);
    this.disablePopoutChatName = this.disablePopoutChatName.bind(this);
    this.handleSettingChange = this.handleSettingChange.bind(this);
    this.extractStreamerFromRoute = this.extractStreamerFromRoute.bind(this);
  }

  initialize() {
    const enabled = this.settings.get("addon.trubbel.channel.chat.popout.title_name");
    if (enabled) {
      this.handleNavigation();
    } else {
      this.disablePopoutChatName();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.log.info("[Popout Chat Name] Enabling popout chat name replacement");
      this.handleNavigation();
    } else {
      this.log.info("[Popout Chat Name] Disabling popout chat name replacement");
      this.disablePopoutChatName();
    }
  }

  handleNavigation() {
    const popoutRoutes = this.site.constructor.POPOUT_ROUTES;
    if (popoutRoutes.includes(this.router?.current?.name)) {
      const enabled = this.settings.get("addon.trubbel.channel.chat.popout.title_name");
      if (enabled && !this.isActive) {
        this.enablePopoutChatName();
      }
    } else {
      if (this.isActive) {
        this.disablePopoutChatName();
      }
    }
  }

  async enablePopoutChatName() {
    if (this.isActive) return;

    const streamer = this.extractStreamerFromRoute();
    if (!streamer) {
      this.log.warn("[Popout Chat Name] Could not extract streamer name from route");
      return;
    }

    this.log.info(`[Popout Chat Name] Setting up chat name replacement for: ${streamer}`);
    this.isActive = true;

    try {
      const streamChatHeader = await this.site.awaitElement(
        `${POPOUT_CHAT_HEADER_SELECTOR}, ${MOD_POPOUT_CHAT_HEADER_SELECTOR}, ${DASH_POPOUT_CHAT_HEADER_SELECTOR}`,
        document.documentElement,
        10000
      );

      if (!streamChatHeader) {
        this.log.warn("[Popout Chat Name] Chat header element not found");
        return;
      }

      // waiting because of shared chats
      await sleep(5000);

      const data = await this.twitch_data.getUser(null, streamer);
      if (!data) {
        this.log.warn(`[Popout Chat Name] Could not get user data for: ${streamer}`);
        return;
      }

      const displayName = data.displayName;
      const login = data.login;
      const username = displayName.toLowerCase() !== login ? `${displayName} (${login})` : displayName;

      streamChatHeader.textContent = username;
      streamChatHeader.title = username;

      this.log.info(`[Popout Chat Name] Chat header updated to: ${username}`);
    } catch (error) {
      this.log.warn("[Popout Chat Name] Error updating chat header:", error);
    }
  }

  disablePopoutChatName() {
    if (!this.isActive) return;
    this.log.info("[Popout Chat Name] Removing chat name replacement");
    this.isActive = false;
  }

  extractStreamerFromRoute() {
    if (!this.router?.match) {
      this.log.warn("[Popout Chat Name] No valid route match found");
      return null;
    }

    const streamer = this.router?.match[1];
    return streamer;
  }
}