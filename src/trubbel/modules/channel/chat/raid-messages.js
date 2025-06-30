const { on, off } = FrankerFaceZ.utilities.dom;

export class RaidMessages {
  constructor(parent) {
    this.parent = parent;
    this.isActive = false;

    this.handleNavigation = this.handleNavigation.bind(this);
    this.enableRaidMessages = this.enableRaidMessages.bind(this);
    this.disableRaidMessages = this.disableRaidMessages.bind(this);
    this.handleSettingChange = this.handleSettingChange.bind(this);
    this.handleMentionClick = (event) => this.onHandleMentionClick(event);
  }

  initialize() {
    const enabled = this.parent.settings.get("addon.trubbel.channel.chat-clickable-raid-messages");
    if (enabled) {
      this.handleNavigation();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.parent.log.info("[Raid Messages] Enabling clickable raid messages");
      this.handleNavigation();
    } else {
      this.parent.log.info("[Raid Messages] Disabling clickable raid messages");
      this.disableRaidMessages();
    }
  }

  handleNavigation() {
    const chatRoutes = this.parent.site.constructor.CHAT_ROUTES;
    if (chatRoutes.includes(this.parent.router?.current?.name)) {
      const enabled = this.parent.settings.get("addon.trubbel.channel.chat-clickable-raid-messages");
      if (enabled && !this.isActive) {
        this.parent.log.info("[Raid Messages] Entering chat page, enabling clickable raid messages");
        this.enableRaidMessages();
      }
    } else {
      if (this.isActive) {
        this.parent.log.info("[Raid Messages] Leaving chat page, disabling clickable raid messages");
        this.disableRaidMessages();
      }
    }
  }

  enableRaidMessages() {
    if (this.isActive) return;
    this.parent.log.info("[Raid Messages] Adding click event listener");
    on(document, "click", this.handleMentionClick);
    this.updateCSS();
    this.isActive = true;
  }

  disableRaidMessages() {
    if (!this.isActive) return;
    this.parent.log.info("[Raid Messages] Removing click event listener");
    off(document, "click", this.handleMentionClick);
    this.updateCSS();
    this.isActive = false;
  }

  onHandleMentionClick(event) {
    const target = event.target;

    if (!target.matches("[data-test-selector=\"user-notice-line\"] strong:first-child")) return;

    const messageProps = this.parent.fine.searchParent(
      target,
      (stateNode) => stateNode?.props?.message != null,
      15
    )?.props;

    if (!messageProps?.message?.params?.login) {
      this.parent.log.info("[Raid Messages] No login found in message params");
      return;
    }

    // Not a Raid message
    if (messageProps.message.type !== this.parent.chat.chat_types.Raid) return;

    const chatMessage = document.querySelector(".chat-line__message");
    if (!chatMessage) return;

    const chatComponent = this.parent.fine.searchParent(chatMessage,
      node => node?.props?.onUsernameClick != null
    );

    if (!chatComponent) return;

    chatComponent.props.onUsernameClick(
      messageProps.message.params.login,
      "chat_message",
      messageProps.message.id
    );
  }

  updateCSS() {
    if (this.parent.settings.get("addon.trubbel.channel.chat-clickable-raid-messages")) {
      this.parent.style.set("trubbel-clickable-raid", `
        [data-test-selector="user-notice-line"] strong:first-child {
          cursor: pointer;
          &:hover, &:focus {
            text-decoration: underline;
          }
        }
      `);
    } else {
      this.parent.style.delete("trubbel-clickable-raid");
    }
  }
}