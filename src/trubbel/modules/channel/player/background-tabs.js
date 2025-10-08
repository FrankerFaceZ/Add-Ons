import { notification } from "../../../utilities/notification";
import { BAD_USERS } from "../../../utilities/constants/types";

export default class BackgroundTabs {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.router = parent.router;
    this.site = parent.site;
    this.log = parent.log;

    this.isActive = false;
    this.currentChannel = null;

    this.handleRouteChange = this.handleRouteChange.bind(this);
    this.enableBackgroundTabs = this.enableBackgroundTabs.bind(this);
    this.disableBackgroundTabs = this.disableBackgroundTabs.bind(this);
    this.handleSettingChange = this.handleSettingChange.bind(this);
    this.processRouteChange = this.processRouteChange.bind(this);
  }

  initialize() {
    const enabled = this.settings.get("addon.trubbel.channel.player.livestream.auto_pause_mute");
    if (enabled) {
      this.router.on(":route", this.handleRouteChange);
      this.handleRouteChange(this.router.current, this.router.match);
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.log.info("[Background Tabs] Enabling auto mute/pause functionality");
      this.router.on(":route", this.handleRouteChange);
      this.handleRouteChange(this.router.current, this.router.match);
    } else {
      this.log.info("[Background Tabs] Disabling auto mute/pause functionality");
      this.router.off(":route", this.handleRouteChange);
      this.disableBackgroundTabs();
    }
  }

  handleRouteChange(route, match) {
    const chatRoutes = this.site.constructor.CHAT_ROUTES;
    const currentRoute = route?.name;

    let channelName = null;
    if (match && match[1]) {
      channelName = match[1];
    }

    this.log.debug(`[Background Tabs] Route change: ${currentRoute}, channel: ${channelName}`);

    const isInChannelRoute = chatRoutes.includes(currentRoute) &&
      channelName &&
      !BAD_USERS.includes(channelName);

    const channelChanged = this.currentChannel !== channelName;

    if (isInChannelRoute) {
      if (!this.isActive || channelChanged) {
        this.currentChannel = channelName;

        if (channelChanged && this.isActive) {
          this.log.info(`[Background Tabs] Changed to channel: ${channelName}`);
        } else {
          this.log.info(`[Background Tabs] Entering channel: ${channelName}, enabling background tabs handler`);
          this.enableBackgroundTabs();
        }
      }

      if (this.isActive && !channelChanged) {
        this.processRouteChange();
      }
    } else {
      if (this.isActive) {
        this.log.info(`[Background Tabs] Leaving channel context, disabling background tabs handler`);
        this.currentChannel = null;
        this.disableBackgroundTabs();
      }
    }
  }

  enableBackgroundTabs() {
    if (this.isActive) return;

    this.log.info("[Background Tabs] Setting up background tabs functionality");
    this.isActive = true;
  }

  async processRouteChange() {
    if (!this.settings.get("addon.trubbel.channel.player.livestream.auto_pause_mute")) {
      return;
    }

    const option = this.settings.get("addon.trubbel.channel.player.livestream.auto_pause_mute_option1");
    const shouldAutoResume = this.settings.get("addon.trubbel.channel.player.livestream.auto_pause_mute_option2");

    const currentName = this.router?.current?.name;
    const oldName = this.router?.old_name;

    this.log.debug(`[Background Tabs] Route change within channel: ${oldName} -> ${currentName}`);

    const isGoingToBackgroundTab =
      oldName === "user" &&
      (currentName === "user-home" ||
        currentName === "user-videos" ||
        currentName === "user-clips" ||
        currentName === "user-about" ||
        currentName === "user-schedule" ||
        currentName === null);

    const isReturningToStream =
      currentName === "user" &&
      (oldName === "user-home" ||
        oldName === "user-videos" ||
        oldName === "user-clips" ||
        oldName === "user-about" ||
        oldName === "user-schedule" ||
        oldName === null);

    if (isGoingToBackgroundTab) {
      this.log.info(`[Background Tabs] Detected navigation to background tab within channel`);
      await this.handleBackgroundNavigation(option);
    }

    if (isReturningToStream && shouldAutoResume) {
      this.log.info("[Background Tabs] Detected navigation back to stream within channel");
      await this.handleStreamReturn(option);
    }
  }

  async handleBackgroundNavigation(option) {
    try {
      const video = await this.site.awaitElement("video", document, 5000);

      if (!video.paused) {
        if (option === "mute" && !video.muted) {
          video.muted = true;
          this.log.info("[Background Tabs] Muted background player");
          notification("🔇", "[Auto Stream Mute] Muted background player");
        } else if (option === "pause") {
          video.pause();
          this.log.info("[Background Tabs] Paused background player");
          notification("⏸️", "[Auto Stream Pause] Paused background player");
        }
      }
    } catch (error) {
      this.log.warn("[Background Tabs] No video element found:", error);
    }
  }

  async handleStreamReturn(option) {
    try {
      const video = await this.site.awaitElement("video", document, 5000);

      if (option === "mute" && video.muted) {
        video.muted = false;
        this.log.info("[Background Tabs] Unmuted player");
        notification("🔊", "[Auto Stream Mute] Unmuted player");
      } else if (option === "pause" && video.paused) {
        video.play();
        this.log.info("[Background Tabs] Resumed player");
        notification("▶️", "[Auto Stream Pause] Resumed player");
      }
    } catch (error) {
      this.log.warn("[Background Tabs] No video element found:", error);
    }
  }

  disableBackgroundTabs() {
    if (!this.isActive) return;

    this.log.info("[Background Tabs] Removing background tabs functionality");
    this.isActive = false;
  }
}