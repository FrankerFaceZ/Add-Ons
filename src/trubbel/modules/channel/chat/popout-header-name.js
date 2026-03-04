import {
  POPOUT_CHAT_HEADER_SELECTOR,
  MOD_POPOUT_CHAT_HEADER_SELECTOR,
  DASH_POPOUT_CHAT_HEADER_SELECTOR
} from "../../../utilities/constants/selectors";

const { sleep } = FrankerFaceZ.utilities.object;

export default class PopoutChatName {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.router = parent.router;
    this.site = parent.site;
    this.log = parent.log;

    this.isActive = false;

    this.handleNavigation = this.handleNavigation.bind(this);
    this.enablePopoutChatName = this.enablePopoutChatName.bind(this);
    this.disablePopoutChatName = this.disablePopoutChatName.bind(this);
    this.handleSettingChange = this.handleSettingChange.bind(this);
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

  getChannelDataFromProps() {
    const props = this.site.children?.chat?.ChatContainer?.first?.props;
    if (!props) {
      this.log.warn("[Popout Chat Name] ChatContainer props not available");
      return null;
    }

    if (!props.isPopout) {
      this.log.warn("[Popout Chat Name] Could not find popout state");
      return null;
    }

    const { channelDisplayName, channelLogin } = props;
    if (!channelDisplayName || !channelLogin) {
      this.log.warn("[Popout Chat Name] ChatContainer props missing channel data");
      return null;
    }

    return { channelDisplayName, channelLogin };
  }

  async enablePopoutChatName() {
    if (this.isActive) return;
    this.isActive = true;

    try {
      const streamChatHeader = await this.site.awaitElement(
        `${POPOUT_CHAT_HEADER_SELECTOR}, ${MOD_POPOUT_CHAT_HEADER_SELECTOR}, ${DASH_POPOUT_CHAT_HEADER_SELECTOR}`,
        document.documentElement,
        10000
      );

      if (!streamChatHeader) {
        this.log.warn("[Popout Chat Name] Chat header element not found");
        this.isActive = false;
        return;
      }

      // waiting because of shared chats
      await sleep(5000);

      const data = this.getChannelDataFromProps();
      if (!data) {
        this.isActive = false;
        return;
      }

      const { channelDisplayName, channelLogin } = data;
      const username = channelDisplayName.toLowerCase() !== channelLogin
        ? `${channelDisplayName} (${channelLogin})`
        : channelDisplayName;

      streamChatHeader.textContent = username;
      streamChatHeader.title = username;

      this.log.info(`[Popout Chat Name] Chat header updated to: ${username}`);
    } catch (error) {
      this.log.warn("[Popout Chat Name] Error updating chat header:", error);
      this.isActive = false;
    }
  }

  disablePopoutChatName() {
    if (!this.isActive) return;
    this.log.info("[Popout Chat Name] Removing chat name replacement");
    this.isActive = false;
  }
}