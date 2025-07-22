import { CUSTOM_COMMANDS } from "../../../utilities/constants/commands";

import accountage from "./commands/accountage";
import chatters from "./commands/chatters";
import followage from "./commands/followage";
import localmod from "./commands/localmod";
import localsub from "./commands/localsub";
import shrug from "./commands/shrug";
import unbanall from "./commands/unbanall";
import uptime from "./commands/uptime";

export class ChatCommands {
  constructor(parent) {
    this.parent = parent;
    this.isActive = false;
    this.commandHandlers = new Set();

    this.handleNavigation = this.handleNavigation.bind(this);
    this.enableChatCommands = this.enableChatCommands.bind(this);
    this.disableChatCommands = this.disableChatCommands.bind(this);
    this.handleSettingChange = this.handleSettingChange.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.handleCustomCommands = this.handleCustomCommands.bind(this);
    this.removeCommandHandlers = this.removeCommandHandlers.bind(this);
    this.getEnabledCommands = this.getEnabledCommands.bind(this);
  }

  initialize() {
    const enabled = this.parent.settings.get("addon.trubbel.channel.chat-custom-commands");
    if (enabled) {
      this.parent.log.info("[Chat Commands] Chat system ready, checking navigation");
      this.handleNavigation();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.parent.log.info("[Chat Commands] Enabling custom chat commands");
      this.handleNavigation();
    } else {
      this.parent.log.info("[Chat Commands] Disabling custom chat commands");
      this.disableChatCommands();
    }
  }

  handleNavigation() {
    const chatRoutes = this.parent.site.constructor.CHAT_ROUTES;
    if (chatRoutes.includes(this.parent.router?.current?.name)) {
      const enabled = this.parent.settings.get("addon.trubbel.channel.chat-custom-commands");
      if (enabled && !this.isActive) {
        this.parent.log.info("[Chat Commands] Entering user page, enabling chat commands");
        this.enableChatCommands();
      }
    } else {
      if (this.isActive) {
        this.parent.log.info("[Chat Commands] Leaving user page, disabling chat commands");
        this.disableChatCommands();
      }
    }
  }

  enableChatCommands() {
    if (this.isActive) return;
    this.parent.log.info("[Chat Commands] Setting up chat command handlers");
    this.isActive = true;
    this.parent.settings.getChanges("addon.trubbel.channel.chat-custom-commands", () => this.handleCustomCommands());
    this.parent.on("chat:pre-send-message", this.handleMessage);
    this.handleCustomCommands();
  }

  disableChatCommands() {
    if (!this.isActive) return;
    this.parent.log.info("[Chat Commands] Removing chat command handlers");
    this.removeCommandHandlers();
    this.parent.off("chat:pre-send-message", this.handleMessage);
    this.isActive = false;
  }

  removeCommandHandlers() {
    for (const handler of this.commandHandlers) {
      this.parent.off("chat:get-tab-commands", handler);
    }
    this.commandHandlers.clear();
  }

  getEnabledCommands() {
    const enabledCommands = CUSTOM_COMMANDS.filter(command => {
      const commandName = command.name.toLowerCase();
      const settingKey = `addon.trubbel.channel.chat.custom-command-${commandName}`;
      const isEnabled = this.parent.settings.get(settingKey);

      this.parent.log.debug(`[Chat Commands] Command ${commandName} (${settingKey}): ${isEnabled}`);
      return isEnabled;
    });

    this.parent.log.info("[Chat Commands] getEnabledCommands result:", enabledCommands);
    return enabledCommands;
  }

  handleMessage(e) {
    const msg = e.message;
    const inst = e._inst;

    const enabledCommands = this.getEnabledCommands();

    for (const command of enabledCommands) {
      const commandRegex = new RegExp(`^\\${command.prefix}${command.name}\\s*`, "i");
      if (commandRegex.test(msg)) {
        e.preventDefault();

        switch (command.name.toLowerCase()) {
          case "accountage":
            accountage(this.parent, inst);
            break;
          case "chatters":
            chatters(this.parent, inst);
            break;
          case "followage":
            followage(this.parent, inst);
            break;
          case "localmod":
            localmod(e, this.parent, inst);
            break;
          case "localsub":
            localsub(e, this.parent, inst);
            break;
          case "shrug":
            shrug(e);
            break;
          case "unbanall":
            unbanall(e, this.parent, inst);
            break;
          case "uptime":
            uptime(this.parent, inst);
            break;
          default:
            inst.addMessage({
              type: this.parent.site.children.chat.chat_types.Notice,
              message: `Unknown command: ${command.name}`
            });
        }
        return;
      }
    }
  }

  handleCustomCommands() {
    this.removeCommandHandlers();

    if (this.parent.settings.get("addon.trubbel.channel.chat-custom-commands") && this.isActive) {
      this.parent.log.info("[Chat Commands] Setting up command handlers - main setting enabled and active");

      const commandHandler = (e) => {
        const enabledCommands = this.getEnabledCommands();
        enabledCommands.forEach(cmd => {
          e.commands.push(cmd);
        });
      };

      this.parent.on("chat:get-tab-commands", commandHandler);
      this.commandHandlers.add(commandHandler);
    } else {
      this.parent.log.info("[Chat Commands] NOT setting up command handlers - main setting:",
        this.parent.settings.get("addon.trubbel.channel.chat-custom-commands"),
        "active:", this.isActive);
    }
  }
}