const { createElement } = FrankerFaceZ.utilities.dom;

export class ChatViewerCard extends FrankerFaceZ.utilities.module.Module {
  constructor(...args) {
    super(...args);

    this.inject("settings");
    this.inject("site.router");
    this.inject("site.fine");

    this.STYLE_ID = "trubbel-mod-vip-usernames";
    this.isEnabled = false;

    // Chat - Viewer Cards - Enable Viewer Cards for /mods and /vips
    this.settings.add("addon.trubbel.chat.viewer-card", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Chat >> Viewer Cards",
        title: "Enable Viewer Cards for /mods and /vips",
        description: "This gives you the ability to click on any usernames when using /mods and /vips which then opens up their viewer cards.\n\n**Note:** Might not work for every language.",
        component: "setting-check-box"
      },
      changed: () => this.handleViewerCards()
    });

    this.handleModListClick = (event) => this.onHandleModListClick(event);
  }

  onEnable() {
    this.settings.getChanges("addon.trubbel.chat.viewer-card", () => this.handleViewerCards());
    this.router.on(":route", this.checkNavigation, this);
    this.checkNavigation();
  }

  init() {
    if (this.isEnabled) return;
    document.addEventListener("click", this.handleModListClick);
    this.on("chat:buffer-message", this.onBufferMessage, this);
    this.injectStyles();
    this.isEnabled = true;
  }

  onBufferMessage(event) {
    if (!this.settings.get("addon.trubbel.chat.viewer-card")) return;

    if (event?.message?.type !== this.chat?.chat_types.Info) return;

    const message = event?.message?.message;
    const regex = /:\s*(.+?)\./;
    const match = message.match(regex);
    if (!match) return;

    setTimeout(() => this.processModList(message, match), 50);
  }

  cleanup() {
    if (!this.isEnabled) return;
    document.removeEventListener("click", this.handleModListClick);
    this.off("chat:buffer-message", this.onBufferMessage, this);
    this.removeStyles();
    this.isEnabled = false;
  }

  processModList(message, match) {
    const statusElement = this.findStatusMessage(message);
    if (!statusElement || statusElement.querySelector("ffz-username")) return;

    const usernames = match[1].split(",")
      .map(username => username.trim())
      .filter(username => username.length > 0);

    let newText = message.substring(0, match.index + 1);
    usernames.forEach((username, index) => {
      if (index > 0) newText += ",";
      newText += ` <ffz-username>${username}</ffz-username>`;
    });
    newText += ".";

    // try to injectStyles() making usernames bold within /mods and /vips
    statusElement.innerHTML = newText;
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

  async onHandleModListClick(event) {
    const target = event.target;
    const statusMsg = target.closest(".chat-line__status");
    if (!statusMsg) return;

    const content = statusMsg.textContent;
    const match = content.match(/:\s*(.+?)\./);
    if (!match) return;

    const usernames = match[1].split(",")
      .map(username => username.trim())
      .filter(username => username.length > 0);

    const username = this.getClickedUsername(event, usernames);
    if (!username) {
      this.log.info("No exact username match found for clicked text");
      return;
    }

    const chatContainer = this.fine.wrap("chat-container");
    if (chatContainer?.first) {
      const container = chatContainer.first;
      if (container.onUsernameClick) {
        const rect = statusMsg.getBoundingClientRect();
        container.onUsernameClick(username, null, null, rect.top);
        return;
      }
    }
  }

  getClickedUsername(event, usernames) {
    let clickedRange;
    if (document.caretRangeFromPoint) {
      clickedRange = document.caretRangeFromPoint(event.clientX, event.clientY);
    } else if (document.caretPositionFromPoint) {
      const caretPosition = document.caretPositionFromPoint(event.clientX, event.clientY);
      if (caretPosition) {
        clickedRange = document.createRange();
        clickedRange.setStart(caretPosition.offsetNode, caretPosition.offset);
        clickedRange.setEnd(caretPosition.offsetNode, caretPosition.offset);
      }
    }

    if (!clickedRange) return null;

    const container = clickedRange.startContainer;
    const offset = clickedRange.startOffset;
    const fullText = container.textContent || "";

    let currentPosition = 0;
    for (const username of usernames) {
      const usernameStart = fullText.indexOf(username, currentPosition);
      if (usernameStart !== -1) {
        const usernameEnd = usernameStart + username.length;
        if (offset >= usernameStart && offset <= usernameEnd) {
          return username;
        }
        currentPosition = usernameEnd;
      }
    }

    return null;
  }

  checkNavigation() {
    if (!this.settings.get("addon.trubbel.chat.viewer-card")) return;
    const chatRoutes = this.resolve("site").constructor.CHAT_ROUTES;

    if (chatRoutes.includes(this.router?.current?.name)) {
      this.init();
    } else {
      this.cleanup();
    }
  }

  injectStyles() {
    if (document.getElementById(this.STYLE_ID)) return;
    const style = createElement("style", {
      id: this.STYLE_ID,
      textContent: `
        ffz-username {
          cursor: pointer;
          display: inline;
          font-weight: bold;
        }
        ffz-username:hover {
          text-decoration: underline;
        }
      `
    });
    document.head.appendChild(style);
  }

  removeStyles() {
    const style = document.getElementById(this.STYLE_ID);
    if (style) {
      style.remove();
    }
  }

  handleViewerCards() {
    const enabled = this.settings.get("addon.trubbel.chat.viewer-card");
    if (enabled) {
      this.checkNavigation();
    } else {
      this.cleanup();
    }
  }
}