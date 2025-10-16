import { BAD_USERS } from "../../../utilities/constants/types";

import GET_USER from "../../../utilities/graphql/firsttimechatter.gql";

export default class FirstTimeChatter {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.apollo = parent.apollo;
    this.router = parent.router;
    this.style = parent.style;
    this.chat = parent.chat;
    this.fine = parent.fine;
    this.site = parent.site;
    this.log = parent.log;

    this.isActive = false;
    this.lastProcessedChannel = null;

    this.handleNavigation = this.handleNavigation.bind(this);
    this.enableFirstTimeChatter = this.enableFirstTimeChatter.bind(this);
    this.disableFirstTimeChatter = this.disableFirstTimeChatter.bind(this);
    this.handleSettingChange = this.handleSettingChange.bind(this);
  }

  initialize() {
    const enabled = this.settings.get("addon.trubbel.channel.chat.ftc");
    if (enabled) {
      this.handleNavigation();
    } else {
      this.disableFirstTimeChatter();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.log.info("[FirstTimeChatter] Enabling first-time chatter functionality");
      this.handleNavigation();
    } else {
      this.log.info("[FirstTimeChatter] Disabling first-time chatter functionality");
      this.disableFirstTimeChatter();
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
      const enabled = this.settings.get("addon.trubbel.channel.chat.ftc");

      if (enabled) {
        if (!this.isActive) {
          this.log.info("[FirstTimeChatter] Entering chat page, enabling first-time chatter handler");
          this.enableFirstTimeChatter();
        } else {
          this.log.info("[FirstTimeChatter] Already active, processing new channel");
          this.processCurrentChannel();
        }
      }
    } else {
      if (this.isActive) {
        this.log.info("[FirstTimeChatter] Leaving chat page, disabling first-time chatter handler");
        this.disableFirstTimeChatter();
      }
    }
  }

  enableFirstTimeChatter() {
    if (this.isActive) {
      this.log.info("[FirstTimeChatter] Functionality already active.");
    } else {
      this.log.info("[FirstTimeChatter] Setting up first-time chatter functionality");
      this.isActive = true;

      this.chat.on("chat:pre-send-message", this.handleMessageSent, this);
    }

    this.processCurrentChannel();
  }

  handleMessageSent(event) {
    const message = event.message;

    if (message.startsWith("/")) {
      this.log.info("[FirstTimeChatter] Command sent (valid or invalid), keeping first-time chatter status");
      return;
    }

    this.log.info("[FirstTimeChatter] Regular message sent, removing first-time chatter indicator");
    this.clearFirstTimeChatterIndicator();

    setTimeout(() => {
      this.chat.off("chat:pre-send-message", this.handleMessageSent, this);
    }, 0);
  }

  async processCurrentChannel() {
    if (!this.isActive) return;

    const user = this.router?.match?.[1];
    if (!user) {
      this.log.info("[FirstTimeChatter] No user to process");
      return;
    }

    if (this.lastProcessedChannel === user) {
      this.log.info(`[FirstTimeChatter] Already processed ${user} in this session`);
      return;
    }

    this.log.info(`[FirstTimeChatter] Processing new user: ${user}`);
    this.lastProcessedChannel = user;

    try {
      const result = await this.apollo.client.query({
        query: GET_USER,
        variables: { login: user },
        fetchPolicy: "network-only"
      });

      const data = result?.data;
      const user_data = data?.user;
      this.log.info("[FirstTimeChatter] data:", data);

      if (!user_data) {
        this.clearFirstTimeChatterIndicator();
        return;
      }

      this.log.info(`[FirstTimeChatter] valid user found: ${user_data.login}`);

      const isFirstTimeChatter = user_data.self?.isFirstTimeChatter;
      this.log.info(`[FirstTimeChatter] first-time chatter status: ${isFirstTimeChatter}`);

      if (isFirstTimeChatter) {
        this.applyFirstTimeChatterIndicator();
      } else {
        this.clearFirstTimeChatterIndicator();
        this.chat.off("chat:pre-send-message", this.handleMessageSent, this);
      }

    } catch (error) {
      this.log.info(`[FirstTimeChatter] Error fetching user ${user}:`, error);
      this.clearFirstTimeChatterIndicator();
    }
  }

  applyFirstTimeChatterIndicator() {
    this.style.set("trubbel-firsttimechatter-border", `
      .chat-wysiwyg-input__box {
        box-shadow: inset 0 0 0 var(--input-border-width-small) rgb(255, 117, 230) !important;
      }
    `);
  }

  clearFirstTimeChatterIndicator() {
    if (this.style.has("trubbel-firsttimechatter-border")) {
      this.style.delete("trubbel-firsttimechatter-border");
    }
  }

  disableFirstTimeChatter() {
    if (!this.isActive) return;

    this.isActive = false;
    this.lastProcessedChannel = null;

    this.chat.off("chat:pre-send-message", this.handleMessageSent, this);
    this.clearFirstTimeChatterIndicator();
  }
}