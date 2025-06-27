const { createElement, setChildren } = FrankerFaceZ.utilities.dom;

export class ClickableModsVIPs {
  constructor(parent) {
    this.parent = parent;
    this.isActive = false;

    this.onBufferMessage = this.onBufferMessage.bind(this);
    this.handleNavigation = this.handleNavigation.bind(this);
    this.handleSettingChange = this.handleSettingChange.bind(this);
  }

  initialize() {
    this.handleNavigation();
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.parent.log.info("[ClickableModsVIPs] Enabling viewer cards for /mods and /vips");
      this.handleNavigation();
    } else {
      this.parent.log.info("[ClickableModsVIPs] Disabling viewer cards for /mods and /vips");
      this.cleanup();
    }
  }

  handleNavigation() {
    if (!this.parent.settings.get("addon.trubbel.channel.chat-clickable-mods-vips")) return;
    const chatRoutes = this.parent.site.constructor.CHAT_ROUTES;
    if (chatRoutes.includes(this.parent.router?.current?.name)) {
      this.init();
    } else {
      this.cleanup();
    }
  }

  init() {
    if (this.isActive) return;
    this.parent.log.info("[ClickableModsVIPs] Initializing viewer card functionality");
    this.parent.on("chat:buffer-message", this.onBufferMessage, this);
    this.updateCSS();
    this.isActive = true;
  }

  cleanup() {
    if (!this.isActive) return;
    this.parent.log.info("[ClickableModsVIPs] Cleaning up viewer card functionality");
    this.parent.off("chat:buffer-message", this.onBufferMessage, this);
    this.updateCSS();
    this.isActive = false;
  }

  onBufferMessage(event) {
    if (!this.parent.settings.get("addon.trubbel.channel.chat-clickable-mods-vips")) return;
    if (event?.message?.type !== this.parent.chat?.chat_types.Info) return;

    const message = event?.message?.message;

    const match = message.match(/(?<=: )(.*?)(?=\.)/);
    if (!match) {
      this.parent.log.info("[ClickableModsVIPs] Unable to get usernames");
      return;
    }

    setTimeout(() => this.processModList(message, match[1]), 500);
  }

  processModList(message, usernamesString) {
    const statusElement = this.findStatusMessage(message);
    if (!statusElement) return;

    // Parse usernames from the matched string
    const usernames = usernamesString
      .split(",")
      .map(username => username.trim())
      .filter(username => username.length > 0);

    const prefixMatch = message.match(/^(.*?: )/);
    const prefix = prefixMatch ? prefixMatch[1] : "";

    const content = this.createModListContent(prefix, usernames);
    setChildren(statusElement, content);
  }

  createModListContent(prefix, usernames) {
    const elements = [];

    // Add the prefix text
    if (prefix) {
      elements.push(prefix);
    }

    // Add each username as a clickable element
    usernames.forEach((username, index) => {
      if (index > 0) {
        elements.push(", ");
      }

      const usernameElement = (
        <span
          className="clickable-username"
          data-username={username}
          onClick={() => this.handleUsernameClick(username)}
        >
          {username}
        </span>
      );
      elements.push(usernameElement);
    });

    // Add the period at the end
    elements.push(".");
    return elements;
  }

  handleUsernameClick(username) {
    this.parent?.chat?.ChatContainer.first.onUsernameClick(username);
  }

  findStatusMessage(messageText) {
    const statusMessages = Array.from(document.querySelectorAll(".chat-line__status"));
    for (const element of statusMessages.reverse()) {
      if (element.textContent.trim() === messageText.trim()) {
        return element;
      }
    }
    return null;
  }

  updateCSS() {
    if (this.parent.settings.get("addon.trubbel.channel.chat-clickable-mods-vips")) {
      this.parent.style.set("trubbel-mod-vip-usernames", `
        .clickable-username {
          cursor: pointer;
          font-weight: bold;
          &:hover, &:focus {
            text-decoration: underline;
          }
        }
      `);
    } else {
      this.parent.style.delete("trubbel-mod-vip-usernames");
    }
  }
}