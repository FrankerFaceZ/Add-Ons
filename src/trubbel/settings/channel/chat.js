import BTTVModeration from "../../modules/channel/chat/bttv";
import Commands from "../../modules/channel/chat/commands-handler";
import FirstTimeChatter from "../../modules/channel/chat/ftc";
import InfoMessage from "../../modules/channel/chat/info-message";
import ChatMarkdown from "../../modules/channel/chat/markdown";
import MessageHighlight from "../../modules/channel/chat/message-highlight";
import OldClipFormat from "../../modules/channel/chat/old-clip-format";
import OldViewerList from "../../modules/channel/chat/old-viewer-list";
import PopoutChatName from "../../modules/channel/chat/popout-header-name";
import RaidMessage from "../../modules/channel/chat/raid-message";
import RaidPreview from "../../modules/channel/chat/raid-preview";
import RecentMessages from "../../modules/channel/chat/recent-messages";
import SharedChatMessage from "../../modules/channel/chat/shared-chat";
import SteamInspect from "../../modules/channel/chat/steam-inspect";
import TimestampHandler from "../../modules/channel/chat/timestamps";

const { createElement, ManagedStyle } = FrankerFaceZ.utilities.dom;

export class Channel_Chat extends FrankerFaceZ.utilities.module.Module {
  constructor(...args) {
    super(...args);

    this.style = new ManagedStyle;

    this.inject("settings");
    this.inject("i18n");
    this.inject("chat");
    this.inject("site");
    this.inject("site.fine");
    this.inject("site.router");
    this.inject("site.apollo");
    this.inject("site.twitch_data");
    this.inject("site.chat.scroller");

    this.bttvModeration = new BTTVModeration(this);
    this.customCommands = new Commands(this);
    this.firstTimeChatter = new FirstTimeChatter(this);
    this.infoMessage = new InfoMessage(this);
    this.chatMarkdown = new ChatMarkdown(this);
    this.messageHighlight = new MessageHighlight(this);
    this.oldClipFormat = new OldClipFormat(this);
    this.oldViewerList = new OldViewerList(this);
    this.popoutChatName = new PopoutChatName(this);
    this.raidMessage = new RaidMessage(this);
    this.raidPreview = new RaidPreview(this);
    this.recentMessages = new RecentMessages(this);
    this.sharedChatMessage = new SharedChatMessage(this);
    this.steamInspect = new SteamInspect(this);
    this.timestampHandler = new TimestampHandler(this);

    // Channel - Chat - Commands - Enable custom commands
    this.settings.add("addon.trubbel.channel.chat.commands.custom", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat >> Commands",
        title: "Enable custom commands",
        component: "setting-check-box"
      },
      changed: () => this.customCommands.handleCustomCommands()
    });

    const commandSettings = {
      accountage: "Show how long ago you created your account.",
      chatters: "Show the current channels amount of chatters.",
      followage: "Show your followage in the current channel.",
      localmod: "Use this command to toggle between Mod-Only Mode locally, for yourself.",
      localsub: "Use this command to toggle between Sub-Only Mode locally, for yourself.",
      shrug: "Appends `¯\\_(ツ)_/¯` to your message.",
      unbanall: "This will unban every single user in your own channel. (Broadcaster)",
      uptime: "Show the channels current uptime.",
    };

    Object.entries(commandSettings).forEach(([command, description]) => {
      this.settings.add(`addon.trubbel.channel.chat.commands.custom.${command}`, {
        default: false,
        requires: ["addon.trubbel.channel.chat.commands.custom"],
        process(ctx, val) {
          if (!ctx.get("addon.trubbel.channel.chat.commands.custom"))
            return false;
          return val;
        },
        ui: {
          sort: 0,
          path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat >> Commands",
          title: command.charAt(0).toUpperCase() + command.slice(1),
          description: description,
          component: "setting-check-box"
        },
        changed: () => this.customCommands.handleCustomCommands()
      });
    });



    // Channel - Chat - FirstTimeChatter - Show FirstTimeChatter Indicator
    this.settings.add("addon.trubbel.channel.chat.ftc", {
      default: false,
      requires: ["context.session.user"],
      process(ctx, val) {
        return ctx.get("context.session.user") ? val : false;
      },
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat >> FirstTimeChatter",
        title: "Show FirstTimeChatter Indicator",
        description: "Display a pink border around the chat box if you are a first-time chatter.\n\n**Note:** It will automatically remove the border if you send any chat messages.",
        component: "setting-check-box"
      },
      changed: val => this.firstTimeChatter.handleSettingChange(val)
    });



    // Channel - Chat - Links - Replace clip URLs
    this.settings.add("addon.trubbel.channel.chat.links.clip_replace", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat >> Links",
        title: "Replace clip URLs",
        description: "Replaces the `/clip/` links in chat with the `clips.twitch.tv` format.",
        component: "setting-check-box"
      },
      changed: val => this.oldClipFormat.handleSettingChange(val)
    });

    // Channel - Chat - Links - Clickable Steam inspect links
    this.settings.add("addon.trubbel.channel.chat.links.steam_inspect", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat >> Links",
        title: "Clickable Steam inspect links",
        description: "Enabling this will make [Steam inspect links](https://developer.valvesoftware.com/wiki/Steam_browser_protocol) clickable in chat.",
        component: "setting-check-box"
      },
      changed: val => this.steamInspect.handleSettingChange(val)
    });



    // Channel - Chat - Markdown - Info
    this.settings.addUI("addon.trubbel.channel.chat.markdown.info", {
      ui: {
        sort: -1,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat >> Markdown",
        title: "Info",
        description: "⚠️ Please note that only users who has these settings enabled are able to see them.",
        component: () => import("../../components/main_menu/setting-info.vue"),
        force_seen: true
      },
    });

    // Channel - Chat - Markdown - Enable Markdown
    this.settings.add("addon.trubbel.channel.chat.markdown", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat >> Markdown",
        title: "Enable Markdown",
        description: "Very basic support for markdown, with limited combinations.",
        component: "setting-check-box"
      },
      changed: val => this.chatMarkdown.handleSettingChange(val)
    });



    // Channel - Chat - Messages - Highlight Messages on Hover
    this.settings.add("addon.trubbel.channel.chat.messages.highlight", {
      default: 0,
      ui: {
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat >> Messages",
        title: "Highlight Messages on Hover",
        description: "Highlight all messages from a user.",
        component: "setting-select-box",
        data: [
          { value: 0, title: "Off" },
          { value: 1, title: "Username" },
          { value: 2, title: "Entire Message" }
        ]
      },
      changed: val => this.messageHighlight.handleSettingChange(val)
    });

    // Channel - Chat - Messages - Hover Highlight
    this.settings.add("addon.trubbel.channel.chat.messages.highlight.color", {
      default: "rgba(169, 112, 255, 0.5)",
      requires: ["addon.trubbel.channel.chat.messages.highlight"],
      process(ctx, val) {
        if (!ctx.get("addon.trubbel.channel.chat.messages.highlight"))
          return false;
        return val;
      },
      ui: {
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat >> Messages",
        title: "Hover Highlight",
        description: "Background color for highlighted messages.",
        component: "setting-color-box"
      },
      changed: () => {
        if (this.messageHighlight?.currentHoveredUser) {
          this.messageHighlight.applyHighlight(this.messageHighlight.currentHoveredUser);
        }
      }
    });



    // Channel - Chat - Moderation - Enable right-click context menu
    this.settings.add("addon.trubbel.channel.chat.moderation.context", {
      default: false,
      requires: ["context.moderator"],
      process(ctx, val) {
        return ctx.get("context.moderator") ? val : false;
      },
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat >> Moderation",
        title: "Enable right-click context menu",
        description: "This gives you the ability to use a right-click context menu, *similar to BetterTTV (BTTV)*, to moderate chat with. Ban, timeout, purge, delete.",
        component: "setting-check-box"
      },
      changed: val => this.bttvModeration.handleSettingChange(val)
    });

    // Channel - Chat - Moderation - Message Highlight
    this.settings.add("addon.trubbel.channel.chat.moderation.context.highlight", {
      default: "rgba(123, 1, 0, 0.3)",
      ui: {
        sort: 1,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat >> Moderation",
        title: "Message Highlight",
        description: "Highlight the message you right-click.",
        component: "setting-color-box"
      }
    });

    // Channel - Chat - Moderation - Highlight Priority
    this.settings.add("addon.trubbel.channel.chat.moderation.context.priority", {
      default: "0",
      ui: {
        sort: 2,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat >> Moderation",
        title: "Highlight Priority",
        description: "Priority of the message highlighting. See [Chat > Filtering > Highlight](~chat.filtering.highlight) for more details.",
        component: "setting-text-box",
        type: "number",
        process: "to_int"
      }
    });

    // Channel - Chat - Moderation - Right-click options
    this.settings.add("addon.trubbel.channel.chat.moderation.context.options", {
      default: "usernames",
      ui: {
        sort: 3,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat >> Moderation",
        title: "Right-click options",
        component: "setting-select-box",
        data: [
          { title: "Usernames only", value: "usernames" },
          { title: "Entire messages", value: "messages1" },
          { title: "Entire messages (except embeds and links)", value: "messages2" },
        ]
      }
    });



    // Channel - Chat - Popout - Display channel name in Popout Chat
    this.settings.add("addon.trubbel.channel.chat.popout.title_name", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat >> Popout",
        title: "Display channel name in Popout Chat",
        description: "Enabling this will replace the \"Stream Chat\" text above chat with the streamers username.",
        component: "setting-check-box"
      },
      changed: val => this.popoutChatName.handleSettingChange(val)
    });



    // Channel - Chat - Raids - Show raid preview
    this.settings.add("addon.trubbel.channel.chat.raids.previews", {
      default: 0,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat >> Raids",
        title: "Show raid preview",
        description: "Display additional information when a raid is active, category, amount of viewers and preview media.",
        component: "setting-select-box",
        data: [
          { value: 0, title: "Off" },
          { value: 1, title: "Image Preview" },
          { value: 2, title: "Video Preview" }
        ]
      },
      changed: val => this.raidPreview.handleSettingChange(val)
    });



    // Channel - Chat - Shared Chat - Hide shared messages
    this.settings.add("addon.trubbel.channel.chat.shared_chat.hide-message", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat >> Shared Chat",
        title: "Hide shared messages",
        component: "setting-check-box"
      },
      changed: val => this.sharedChatMessage.handleSettingChange(val)
    });



    // Channel - Chat - Timestamp - Display missing timestamps
    this.settings.add("addon.trubbel.channel.chat.timestamps.add_missing", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat >> Timestamp",
        title: "Display missing timestamps (Experimental)",
        description: "For certain chat events that lack timestamps.",
        component: "setting-check-box"
      },
      changed: val => this.timestampHandler.handleSettingChange(val)
    });



    // Channel - Chat - UI - Show old viewer list
    this.settings.add("addon.trubbel.channel.chat.ui.old_viewer_list", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat >> UI",
        title: "Show old viewer list",
        description: "When enabled, clicking the chat viewer list button will display the old chat list instead.",
        component: "setting-check-box"
      },
      changed: val => this.oldViewerList.handleSettingChange(val)
    });



    // Channel - Chat - Viewer Cards - Clickable usernames in /mods and /vips
    this.settings.add("addon.trubbel.channel.chat.viewer_cards.clickable_mods_vips", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat >> Viewer Cards",
        title: "Clickable usernames in /mods and /vips",
        description: "This gives you the ability to click on the usernames when using the `/mods` and `/vips` commands, which will open up their viewer cards.\n\n**Notes:**\n\n• Might not work for every language.\n\n• There could be some instances where it might not apply correctly. Just send the command again, and it should work.",
        component: "setting-check-box"
      },
      changed: val => this.infoMessage.handleSettingChange(val)
    });

    // Channel - Chat - Viewer Cards - Clickable raid messages
    this.settings.add("addon.trubbel.channel.chat.viewer_cards.clickable_raid", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat >> Viewer Cards",
        title: "Clickable raid messages",
        description: "This lets you click on the usernames in raid messages to open up their viewer cards.",
        component: "setting-check-box"
      },
      changed: val => this.raidMessage.handleSettingChange(val)
    });

    // Channel - Chat - Viewer Cards - Show recent messages in viewer cards
    this.settings.add("addon.trubbel.channel.chat.viewer_cards.recent_messages", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat >> Viewer Cards",
        title: "Show recent messages in viewer cards",
        description: "Display up to 50 recent messages from a user when you open their viewer card.\n\n**Note:** This isn't perfect, nor meant to be used as moderation.",
        component: "setting-check-box"
      },
      changed: val => this.recentMessages.handleSettingChange(val)
    });
  }

  onEnable() {
    this.router.on(":route", this.navigate, this);
    this.bttvModeration.initialize();
    this.customCommands.initialize();
    this.firstTimeChatter.initialize();
    this.infoMessage.initialize();
    this.chatMarkdown.initialize();
    this.messageHighlight.initialize();
    this.oldClipFormat.initialize();
    this.oldViewerList.initialize();
    this.popoutChatName.initialize();
    this.raidMessage.initialize();
    this.raidPreview.initialize();
    this.recentMessages.initialize();
    this.sharedChatMessage.initialize();
    this.steamInspect.initialize();
    this.timestampHandler.initialize();
  }

  async navigate() {
    this.bttvModeration.handleNavigation();
    this.customCommands.handleNavigation();
    this.firstTimeChatter.handleNavigation();
    this.infoMessage.handleNavigation();
    this.chatMarkdown.handleNavigation();
    this.messageHighlight.handleNavigation();
    this.oldClipFormat.handleNavigation();
    this.oldViewerList.handleNavigation();
    this.popoutChatName.handleNavigation();
    this.raidMessage.handleNavigation();
    this.raidPreview.handleNavigation();
    this.recentMessages.handleNavigation();
    this.sharedChatMessage.handleNavigation();
    this.steamInspect.handleNavigation();
    this.timestampHandler.handleNavigation();
  }
}
