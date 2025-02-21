import getAccountAge from "../features/commands/accountage";
import getChatters from "../features/commands/chatters";
import getFollowAge from "../features/commands/followage";
import getStreamUptime from "../features/commands/uptime";
import { ffzCommands } from "../utils/constants/commands";

export class ChatCommands extends FrankerFaceZ.utilities.module.Module {
  constructor(...args) {
    super(...args);

    this.inject("settings");
    this.inject("chat");
    this.inject("site");
    this.inject("site.chat");
    this.inject("site.apollo");
    this.inject("site.fine");
    this.inject("site.twitch_data");

    // Store command handler functions for cleanup
    this.commandHandlers = new Set();

    // Chat - Custom Commands - Enable Custom Chat Commands
    this.settings.add("addon.trubbel.chat.custom-commands", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Chat >> Custom Commands",
        title: "Enable Custom Chat Commands",
        component: "setting-check-box"
      },
      changed: () => this.handleCustomCommands()
    });

    const commandSettings = {
      accountage: "Show how long ago you created your account.",
      chatters: "Show the current channels amount of chatters.",
      followage: "Show your followage in the current channel.",
      shrug: "Appends `¯\\_(ツ)_/¯` to your message.",
      uptime: "Show the channels current uptime."
    };

    Object.entries(commandSettings).forEach(([command, description]) => {
      this.settings.add(`addon.trubbel.chat.custom-command-${command}`, {
        default: false,
        requires: ["addon.trubbel.chat.custom-commands"],
        process(ctx, val) {
          if (!ctx.get("addon.trubbel.chat.custom-commands"))
            return false;
          return val;
        },
        ui: {
          sort: 1,
          path: "Add-Ons > Trubbel\u2019s Utilities > Chat >> Custom Commands",
          title: command.charAt(0).toUpperCase() + command.slice(1),
          description: description,
          component: "setting-check-box"
        },
        changed: () => this.handleCustomCommands()
      });
    });
  }

  onEnable() {
    this.settings.getChanges("addon.trubbel.chat.custom-commands", () => this.handleCustomCommands());
    this.on("chat:pre-send-message", this.handleMessage);
    this.handleCustomCommands();
  }

  onDisable() {
    this.removeCommandHandlers();
    this.off("chat:pre-send-message", this.handleMessage);
  }

  removeCommandHandlers() {
    for (const handler of this.commandHandlers) {
      this.off("chat:get-tab-commands", handler);
    }
    this.commandHandlers.clear();
  }

  getEnabledCommands() {
    // Filter commands based on their individual settings
    return ffzCommands.filter(command => {
      // Extract the command name from the command object
      const commandName = command.name.toLowerCase();

      // Check if this command has a corresponding setting
      const settingKey = `addon.trubbel.chat.custom-command-${commandName}`;

      // Only include commands where their specific setting is enabled
      return this.settings.get(settingKey);
    });
  }

  handleMessage = (e) => {
    const msg = e.message;
    const inst = e._inst;

    // Get enabled commands
    const enabledCommands = this.getEnabledCommands();

    // Check if the message matches any of our enabled commands
    for (const command of enabledCommands) {
      const commandRegex = new RegExp(`^\\${command.prefix}${command.name}\\s*`, "i");
      if (commandRegex.test(msg)) {
        e.preventDefault();

        // Handle specific commands
        switch (command.name.toLowerCase()) {
          case "accountage":
            getAccountAge(this, inst);
            break;
          case "chatters":
            getChatters(this, inst);
            break;
          case "followage":
            getFollowAge(this, inst);
            break;
          case "shrug":
            shrug(this, inst, e);
            break;
          case "uptime":
            getStreamUptime(this, inst);
            break;
          default:
            inst.addMessage({
              type: this.site.children.chat.chat_types.Notice,
              message: `Unknown command: ${command.name}`
            });
        }
        return;
      }
    }
  }

  handleCustomCommands() {
    // Clean up existing handlers
    this.removeCommandHandlers();

    // Only proceed if main custom commands setting is enabled
    if (this.settings.get("addon.trubbel.chat.custom-commands")) {
      const commandHandler = (e) => {
        // Get currently enabled commands and add them to the command list
        const enabledCommands = this.getEnabledCommands();
        e.commands.push(...enabledCommands);
      };

      // Register the handler and store it for cleanup
      this.on("chat:get-tab-commands", commandHandler);
      this.commandHandlers.add(commandHandler);
    }
  }
}