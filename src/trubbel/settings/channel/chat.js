import AutoHidePinnedMessage from "../../modules/channel/chat/hide-pinned-message";
import BTTVModeration from "../../modules/channel/chat/bttv";
import CharacterCounter from "../../modules/channel/chat/character-counter";
import ChatHeaderInfo from "../../modules/channel/chat/custom-header-info";
import ChatMarkdown from "../../modules/channel/chat/markdown";
import ChatTranslate from "../../modules/channel/chat/translate";
import Commands from "../../modules/channel/chat/commands-handler";
import FirstTimeChatter from "../../modules/channel/chat/ftc";
import InfoMessage from "../../modules/channel/chat/info-message";
import InputLatency from "../../modules/channel/chat/input-latency";
import MessageHighlight from "../../modules/channel/chat/message-highlight";
import OldClipFormat from "../../modules/channel/chat/old-clip-format";
import OldViewerList from "../../modules/channel/chat/old-viewer-list";
import PopoutChatName from "../../modules/channel/chat/popout-header-name";
import PredictionNotifications from "../../modules/channel/chat/prediction-notifications";
import RaidMessage from "../../modules/channel/chat/raid-message";
import RaidPreview from "../../modules/channel/chat/raid-preview";
import RecentMessages from "../../modules/channel/chat/recent-messages";
import SharedChatMessage from "../../modules/channel/chat/shared-chat";
import SteamInspect from "../../modules/channel/chat/steam-inspect";
import StopEmoteAnimate from "../../modules/channel/chat/stop-emote-animate";
import StopAutoRotate from "../../modules/channel/chat/leaderboard";
import TextReplace from "../../modules/channel/chat/text-replace";
import TextToSpeech from "../../modules/channel/chat/tts";
import TimestampHandler from "../../modules/channel/chat/timestamps";
import ViewerCards from "../../modules/channel/chat/viewer-card";

const { createElement, ManagedStyle } = FrankerFaceZ.utilities.dom;

const VC_MOD_TABS = [
  { id: "messages", name: "Messages", enabled: true },
  { id: "warnings", name: "Warnings", enabled: true },
  { id: "timeouts", name: "Timeouts", enabled: true },
  { id: "bans", name: "Bans", enabled: true },
  { id: "requests", name: "Appeals", enabled: false },
  { id: "comments", name: "Mod Comments", enabled: true }
];

const VC_MORE_OPTIONS = [
  { id: "pin", name: "Pin", enabled: true },
  { id: "edit", name: "Edit (name & color overrides)", enabled: true },
  { id: "notes", name: "Notes", enabled: true },
  { id: "follow", name: "Follow / Unfollow", enabled: true },
  { id: "mention", name: "Mention", enabled: true },
  { id: "mod", name: "Mod / Unmod", enabled: true },
  { id: "edit-profile", name: "Edit Profile (own card)", enabled: true },
  { id: "edit-chat-identity", name: "Edit Chat Identity (own card)", enabled: true },
  { id: "highlight", name: "Highlight", enabled: true },
  { id: "block", name: "Block", enabled: true },
  { id: "report", name: "Report", enabled: true },
  { id: "whisper", name: "Whisper", enabled: true }
];

function normalizeOrderedList(defs, val) {
  const out = [], seen = new Set();
  if (Array.isArray(val))
    for (const t of val) {
      const def = t && defs.find(d => d.id === t.id);
      if (!def || seen.has(def.id)) continue;
      seen.add(def.id);
      out.push({ id: def.id, enabled: t.enabled !== false });
    }

  for (const def of defs)
    if (!seen.has(def.id))
      out.push({ id: def.id, enabled: def.enabled });

  return out;
}

const normalizeViewerCardTabs = val => normalizeOrderedList(VC_MOD_TABS, val);
const normalizeMoreOptions = val => normalizeOrderedList(VC_MORE_OPTIONS, val);

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

    this.autoHidePinnedMessage = new AutoHidePinnedMessage(this);
    this.bttvModeration = new BTTVModeration(this);
    this.characterCounter = new CharacterCounter(this);
    this.chatHeaderInfo = new ChatHeaderInfo(this);
    this.chatMarkdown = new ChatMarkdown(this);
    this.chatTranslate = new ChatTranslate(this);
    this.customCommands = new Commands(this);
    this.firstTimeChatter = new FirstTimeChatter(this);
    this.infoMessage = new InfoMessage(this);
    this.inputLatency = new InputLatency(this);
    this.messageHighlight = new MessageHighlight(this);
    this.oldClipFormat = new OldClipFormat(this);
    this.oldViewerList = new OldViewerList(this);
    this.popoutChatName = new PopoutChatName(this);
    this.predictionNotifications = new PredictionNotifications(this);
    this.raidMessage = new RaidMessage(this);
    this.raidPreview = new RaidPreview(this);
    this.recentMessages = new RecentMessages(this);
    this.sharedChatMessage = new SharedChatMessage(this);
    this.steamInspect = new SteamInspect(this);
    this.stopEmoteAnimate = new StopEmoteAnimate(this);
    this.stopAutoRotate = new StopAutoRotate(this);
    this.textReplace = new TextReplace(this);
    this.textToSpeech = new TextToSpeech(this);
    this.timestampHandler = new TimestampHandler(this);
    this.viewerCards = new ViewerCards(this);

    // Channel - Chat - Accessibility - Enable Animated Emotes Blocklist
    this.settings.add("addon.trubbel.channel.chat.accessibility.stop_emote_animate", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Accessibility >> Emotes",
        title: "Enable Animated Emotes Blocklist",
        description: "You can selectively disable animated emotes by right-clicking on them and then press \"Disable Animation\"\n\n**Note:** If you want to disable **all** emotes from animating, please use [Chat > Appearance > Animated Emotes](~chat.appearance.emotes) instead.",
        component: "setting-check-box"
      },
      changed: val => this.stopEmoteAnimate.handleSettingChange(val)
    });

    // Channel - Chat - Accessibility - Blocked Emotes
    this.settings.addUI("addon.trubbel.channel.chat.accessibility.stop_emote_animate.list", {
      path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Accessibility >> Emotes",
      title: "Blocked Emotes",
      component: () => import("../../components/main_menu/animated-emote-blocklist.vue"),
      force_seen: true,
      getBlocklist: () => this.stopEmoteAnimate.getBlocklist(),
      removeEmote: (provider, id) => this.stopEmoteAnimate.removeEmote(provider, id),
      clearBlocklist: () => this.stopEmoteAnimate.clearBlocklist(),
      on: (...args) => this.on(...args),
      off: (...args) => this.off(...args),
    });



    // Channel - Chat - Commands - Enable custom commands
    this.settings.add("addon.trubbel.channel.chat.commands.custom", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Commands >> Custom",
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
          path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Commands >> Custom",
          title: command.charAt(0).toUpperCase() + command.slice(1),
          description: description,
          component: "setting-check-box"
        },
        changed: () => this.customCommands.handleCustomCommands()
      });
    });



    // Channel - Chat - Input - FirstTimeChatter - Show FirstTimeChatter Indicator
    this.settings.add("addon.trubbel.channel.chat.ftc", {
      default: false,
      requires: ["context.session.user"],
      process(ctx, val) {
        return ctx.get("context.session.user") ? val : false;
      },
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Input >> FirstTimeChatter",
        title: "Show FirstTimeChatter Indicator",
        description: "Display a pink border around the chat box if you are a first-time chatter.\n\n**Note:** It will automatically remove the border if you send any chat messages.",
        component: "setting-check-box"
      },
      changed: val => this.firstTimeChatter.handleSettingChange(val)
    });

    // Channel - Chat - Input - Latency - Show Stream Latency in Chat Input
    this.settings.add("addon.trubbel.channel.chat.input.latency_placeholder", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Input >> Latency",
        title: "Show Stream Latency in Chat Input",
        description: "Replaces the \"Send a message\" placeholder with the stream's current latency while the chat box is empty.",
        component: "setting-check-box"
      },
      changed: val => this.inputLatency.handleSettingChange(val)
    });



    // Channel - Chat - Header - Display Stream Info in Chat Header
    this.settings.add("addon.trubbel.channel.chat.header.info", {
      default: "off",
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Header >> Info",
        title: "Display Stream Info in Chat Header",
        description: "Replace the \"Stream Chat\" title with live stream information - latency, uptime, or both.",
        component: "setting-select-box",
        data: [
          { value: "off", title: "Off" },
          { value: "latency", title: "Stream Latency" },
          { value: "uptime", title: "Stream Uptime" },
          { value: "both", title: "Both (Uptime \u0026 Latency)" },
        ]
      },
      changed: val => this.chatHeaderInfo.handleSettingChange(val),
    });



    // Channel - Chat - Input - Character Counter
    this.settings.add("addon.trubbel.channel.chat.input.character_counter", {
      default: "disabled",
      ui: {
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Input >> Counter",
        title: "Character Counter",
        component: "setting-select-box",
        data: [
          { title: "Disabled", value: "disabled", },
          { title: "Top Left", value: "top-left", },
          { title: "Top Right", value: "top-right", },
          { title: "Bottom Left", value: "bottom-left", },
          { title: "Bottom Right", value: "bottom-right", },
        ]
      },
      changed: val => this.characterCounter.handlePositionChange(val)
    });

    // Channel - Chat - Input - Character Counter Font Size
    this.settings.add("addon.trubbel.channel.chat.input.character_counter.size", {
      default: 11,
      ui: {
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Input >> Counter",
        title: "Character Counter Font Size",
        component: "setting-text-box",
        process: "to_int",
        bounds: [8, true, 20, true]
      },
      changed: val => this.characterCounter.handleFontSizeChange(val)
    });



    // Channel - Chat - Links - Replace clip URLs
    this.settings.add("addon.trubbel.channel.chat.links.clip_replace", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Messages >> Links",
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
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Messages >> Links",
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
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Messages >> Markdown",
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
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Messages >> Markdown",
        title: "Enable Markdown",
        description: "Support for markdown - bold, italics, underline, strikethrough, spoilers and timestamps.\n\n**Note:** Timestamps uses same format as Discord timestamps.",
        component: "setting-check-box"
      },
      changed: val => this.chatMarkdown.handleSettingChange(val)
    });



    // Channel - Chat - Messages - Highlight Messages on Hover
    this.settings.add("addon.trubbel.channel.chat.messages.highlight", {
      default: 0,
      ui: {
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Messages >> Highlights",
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
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Messages >> Highlights",
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
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Moderation >> Context Menu",
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
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Moderation >> Context Menu",
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
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Moderation >> Context Menu",
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
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Moderation >> Context Menu",
        title: "Right-click options",
        component: "setting-select-box",
        data: [
          { title: "Usernames only", value: "usernames" },
          { title: "Entire messages", value: "messages1" },
          { title: "Entire messages (except embeds and links)", value: "messages2" },
        ]
      }
    });



    // Channel - Chat - Pinned Message - Auto-hide pinned messages
    this.settings.add("addon.trubbel.channel.chat.hide_pinned_message", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Messages >> Pinned Messages",
        title: "Auto-hide Pinned Messages",
        component: "setting-check-box"
      },
      changed: val => this.autoHidePinnedMessage.handleSettingChange(val)
    });



    // Channel - Chat - Popout - Display channel name in Popout Chat
    this.settings.add("addon.trubbel.channel.chat.popout.title_name", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Header >> Popout",
        title: "Display channel name in Popout Chat",
        description: "Enabling this will replace the \"Stream Chat\" text above chat with the streamers username.",
        component: "setting-check-box"
      },
      changed: val => this.popoutChatName.handleSettingChange(val)
    });



    // Channel - Chat - Predictions - Prediction Started Notifications
    this.settings.add("addon.trubbel.channel.chat.prediction.notifications", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Notifications >> Predictions",
        title: "Prediction Started Notifications",
        description:
          "Send a browser notification when a prediction starts in the current channel.\n\n" +
          "**Note:** Your browser will ask for notification permission the first time you enable this.",
        component: "setting-check-box"
      },
      changed: val => this.predictionNotifications.handleSettingChange(val)
    });

    // Channel - Chat - Predictions - Only notify when tab is unfocused
    this.settings.add("addon.trubbel.channel.chat.prediction.notifications.only_unfocused", {
      default: true,
      requires: ["addon.trubbel.channel.chat.prediction.notifications"],
      process(ctx, val) {
        if (!ctx.get("addon.trubbel.channel.chat.prediction.notifications")) return false;
        return val;
      },
      ui: {
        sort: 1,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Notifications >> Predictions",
        title: "Only notify when tab is unfocused",
        description: "Skip the notification if you already have the Twitch tab in focus.",
        component: "setting-check-box"
      }
    });

    // Channel - Chat - Predictions - Keep notification until dismissed
    this.settings.add("addon.trubbel.channel.chat.prediction.notifications.require_interaction", {
      default: false,
      requires: ["addon.trubbel.channel.chat.prediction.notifications"],
      process(ctx, val) {
        if (!ctx.get("addon.trubbel.channel.chat.prediction.notifications")) return false;
        return val;
      },
      ui: {
        sort: 2,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Notifications >> Predictions",
        title: "Keep notification until dismissed",
        description: "Prevent the notification from auto-dismissing, it will stay visible until you explicitly close it.\n\n**Note:** Behaviour may vary depending on your browser and OS.",
        component: "setting-check-box"
      }
    });



    // Channel - Chat - Raids - Show raid preview
    this.settings.add("addon.trubbel.channel.chat.raids.previews", {
      default: 0,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Raids >> Preview",
        title: "Show raid preview",
        description: "Display an image or video preview of the stream when a raid is active.",
        component: "setting-select-box",
        data: [
          { value: 0, title: "Off" },
          { value: 1, title: "Image Preview" },
          { value: 2, title: "Video Preview" }
        ]
      },
      changed: val => this.raidPreview.handleSettingChange(val)
    });

    // Channel - Chat - Raids - Show uptime on raid preview
    this.settings.add("addon.trubbel.channel.chat.raids.previews.uptime", {
      default: true,
      requires: ["addon.trubbel.channel.chat.raids.previews"],
      process(ctx, val) {
        if (!ctx.get("addon.trubbel.channel.chat.raids.previews"))
          return false;
        return val;
      },
      ui: {
        sort: 1,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Raids >> Preview",
        title: "Show uptime on raid preview",
        description: "Display the stream uptime (and content flags if enabled in FFZ settings) on the preview.",
        component: "setting-check-box"
      }
    });

    // Channel - Chat - Raids - Show chat restrictions on raid preview
    this.settings.add("addon.trubbel.channel.chat.raids.previews.chat_settings", {
      default: true,
      requires: ["addon.trubbel.channel.chat.raids.previews"],
      process(ctx, val) {
        if (!ctx.get("addon.trubbel.channel.chat.raids.previews"))
          return false;
        return val;
      },
      ui: {
        sort: 2,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Raids >> Preview",
        title: "Show chat restrictions on raid preview",
        description: "Display chat restrictions (sub-only, followers-only, slow mode, etc.) below the preview.",
        component: "setting-check-box"
      }
    });



    // Channel - Chat - Shared Chat - Hide shared messages
    this.settings.add("addon.trubbel.channel.chat.shared_chat.hide-message", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Messages >> Shared Chat",
        title: "Hide shared messages",
        component: "setting-check-box"
      },
      changed: val => this.sharedChatMessage.handleSettingChange(val)
    });



    // Channel - Chat - Text Replace - Enable text replacement for outgoing messages
    this.settings.add("addon.trubbel.channel.chat.text_replace", {
      default: false,
      ui: {
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Messages >> Text Replace",
        title: "Enable text replacement for outgoing messages.",
        component: "setting-check-box"
      }
    });

    this.settings.add("addon.trubbel.channel.chat.text_replace.rules", {
      default: [],
    });

    this.settings.addUI("addon.trubbel.channel.chat.text_replace.rules-editor", {
      path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Messages >> Text Replace @{\"profile_warning\": false}",
      component: () => import("../../components/main_menu/text-replace.vue"),
      force_seen: true,
      getRules: () => this.textReplace.getRules(),
      setRules: (rules) => this.textReplace.setRules(rules),
    });



    // Channel - Chat - Text-to-Speech - Enable Text-to-Speech
    this.settings.add("addon.trubbel.channel.chat.tts", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Messages >> Text-to-Speech",
        title: "Enable Text-to-Speech",
        description: "After enabling this you need to set it up in [Chat > Actions](~chat.actions), then pick either, [In-Line](~chat.actions.in_line), [Message Hover](~chat.actions.message_hover), or [User Context](~chat.actions.user_context).",
        component: "setting-check-box",
      },
      changed: (val) => this.textToSpeech.handleSettingChange(val),
    });

    // Channel - Chat - Text-to-Speech - Announce Username
    this.settings.add("addon.trubbel.channel.chat.tts.announce_user", {
      default: true,
      ui: {
        sort: 1,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Messages >> Text-to-Speech",
        title: "Announce Username",
        description: "Prepend the sender's name before the message, e.g. \"Alice says: hello\".",
        component: "setting-check-box",
      },
    });

    // Channel - Chat - Text-to-Speech - Voice
    this.settings.add("addon.trubbel.channel.chat.tts.voice", {
      default: "",
      ui: {
        sort: 2,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Messages >> Text-to-Speech",
        title: "Voice",
        description: "The voice to use for speech synthesis.",
        component: "setting-select-box",
        data: () => {
          const voices = speechSynthesis.getVoices();
          const entries = voices.map((v) => ({
            value: v.voiceURI,
            title: `${v.name} (${v.lang})`,
          }));
          return [{ value: "", title: "Browser Default" }, ...entries];
        },
      },
    });

    // Channel - Chat - Text-to-Speech - Volume
    this.settings.add("addon.trubbel.channel.chat.tts.volume", {
      default: 1,
      ui: {
        sort: 3,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Messages >> Text-to-Speech",
        title: "Volume",
        description: "Speech volume. 1 is full volume. Range: 0 - 1.",
        component: "setting-text-box",
        process: "to_float",
        bounds: [0, 1],
      },
    });

    // Channel - Chat - Text-to-Speech - Speed
    this.settings.add("addon.trubbel.channel.chat.tts.rate", {
      default: 1,
      ui: {
        sort: 4,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Messages >> Text-to-Speech",
        title: "Speed",
        description: "Speech rate. 1 is normal speed. Range: 0.1 - 10.",
        component: "setting-text-box",
        process: "to_float",
        bounds: [0.1, 10],
      },
    });

    // Channel - Chat - Text-to-Speech - Pitch
    this.settings.add("addon.trubbel.channel.chat.tts.pitch", {
      default: 1,
      ui: {
        sort: 5,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Messages >> Text-to-Speech",
        title: "Pitch",
        description: "Speech pitch. 1 is normal pitch. Range: 0 - 2.",
        component: "setting-text-box",
        process: "to_float",
        bounds: [0, 2],
      },
    });



    // Channel - Chat - Timestamp - Display missing timestamps
    this.settings.add("addon.trubbel.channel.chat.timestamps.add_missing", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Messages >> Timestamp",
        title: "Display missing timestamps (Experimental)",
        description: "For certain chat events that lack timestamps.",
        component: "setting-check-box"
      },
      changed: val => this.timestampHandler.handleSettingChange(val)
    });



    // Channel - Chat - Translation - Enable Simple Translate
    this.settings.add("addon.trubbel.channel.chat.translation", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Messages >> Translation",
        title: "Enable Simple Translate",
        description: "After enabling this you need to set it up in [Chat > Actions](~chat.actions), then pick either, [In-Line](~chat.actions.in_line), [Message Hover](~chat.actions.message_hover), or [User Context](~chat.actions.user_context).\n\n**Note:** This uses Google Translate.",
        component: "setting-check-box"
      },
      changed: val => this.chatTranslate.handleSettingChange(val)
    });

    // Channel - Chat - Translation - Target Language
    this.settings.add("addon.trubbel.channel.chat.translation.target_lang", {
      default: "en",
      requires: ["addon.trubbel.channel.chat.translation"],
      process(ctx, val) {
        if (!ctx.get("addon.trubbel.channel.chat.translation"))
          return false;
        return val;
      },
      ui: {
        sort: 1,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Messages >> Translation",
        title: "Target Language",
        description: "The language to translate messages into.",
        component: "setting-select-box",
        data: [
          { value: "en", title: "English" },
          { value: "es", title: "Spanish" },
          { value: "fr", title: "French" },
          { value: "de", title: "German" },
          { value: "it", title: "Italian" },
          { value: "pt", title: "Portuguese" },
          { value: "ru", title: "Russian" },
          { value: "ja", title: "Japanese" },
          { value: "ko", title: "Korean" },
          { value: "zh-CN", title: "Chinese (Simplified)" },
          { value: "zh-TW", title: "Chinese (Traditional)" },
          { value: "ar", title: "Arabic" },
          { value: "hi", title: "Hindi" },
          { value: "sv", title: "Swedish" },
          { value: "da", title: "Danish" },
          { value: "no", title: "Norwegian" },
          { value: "fi", title: "Finnish" },
          { value: "nl", title: "Dutch" },
          { value: "pl", title: "Polish" },
          { value: "tr", title: "Turkish" }
        ]
      }
    });



    // Channel - Chat - UI - Disable Leaderboard Auto-Rotate
    this.settings.add("addon.trubbel.channel.chat.leaderboard.shouldAutoRotate", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > UI >> Leaderboard",
        title: "Disable Leaderboard Auto-Rotate (Experimental)",
        description: "Prevents the leaderboard (gift/cheer/clips/etc) from automatically cycling through pages on it's own.",
        component: "setting-check-box"
      },
      changed: val => this.stopAutoRotate.handleSettingChange(val)
    });



    // Channel - Chat - UI - Show old viewer list
    this.settings.add("addon.trubbel.channel.chat.ui.old_viewer_list", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > UI >> Viewer List",
        title: "Show old viewer list",
        description: "When enabled, clicking the chat viewer list button will display the old chat list instead.",
        component: "setting-check-box"
      },
      changed: val => this.oldViewerList.handleSettingChange(val)
    });



    // Channel - Chat - Messages - Viewer Cards - Clickable usernames in /mods and /vips
    this.settings.add("addon.trubbel.channel.chat.viewer_cards.clickable_mods_vips", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Messages >> Viewer Cards",
        title: "Clickable usernames in /mods and /vips",
        description: "This gives you the ability to click on the usernames when using the `/mods` and `/vips` commands, which will open up their viewer cards.\n\n**Notes:**\n\n• Might not work for every language.\n\n• There could be some instances where it might not apply correctly. Just send the command again, and it should work.",
        component: "setting-check-box"
      },
      changed: val => this.infoMessage.handleSettingChange(val)
    });

    // Channel - Chat - Messages - Viewer Cards - Clickable raid messages
    this.settings.add("addon.trubbel.channel.chat.viewer_cards.clickable_raid", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Messages >> Viewer Cards",
        title: "Clickable raid messages",
        description: "This lets you click on the usernames in raid messages to open up their viewer cards.",
        component: "setting-check-box"
      },
      changed: val => this.raidMessage.handleSettingChange(val)
    });

    // Channel - Chat - Messages - Viewer Cards - Show recent messages in viewer cards
    this.settings.add("addon.trubbel.channel.chat.viewer_cards.recent_messages", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Messages >> Viewer Cards",
        title: "Show recent messages in viewer cards",
        description: "Display up to 50 recent messages from a user when you open their viewer card.\n\n**Note:** This isn't perfect, nor meant to be used as moderation.",
        component: "setting-check-box"
      },
      changed: val => this.recentMessages.handleSettingChange(val)
    });



    // Channel - Chat - Viewer Cards - General - Enable custom viewer cards
    this.settings.add("addon.trubbel.channel.chat.viewer-cards.enabled", {
      default: false,
      requires: ["context.session.user"],
      process(ctx, val) {
        return ctx.get("context.session.user") ? val : false;
      },
      ui: {
        sort: 0,
        path: 'Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Viewer Cards >> General @{"sort": 0}',
        title: "Enable Custom viewer cards",
        component: "setting-check-box"
      },
      changed: val => this.viewerCards.handleSettingChange(val)
    });

    // Channel - Chat - Viewer Cards - General - Handle Mention clicks
    this.settings.add("addon.trubbel.channel.chat.viewer-cards.handle-mentions", {
      default: false,
      requires: ["context.session.user"],
      process(ctx, val) {
        return ctx.get("context.session.user") ? val : false;
      },
      ui: {
        sort: 1,
        path: 'Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Viewer Cards >> General @{"sort": 0}',
        title: "Handle Mention clicks",
        description: "Open custom viewer cards when clicking @mentions in chat.",
        component: "setting-check-box"
      }
    });

    // Channel - Chat - Viewer Cards - General - Handle Pinned Message clicks
    this.settings.add("addon.trubbel.channel.chat.viewer-cards.handle-pinned-messages", {
      default: false,
      requires: ["context.session.user"],
      process(ctx, val) {
        return ctx.get("context.session.user") ? val : false;
      },
      ui: {
        sort: 2,
        path: 'Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Viewer Cards >> General @{"sort": 0}',
        title: "Handle Pinned Message clicks",
        description: "Open custom viewer cards when clicking usernames in pinned chat messages.",
        component: "setting-check-box"
      }
    });

    // Channel - Chat - Viewer Cards - General - Handle Viewer List clicks
    this.settings.add("addon.trubbel.channel.chat.viewer-cards.handle-viewer-list", {
      default: false,
      requires: ["context.session.user"],
      process(ctx, val) {
        return ctx.get("context.session.user") ? val : false;
      },
      ui: {
        sort: 4,
        path: 'Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Viewer Cards >> General @{"sort": 0}',
        title: "Handle Viewer List clicks",
        description: "Open custom viewer cards when clicking usernames in the viewer list.",
        component: "setting-check-box"
      }
    });

    // Channel - Chat - Viewer Cards - Highlighting - Highlight messages when viewer card is opened
    this.settings.add("addon.trubbel.channel.chat.viewer-cards.highlight-chat", {
      default: false,
      ui: {
        sort: 0,
        path: 'Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Viewer Cards >> Highlighting @{"sort": 1}',
        title: "Highlight messages when viewer card is opened",
        component: "setting-check-box"
      },
      changed: () => this.viewerCards.refreshHighlight()
    });

    // Channel - Chat - Viewer Cards - Highlighting - Highlight Color
    this.settings.add("addon.trubbel.channel.chat.viewer-cards.highlight-color", {
      default: "",
      ui: {
        sort: 1,
        path: 'Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Viewer Cards >> Highlighting @{"sort": 1}',
        title: "Highlight Color",
        component: "setting-color-box"
      },
      changed: () => this.viewerCards.refreshHighlight()
    });

    // Channel - Chat - Viewer Cards - Highlighting - Temp. Highlight Color
    this.settings.add("addon.trubbel.channel.chat.viewer-cards.temp-highlight-color", {
      default: "",
      ui: {
        sort: 2,
        path: 'Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Viewer Cards >> Highlighting @{"sort": 1}',
        title: "Temp. Highlight Color",
        description: "Color used by **Highlight** in a custom viewer card's **More options**-menu.\n\nThese highlights are temporary and are cleared when you refresh or navigate to another page.\n\nFor a permanent highlight, use [Chat > Filtering > Highlight >> Users](~chat.filtering.highlight) instead.",
        component: "setting-color-box"
      },
      changed: () => this.viewerCards.updateTempHighlights()
    });

    // Channel - Chat - Viewer Cards - Appearance - Display native card button
    this.settings.add("addon.trubbel.channel.chat.viewer-cards.show-native-button", {
      default: true,
      ui: {
        sort: 0,
        path: 'Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Viewer Cards >> Appearance @{"sort": 2}',
        title: "Display native card button",
        description: "Show the button that opens Twitch's own viewer card.",
        component: "setting-check-box"
      }
    });

    // Channel - Chat - Viewer Cards - Appearance - Display popout button
    this.settings.add("addon.trubbel.channel.chat.viewer-cards.show-popout-button", {
      default: true,
      ui: {
        sort: 1,
        path: 'Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Viewer Cards >> Appearance @{"sort": 2}',
        title: "Display popout button",
        description: "Show the button that opens Twitch's viewer card in a popout window.",
        component: "setting-check-box"
      }
    });

    // Channel - Chat - Viewer Cards - Appearance - Display user banner
    this.settings.add("addon.trubbel.channel.chat.viewer-cards.show-banner", {
      default: true,
      ui: {
        sort: 2,
        path: 'Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Viewer Cards >> Appearance @{"sort": 2}',
        title: "Display user banner",
        description: "Show the user's profile banner image in the background of the card header.",
        component: "setting-check-box"
      }
    });

    // Channel - Chat - Viewer Cards - Appearance - Display user badges
    this.settings.add("addon.trubbel.channel.chat.viewer-cards.show-badges", {
      default: true,
      ui: {
        sort: 3,
        path: 'Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Viewer Cards >> Appearance @{"sort": 2}',
        title: "Display user badges",
        description: "Show the user's earned badges in the custom viewer card.",
        component: "setting-check-box"
      }
    });

    // Channel - Chat - Viewer Cards - Appearance - Display Avatar Tooltip
    this.settings.add("addon.trubbel.channel.chat.viewer-cards.show-avatar-tooltip", {
      default: true,
      ui: {
        sort: 4,
        path: 'Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Viewer Cards >> Appearance @{"sort": 2}',
        title: "Display avatar tooltip",
        description: "Show a larger version of the avatar when hovering the user's avatar or the \"Chatting from\" channel avatar in the custom viewer card.",
        component: "setting-check-box"
      }
    });

    // Channel - Chat - Viewer Cards - Appearance - Display 7TV name paints
    this.settings.add("addon.trubbel.channel.chat.viewer-cards.show-paints", {
      default: true,
      ui: {
        sort: 5,
        path: 'Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Viewer Cards >> Appearance @{"sort": 2}',
        title: "Display 7TV name paints",
        description: "Show the user's 7TV name paint on their username in the custom viewer card, and on their name in the Messages-tab and live messages.",
        component: "setting-check-box"
      }
    });

    // Channel - Chat - Viewer Cards - Appearance - More Options Menu
    this.settings.add("addon.trubbel.channel.chat.viewer-cards.more-options", {
      default: VC_MORE_OPTIONS.map(t => ({ id: t.id, enabled: t.enabled })),
      process(ctx, val) {
        return normalizeMoreOptions(val);
      },
      ui: {
        sort: 6,
        path: 'Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Viewer Cards >> Appearance @{"sort": 2}',
        title: "More Options Menu",
        description: "Choose which actions are shown in the custom viewer card's \"More options\" menu. Drag to change their order.",
        component: () => import("../../components/main_menu/setting-mod-tabs.vue"),
        tabs: VC_MORE_OPTIONS,
        normalize: normalizeMoreOptions,
        itemLabel: "Display {name}"
      }
    });

    // Channel - Chat - Viewer Cards - Moderation - Timeout Buttons
    this.settings.addUI("addon.trubbel.channel.chat.viewer-cards.timeout-buttons", {
      sort: 0,
      path: 'Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Viewer Cards >> Moderation @{"sort": 3}',
      title: "Timeout Buttons",
      description: "Configure custom timeout buttons that appear in custom viewer cards.",
      component: () => import("../../components/main_menu/setting-timeout-buttons.vue"),
      getTimeoutButtons: () => {
        try {
          const data = this.settings.provider.get("addon.trubbel.channel.chat.viewer-cards.timeout-buttons.config");
          if (data && Array.isArray(data) && data.length === 8) {
            return data;
          }
          return [
            { value: 1, unit: "second" },
            { value: 5, unit: "minute" },
            { value: 10, unit: "minute" },
            { value: 1, unit: "hour" },
            { value: 2, unit: "hour" },
            { value: 1, unit: "day" },
            { value: 1, unit: "week" },
            { value: 2, unit: "week" }
          ];
        } catch (error) {
          console.error("[ViewerCards] Error reading timeout buttons:", error);
          return [
            { value: 1, unit: "second" },
            { value: 5, unit: "minute" },
            { value: 10, unit: "minute" },
            { value: 1, unit: "hour" },
            { value: 2, unit: "hour" },
            { value: 1, unit: "day" },
            { value: 1, unit: "week" },
            { value: 2, unit: "week" }
          ];
        }
      },
      setTimeoutButtons: (buttons) => {
        try {
          this.settings.provider.set("addon.trubbel.channel.chat.viewer-cards.timeout-buttons.config", buttons);
        } catch (error) {
          console.error("[ViewerCards] Error storing timeout buttons:", error);
        }
      }
    });

    // Channel - Chat - Viewer Cards - Moderation - Moderation Tabs
    this.settings.add("addon.trubbel.channel.chat.viewer-cards.mod-tabs", {
      default: VC_MOD_TABS.map(t => ({ id: t.id, enabled: t.enabled })),
      process(ctx, val) {
        return normalizeViewerCardTabs(val);
      },
      ui: {
        sort: 1,
        path: 'Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Viewer Cards >> Moderation @{"sort": 3}',
        title: "Moderation Tabs",
        description: "Choose which tabs are shown on custom viewer cards. Drag to change their order.",
        component: () => import("../../components/main_menu/setting-mod-tabs.vue"),
        tabs: VC_MOD_TABS,
        normalize: normalizeViewerCardTabs
      }
    });

    // Channel - Chat - Viewer Cards - User Notes
    this.settings.addUI("addon.trubbel.channel.chat.viewer-cards.notes", {
      sort: 0,
      path: 'Add-Ons > Trubbel\u2019s Utilities > Channel > Chat > Viewer Cards >> User Notes @{"sort": 4}',
      description: "Private notes you've written about users from their custom viewer cards. Notes are stored locally and included in FFZ's settings backups.",
      component: () => import("../../components/main_menu/setting-user-notes.vue"),
      getNotes: () => this.viewerCards.notes,
      setNote: (user, text) => this.viewerCards.setNote(user, text),
      deleteNote: id => this.viewerCards.deleteNote(id),
      on: (...args) => this.on(...args),
      off: (...args) => this.off(...args)
    });
  }

  onEnable() {
    this.router.on(":route", this.navigate, this);
    this.autoHidePinnedMessage.initialize();
    this.bttvModeration.initialize();
    this.characterCounter.initialize();
    this.chatHeaderInfo.initialize();
    this.chatMarkdown.initialize();
    this.chatTranslate.initialize();
    this.customCommands.initialize();
    this.firstTimeChatter.initialize();
    this.infoMessage.initialize();
    this.inputLatency.initialize();
    this.messageHighlight.initialize();
    this.oldClipFormat.initialize();
    this.oldViewerList.initialize();
    this.popoutChatName.initialize();
    this.predictionNotifications.initialize();
    this.raidMessage.initialize();
    this.raidPreview.initialize();
    this.recentMessages.initialize();
    this.sharedChatMessage.initialize();
    this.steamInspect.initialize();
    this.stopEmoteAnimate.initialize();
    this.stopAutoRotate.initialize();
    this.textReplace.initialize();
    this.textToSpeech.initialize();
    this.timestampHandler.initialize();
    this.viewerCards.initialize();
  }

  async navigate() {
    this.autoHidePinnedMessage.handleNavigation();
    this.bttvModeration.handleNavigation();
    this.characterCounter.handleNavigation();
    this.chatHeaderInfo.handleNavigation();
    this.chatMarkdown.handleNavigation();
    this.chatTranslate.handleNavigation();
    this.customCommands.handleNavigation();
    this.firstTimeChatter.handleNavigation();
    this.infoMessage.handleNavigation();
    this.inputLatency.handleNavigation();
    this.messageHighlight.handleNavigation();
    this.oldClipFormat.handleNavigation();
    this.oldViewerList.handleNavigation();
    this.popoutChatName.handleNavigation();
    this.predictionNotifications.handleNavigation();
    this.raidMessage.handleNavigation();
    this.raidPreview.handleNavigation();
    this.recentMessages.handleNavigation();
    this.sharedChatMessage.handleNavigation();
    this.steamInspect.handleNavigation();
    this.stopEmoteAnimate.handleNavigation();
    this.stopAutoRotate.handleNavigation();
    this.textReplace.handleNavigation();
    this.textToSpeech.handleNavigation();
    this.timestampHandler.handleNavigation();
    this.viewerCards.handleNavigation();
  }
}
