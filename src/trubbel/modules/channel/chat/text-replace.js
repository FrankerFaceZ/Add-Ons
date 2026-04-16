import { BAD_USERS } from "../../../utilities/constants/types";

export default class TextReplace {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.router = parent.router;
    this.style = parent.style;
    this.chat = parent.chat;
    this.site = parent.site;
    this.i18n = parent.i18n;

    this.isActive = false;

    this.handleNavigation = this.handleNavigation.bind(this);
    this.handleSettingChange = this.handleSettingChange.bind(this);
    this.enable = this.enable.bind(this);
    this.disable = this.disable.bind(this);
  }

  initialize() {
    const enabled = this.settings.get("addon.trubbel.channel.chat.text_replace");
    if (enabled) {
      this.handleNavigation();
    } else {
      this.disable();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.handleNavigation();
    } else {
      this.disable();
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
      const enabled = this.settings.get("addon.trubbel.channel.chat.text_replace");
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

    this.chat.on("chat:pre-send-message", this.onPreSend, this);

    this.isActive = true;
  }

  disable() {
    if (!this.isActive) return;

    this.chat.off("chat:pre-send-message", this.onPreSend, this);

    this.isActive = false;
  }

  getRules() {
    return this.settings.provider.get("addon.trubbel.channel.chat.text_replace.rules") ?? [];
  }

  setRules(rules) {
    this.settings.provider.set("addon.trubbel.channel.chat.text_replace.rules", rules);
  }

  applyRules(msg) {
    const rules = this.getRules();

    for (const rule of rules) {
      if (!rule.find) continue;
      if (rule.onlyIfIncludes && !msg.includes(rule.onlyIfIncludes)) continue;

      if (rule.isRegex) {
        try {
          msg = msg.replace(new RegExp(rule.find, "g"), rule.replace ?? "");
        } catch (_) {
          // invalid regex - skippin
        }
      } else {
        msg = msg.replaceAll(rule.find, rule.replace ?? "");
      }
    }

    return msg;
  }

  onPreSend(event) {
    if (!this.settings.get("addon.trubbel.channel.chat.text_replace")) return;

    event.message = this.applyRules(event.message);
  }
}