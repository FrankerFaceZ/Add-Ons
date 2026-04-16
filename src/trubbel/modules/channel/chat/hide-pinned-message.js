import { BAD_USERS } from "../../../utilities/constants/types";

export default class AutoHidePinnedMessage {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.router = parent.router;
    this.site = parent.site;
    this.log = parent.log;

    this.isActive = false;
    this.hiddenPinnedIds = new Set();

    this.handleNavigation = this.handleNavigation.bind(this);
    this.handleSettingChange = this.handleSettingChange.bind(this);
    this.handlePinnedHighlight = this.handlePinnedHighlight.bind(this);
    this.hidePinnedHighlight = this.hidePinnedHighlight.bind(this);
  }

  initialize() {
    const enabled = this.settings.get("addon.trubbel.channel.chat.hide_pinned_message");
    if (enabled) {
      this.handleNavigation();
    } else {
      this.disable();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.log.info("[AutoHidePinnedMessage] Enabling");
      this.handleNavigation();
    } else {
      this.log.info("[AutoHidePinnedMessage] Disabling");
      this.disable();
    }
  }

  handleNavigation() {
    this.hiddenPinnedIds.clear();

    const chatRoutes = this.site.constructor.CHAT_ROUTES;
    const currentRoute = this.router?.current?.name;

    let pathname;

    if (this.router?.match?.[1]) {
      pathname = this.router.match[1];
    } else {
      const segments = this.router?.location?.split("/").filter(s => s.length > 0);
      pathname = segments?.[0];
    }

    if (chatRoutes.includes(currentRoute) && pathname && !BAD_USERS.includes(pathname)) {
      const enabled = this.settings.get("addon.trubbel.channel.chat.hide_pinned_message");
      if (enabled && !this.isActive) {
        this.log.info("[AutoHidePinnedMessage] Entering chat page, enabling");
        this.enable();
      }
    } else {
      if (this.isActive) {
        this.log.info("[AutoHidePinnedMessage] Leaving chat page, disabling");
        this.disable();
      }
    }
  }
  handleNavigation() {
    this.hiddenPinnedIds.clear();

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
      const enabled = this.settings.get("addon.trubbel.channel.chat.hide_pinned_message");
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
    this.isActive = true;

    const ChatContainer = this.site.children.chat.ChatContainer;
    if (ChatContainer) {
      ChatContainer.on("mount", this.handlePinnedHighlight, this);
      ChatContainer.on("update", this.hidePinnedHighlight, this);
    }

    this.hidePinnedHighlight();
  }

  disable() {
    if (!this.isActive) return;
    this.isActive = false;

    this.hiddenPinnedIds.clear();

    const ChatContainer = this.site.children.chat.ChatContainer;
    if (ChatContainer) {
      ChatContainer.off("mount", this.handlePinnedHighlight, this);
      ChatContainer.off("update", this.hidePinnedHighlight, this);
    }
  }

  handlePinnedHighlight() {
    this.hiddenPinnedIds.clear();
    this.hidePinnedHighlight();
  }

  hidePinnedHighlight() {
    if (!this.isActive) return;

    const site_chat = this.site.children.chat;
    const highlights = site_chat?.community_stack?.highlights;
    const dispatch = site_chat?.community_dispatch;

    if (!highlights || !dispatch) return;

    for (const entry of highlights) {
      if (entry?.event?.type === "pinned_chat") {

        if (this.hiddenPinnedIds.has(entry.id)) {
          continue;
        }

        if (!entry?.hidden) {
          dispatch({
            type: "hide-highlight",
            id: entry.id
          });

          this.hiddenPinnedIds.add(entry.id);
        }
      }
    }
  }
}