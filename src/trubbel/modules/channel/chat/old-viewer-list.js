const { on, off } = FrankerFaceZ.utilities.dom;

export default class OldViewerList {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.router = parent.router;
    this.site = parent.site;
    this.log = parent.log;

    this.isActive = false;

    this.clickHandler = null;

    this.handleNavigation = this.handleNavigation.bind(this);
    this.handleSettingChange = this.handleSettingChange.bind(this);
    this.setupDOMListeners = this.setupDOMListeners.bind(this);
    this.removeDOMListeners = this.removeDOMListeners.bind(this);
    this.handleClickViewerList = this.handleClickViewerList.bind(this);
  }

  initialize() {
    this.log.info("[Old Chat Viewer List] Initializing viewer list click handler");
    this.parent.on("trubbel:click-viewer-list", this.handleClickViewerList, this);
    const enabled = this.settings.get("addon.trubbel.channel.chat.ui.old_viewer_list");
    if (enabled) {
      this.handleNavigation();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.log.info("[Old Chat Viewer List] Enabling click viewer list");
      this.handleNavigation();
    } else {
      this.log.info("[Old Chat Viewer List] Disabling click viewer list");
      this.removeDOMListeners();
      this.isActive = false;
    }
  }

  handleNavigation() {
    const routeName = this.router?.current?.name;
    const validRoutes = ["user", "user-home", "popout", "embed-chat"];
    if (validRoutes.includes(routeName)) {
      const enabled = this.settings.get("addon.trubbel.channel.chat.ui.old_viewer_list");
      if (enabled && !this.isActive) {
        this.setupDOMListeners();
      }
    } else {
      if (this.isActive) {
        this.removeDOMListeners();
      }
    }
  }

  setupDOMListeners() {
    if (this.isActive) return;

    this.clickHandler = (event) => {
      if (!this.settings.get("addon.trubbel.channel.chat.ui.old_viewer_list")) {
        return;
      }

      const target = event.target.closest("[data-test-selector=\"chat-viewer-list\"]");
      if (!target) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const customEvent = this.parent.makeEvent({
        type: "click-viewer-list",
        target: target,
        source: event,
        timestamp: Date.now(),

        showViewerList: () => {
          const chat = this.parent.resolve("site.chat");
          if (chat && chat.ChatContainer && chat.ChatContainer.first) {
            const container = chat.ChatContainer.first;
            if (container.props && typeof container.props.showChatViewerList === "function") {
              container.props.showChatViewerList();
              return true;
            }
          }
          return false;
        }
      });

      this.parent.emit("trubbel:click-viewer-list", customEvent);
    };

    on(document, "click", this.clickHandler, true);
    this.isActive = true;
  }

  removeDOMListeners() {
    if (!this.isActive) return;

    if (this.clickHandler) {
      off(document, "click", this.clickHandler, true);
      this.clickHandler = null;
    }

    this.isActive = false;
  }

  handleClickViewerList(event) {
    if (event.defaultPrevented) {
      return;
    }

    if (event.showViewerList) {
      event.showViewerList();
    }
  }
}