import { isBackgroundTab } from "../modules/channel/livestream/background-tabs";
import { ActivityFeed } from "../modules/channel/modview/activity-feed";
import { BTTVModeration } from "../modules/channel/chat/moderation/bttv";
import { SteamInspect } from "../modules/channel/chat/steam-inspect";
import { autoModView } from "../modules/channel/modview/auto-mod-view";
import { ChatCommands } from "../modules/channel/chat/custom-commands";
import { CustomSeeking } from "../modules/channel/vods/custom-seeking";
import { AutoSkipMutedSegments } from "../modules/channel/vods/auto-skip-muted-segments";
import { PopoutChatName } from "../modules/channel/chat/popout-header-name";
import { RaidMessages } from "../modules/channel/chat/raid-messages";
import { ProgressBar } from "../modules/channel/vods/progress-bar";
import { ClickableModsVIPs } from "../modules/channel/chat/clickable-mods-vips";

import { PLAYER_ERROR_OVERLAY_SELECTOR } from "../utilities/constants/selectors";
import { ErrorCodes, ErrorMessages } from "../utilities/constants/types";
import { notification } from "../utilities/notification";

const { createElement, ManagedStyle, on, off } = FrankerFaceZ.utilities.dom;

class RateLimiter {
  constructor(maxAttempts, timeWindowMs) {
    this.maxAttempts = maxAttempts;
    this.timeWindowMs = timeWindowMs;
    this.attempts = [];
  }

  canAttempt() {
    const now = Date.now();
    this.attempts = this.attempts.filter(timestamp =>
      now - timestamp < this.timeWindowMs
    );

    if (this.attempts.length < this.maxAttempts) {
      this.attempts.push(now);
      return true;
    }

    return false;
  }

  reset() {
    this.attempts = [];
  }
};

export class Channel extends FrankerFaceZ.utilities.module.Module {
  constructor(...args) {
    super(...args);

    this.style = new ManagedStyle;

    this.inject("settings");
    this.inject("i18n");
    this.inject("chat");
    this.inject("site");
    this.inject("site.chat");
    this.inject("chat.actions");
    this.inject("site.fine");
    this.inject("site.player");
    this.inject("site.apollo");
    this.inject("site.router");
    this.inject("site.elemental");
    this.inject("site.twitch_data");

    // Initialize rate limiter - 4 attempts per 5 minutes
    this.rateLimiter = new RateLimiter(4, 5 * 60 * 1000);

    this.activityFeed = new ActivityFeed(this);
    this.bttvModeration = new BTTVModeration(this);
    this.clickableInspectLinks = new SteamInspect(this);
    this.chatCommands = new ChatCommands(this);
    this.popoutChatName = new PopoutChatName(this);
    this.customSeeking = new CustomSeeking(this);
    this.autoSkipMutedSegments = new AutoSkipMutedSegments(this);
    this.raidMessages = new RaidMessages(this);
    this.vodProgressBar = new ProgressBar(this);
    this.clickableModsVIPs = new ClickableModsVIPs(this);

    // Chat - Steam - Clickable Steam Inspect Links
    this.settings.add("addon.trubbel.channel.chat-steam", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel >> Chat",
        title: "Clickable Steam Inspect Links",
        description: "Enabling this will make [Steam inspect links](https://developer.valvesoftware.com/wiki/Steam_browser_protocol) clickable in chat.",
        component: "setting-check-box"
      },
      changed: val => {
        this.log.info("[Channel] Clickable Steam Inspect Links setting changed:", val);
        this.clickableInspectLinks.handleSettingChange(val);
      }
    });


    // Chat - Custom Commands - Enable Custom Commands
    this.settings.add("addon.trubbel.channel.chat-custom-commands", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel >> Chat - Commands",
        title: "Enable Custom Commands",
        component: "setting-check-box"
      },
      changed: () => this.chatCommands.handleCustomCommands()
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
      this.settings.add(`addon.trubbel.channel.chat.custom-command-${command}`, {
        default: false,
        requires: ["addon.trubbel.channel.chat-custom-commands"],
        process(ctx, val) {
          if (!ctx.get("addon.trubbel.channel.chat-custom-commands"))
            return false;
          return val;
        },
        ui: {
          sort: 1,
          path: "Add-Ons > Trubbel\u2019s Utilities > Channel >> Chat - Commands",
          title: command.charAt(0).toUpperCase() + command.slice(1),
          description: description,
          component: "setting-check-box"
        },
        changed: () => this.chatCommands.handleCustomCommands()
      });
    });


    // Channel - Chat - Moderation - Enable Right-Click Context Menu
    this.settings.add("addon.trubbel.channel.chat-moderation-bttv", {
      default: false,
      requires: ["context.moderator"],
      process(ctx, val) {
        return ctx.get("context.moderator") ? val : false;
      },
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel >> Chat - Moderation",
        title: "Enable Right-Click Context Menu",
        description: "This gives you the ability to use a right-click context menu, *similar to BetterTTV (BTTV)*, to moderate chat with. Ban, timeout, purge, delete.",
        component: "setting-check-box"
      },
      changed: val => {
        this.log.info("[Channel] BTTV moderation setting changed:", val);
        this.bttvModeration.handleSettingChange(val);
      }
    });

    // Channel - Chat - Moderation - BTTV Message Highlight
    this.settings.add("addon.trubbel.channel.chat-moderation-bttv-message-highlight", {
      default: "rgba(123, 1, 0, 0.3)",
      ui: {
        sort: 1,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel >> Chat - Moderation",
        title: "Message Highlight",
        description: "Highlight the message you right-click.",
        component: "setting-color-box"
      },
      changed: val => {
        this.log.info("[Channel] BTTV moderation highlight setting changed:", val);
        if (this.bttvModeration) {
          this.bttvModeration.updateHighlightCSS();
        }
      }
    });

    // Channel - Chat - Moderation - BTTV Right-Click Options
    this.settings.add("addon.trubbel.channel.chat-moderation-bttv-options", {
      default: "usernames",
      ui: {
        sort: 3,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel >> Chat - Moderation",
        title: "Right-Click Options",
        description: "`Usernames Only` -> Only on usernames\n\n`Entire Messages` -> Anywhere in a message\n\n`Entire Messages (except embeds and links)` -> Anywhere in a message, except rich embeds and links.",
        component: "setting-select-box",
        data: [
          { title: "Usernames Only", value: "usernames" },
          { title: "Entire Messages", value: "messages1" },
          { title: "Entire Messages (except embeds and links)", value: "messages2" },
        ]
      }
    });


    // Channel - Chat - Popout - Display Channel Name in Popout Chat
    this.settings.add("addon.trubbel.channel.chat-popout-channel_name", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel >> Chat - Popout",
        title: "Display Channel Name in Popout Chat",
        description: "Enabling this will replace the \"Stream Chat\" text above chat with the streamers username.",
        component: "setting-check-box"
      },
      changed: val => {
        this.log.info("[Channel] Popout chat name setting changed:", val);
        this.popoutChatName.handleSettingChange(val);
      }
    });


    // Channel - Chat - Viewer Cards - Clickable Raid Messages
    this.settings.add("addon.trubbel.channel.chat-clickable-raid-messages", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel >> Chat - Viewer Cards",
        title: "Clickable Raid Messages",
        description: "This lets you click on the usernames in raid messages to open up their viewer cards.",
        component: "setting-check-box"
      },
      changed: val => {
        this.log.info("[Channel] Clickable Raid setting changed:", val);
        this.raidMessages.handleSettingChange(val);
      }
    });

    // Channel - Chat - Viewer Cards - Clickable Usernames in /mods and /vips
    this.settings.add("addon.trubbel.channel.chat-clickable-mods-vips", {
      default: false,
      ui: {
        sort: 1,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel >> Chat - Viewer Cards",
        title: "Clickable Usernames in /mods and /vips",
        description: "This gives you the ability to click on the usernames when using the `/mods` and `/vips` commands, which will open up their viewer cards.\n\n**Notes:**\n\n• Might not work for every language.\n\n• There could be some instances where it might not apply correctly. Just send the command again, and it should work.",
        component: "setting-check-box"
      },
      changed: val => {
        this.log.info("[Channel] Clickable Usernames in /mods and /vips setting changed:", val);
        this.clickableModsVIPs.handleSettingChange(val);
      }
    });


    // Channel - Livestream - Enable Auto Mute or Pause Stream
    this.settings.add("addon.trubbel.channel.livestream-auto-pause-mute", {
      default: false,
      ui: {
        sort: 1,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel >> Livestream",
        title: "Enable Auto Mute or Pause Stream",
        description: "Automatically mute or pause the livestream when browsing the **Home**, **About**, **Schedule**, or **Videos**-tabs.",
        component: "setting-check-box"
      }
    });

    // Channel - Livestream - Auto Mute or Pause Stream - Options
    this.settings.add("addon.trubbel.channel.livestream-auto-pause-mute-option1", {
      default: "auto_mute",
      requires: ["addon.trubbel.channel.livestream-auto-pause-mute"],
      process(ctx, val) {
        if (!ctx.get("addon.trubbel.channel.livestream-auto-pause-mute"))
          return false;
        return val;
      },
      ui: {
        sort: 2,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel >> Livestream",
        title: "Options",
        component: "setting-select-box",
        data: [
          { title: "Auto Mute", value: "auto_mute" },
          { title: "Auto Pause", value: "auto_pause" }
        ]
      }
    });

    // Channel - Livestream - Auto Resume or Unmute
    this.settings.add("addon.trubbel.channel.livestream-auto-pause-mute-option2", {
      default: false,
      requires: ["addon.trubbel.channel.livestream-auto-pause-mute"],
      process(ctx, val) {
        if (!ctx.get("addon.trubbel.channel.livestream-auto-pause-mute"))
          return false;
        return val;
      },
      ui: {
        sort: 3,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel >> Livestream",
        title: "Auto Resume or Unmute",
        description: "Automatically resume or unmute livestream when you go back to it.",
        description: "This will automatically resume or unmute the livestream when you go back.",
        component: "setting-check-box"
      }
    });


    // Channel - Mod View - Enable Activity Feed Moderation
    this.settings.add("addon.trubbel.channel.mod-view-activity_feed", {
      default: false,
      requires: ["context.moderator"],
      process(ctx, val) {
        return ctx.get("context.moderator") ? val : false;
      },
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel >> Mod View",
        title: "Enable Activity Feed Moderation",
        description: "This will let you moderate through the activity feed, right clicking anywhere in the feed will bring up a menu.",
        component: "setting-check-box"
      },
      changed: val => {
        this.log.info("[Channel] Activity feed moderation setting changed:", val);
        this.activityFeed.handleSettingChange(val);
      }
    });

    // Channel - Mod View - Enable Auto Mod View
    this.settings.add("addon.trubbel.channel.mod-view-auto", {
      default: false,
      requires: ["context.moderator"],
      process(ctx, val) {
        return ctx.get("context.moderator") ? val : false;
      },
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel >> Mod View",
        title: "Enable Auto Mod View",
        description: "Automatically changes to mod view if you are a moderator of current channel.",
        component: "setting-check-box"
      },
      changed: () => this.navigate()
    });


    // Channel - Player - Enable Auto Reset on Errors
    this.settings.add("addon.trubbel.channel.player-auto-reset", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel >> Player",
        title: "Enable Auto Reset on Errors",
        description: "Automatically detects and resets the player when encountering errors like `\u00231000`, `\u00232000`, `\u00233000`, `\u00234000` or `\u00235000`.\n\n**Note:** This will only reset the player **four** times within **five** minutes, should you keep getting errors, it's likely something you have to fix yourself on your end.",
        component: "setting-check-box"
      },
      changed: val => {
        this.log.info("Auto Player Reset setting changed:", val);
      }
    });


    // Channel - VODs - Enable Custom Progress Bar
    this.settings.add("addon.trubbel.channel.vods-progress_bar", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel >> VODs - Progress",
        title: "Enable Custom Progress Bar",
        description: "Display a custom progress bar at the bottom of VODs, when player controls are not being displayed, works in both fullscreen and normal view.",
        component: "setting-check-box"
      },
      changed: val => {
        this.log.info("[Channel] VOD Progress Bar setting changed:", val);
        this.vodProgressBar.handleSettingChange(val);
      }
    });

    // Channel - VODs - Progress Bar Position
    this.settings.add("addon.trubbel.channel.vods-progress_bar-position", {
      default: "bottom",
      requires: ["addon.trubbel.channel.vods-progress_bar"],
      process(ctx, val) {
        if (!ctx.get("addon.trubbel.channel.vods-progress_bar"))
          return false;
        return val;
      },
      ui: {
        sort: 1,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel >> VODs - Progress",
        title: "Position",
        description: "Choose where to display the progress bar.",
        component: "setting-select-box",
        data: [
          { title: "Bottom", value: "bottom" },
          { title: "Top", value: "top" }
        ]
      },
      changed: val => {
        this.log.info("[Channel] VOD Progress Bar position changed:", val);
        this.vodProgressBar.updateCSS();
      }
    });


    // Channel - VODs - Enable Custom Seeking
    this.settings.add("addon.trubbel.channel.vods-seeking", {
      default: false,
      ui: {
        sort: 2,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel >> VODs - Seeking",
        title: "Enable Custom Seeking",
        description: "Twitch defaults the seeking to `10` seconds. Enabling this will let you set a custom amount below.",
        component: "setting-check-box"
      },
      changed: val => {
        this.log.info("[Channel] Custom seeking setting changed:", val);
        this.customSeeking.handleSeekingSettingChange(val);
      }
    });

    // Channel - VODs - Custom Seeking Amount
    this.settings.add("addon.trubbel.channel.vods-seeking-amount", {
      default: 30,
      ui: {
        sort: 3,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel >> VODs - Seeking",
        title: "Custom Seeking Amount",
        description: "How many seconds to seek when using arrow keys.",
        component: () => import("../components/main_menu/setting-slider.vue"),
        min: 1,
        max: 300,
        step: 1,
        unit: "s",
      },
      changed: val => {
        this.log.info("[Channel] Custom seeking amount changed:", val);
        this.customSeeking.handleSettingChange();
      }
    });

    // Channel - VODs - Enable Frame by Frame Seeking
    this.settings.add("addon.trubbel.channel.vods-seeking_fbf", {
      default: false,
      ui: {
        sort: 4,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel >> VODs - Seeking",
        title: "Enable Frame by Frame Seeking",
        description: "Use `,` to move backwards and `.` to go forward.\n\n**Note:** If the video isn't paused already when using these shortcuts, it will be automatically paused.",
        component: "setting-check-box"
      },
      changed: val => {
        this.log.info("[Channel] Frame by frame seeking setting changed:", val);
        this.customSeeking.handleFrameByFrameSettingChange(val);
      }
    });


    // Channel - VODs - Enable Auto-Skip Muted Segments
    this.settings.add("addon.trubbel.channel.vods-skip_muted_segments", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel >> VODs - Segments",
        title: "Enable Auto-Skip Muted Segments",
        description: "Automatically detects and skips muted segments.\n\nOnce you reach the start of a muted segment, this will automatically skip to the end of said muted segment.",
        component: "setting-check-box"
      },
      changed: val => {
        this.log.info("[Channel] Auto-skip muted segments setting changed:", val);
        this.autoSkipMutedSegments.handleSettingChange(val);
      }
    });

    // Channel - VODs - Enable Auto-Skip Notifications
    this.settings.add("addon.trubbel.channel.vods-skip_muted_segments-notification", {
      default: false,
      ui: {
        sort: 1,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel >> VODs - Segments",
        title: "Enable Auto-Skip Notifications",
        description: "Display a custom notification whenever a muted segment is skipped.",
        component: "setting-check-box"
      }
    });

    this.PlayerSource = this.fine.define(
      "player-source",
      n => n.setPlayerActive && n.props?.playerEvents && n.props?.mediaPlayerInstance
    );
  }

  async onEnable() {
    this.PlayerSource.ready((cls, instances) => {
      for (const inst of instances) {
        this.setupInstanceHandlers(inst);
      }
    });
    this.PlayerSource.on("mount", inst => {
      this.setupInstanceHandlers(inst);
    });

    this.router.on(":route", this.navigate, this);
    this.activityFeed.initialize();
    this.bttvModeration.initialize();
    this.clickableInspectLinks.initialize();
    this.chatCommands.initialize();
    this.popoutChatName.initialize();
    this.customSeeking.initialize();
    this.autoSkipMutedSegments.initialize();
    this.raidMessages.initialize();
    this.vodProgressBar.initialize();
    this.clickableModsVIPs.initialize();
  }

  async navigate() {
    isBackgroundTab(this);
    autoModView(this);
    this.activityFeed.handleNavigation();
    this.bttvModeration.handleNavigation();
    this.clickableInspectLinks.handleNavigation();
    this.chatCommands.handleNavigation();
    this.popoutChatName.handleNavigation();
    this.customSeeking.handleNavigation();
    this.autoSkipMutedSegments.handleNavigation();
    this.raidMessages.handleNavigation();
    this.vodProgressBar.handleNavigation();
    this.clickableModsVIPs.handleNavigation();
  }

  setupInstanceHandlers(inst) {
    const events = inst.props?.playerEvents;
    if (!events) return;

    if (inst._trubbel_handlers_set) return;
    inst._trubbel_handlers_set = true;

    const playerErrorHandler = async () => {
      if (!this.settings.get("addon.trubbel.channel.player-auto-reset")) return;

      // Always check rate limit
      if (!this.rateLimiter.canAttempt()) {
        this.log.warn("[Auto Player Reset] Rate limit exceeded. Please wait before trying again.");
        notification("", "[Auto Player Reset] Too many reset attempts. Please try refreshing the page manually.", 15000);
        return;
      }

      // Make sure the user didn't pause the video
      if (!inst?.props?.userTriggeredPause) {
        const player = inst?.props?.mediaPlayerInstance;
        const playerState = player?.core?.state?.state;

        // Continue if the player is paused and the player state is idle
        if (player?.isPaused() && playerState === "Idle") {
          const video = player?.core?.mediaSinkManager?.video;

          // Check if the player source is missing
          if (!video.getAttribute("src")) {
            const metadataElement = await this.site.awaitElement(PLAYER_ERROR_OVERLAY_SELECTOR);
            if (metadataElement) {
              const hasError = ErrorCodes.some(code => metadataElement.textContent.includes(code));
              if (hasError) {
                const errorCode = ErrorCodes.find(code => metadataElement.textContent.includes(code));
                this.emit("site.player:reset");
                this.log.info(`[Auto Player Reset] ${ErrorMessages[errorCode]} (Error #${errorCode})`);
                notification("", `[Auto Player Reset] ${ErrorMessages[errorCode]} (Error #${errorCode})`, 15000);
                this.emit("metadata:update", "player-stats");
              }
            }
          }
        }
      }
    };
    on(events, "PlayerError", playerErrorHandler);
  }
}