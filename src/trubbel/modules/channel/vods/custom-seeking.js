const { on, off } = FrankerFaceZ.utilities.dom;

export default class CustomSeeking {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.router = parent.router;
    this.log = parent.log;

    this.isActive = false;
    this.frameByFrameActive = false;
    this.frameDuration = 1 / 60;

    this.handleCustomSeekingKeyDown = this.handleCustomSeekingKeyDown.bind(this);
    this.handleFrameByFrameKeyDown = this.handleFrameByFrameKeyDown.bind(this);
    this.handleNavigation = this.handleNavigation.bind(this);
    this.enableCustomSeeking = this.enableCustomSeeking.bind(this);
    this.disableCustomSeeking = this.disableCustomSeeking.bind(this);
    this.enableFrameByFrame = this.enableFrameByFrame.bind(this);
    this.disableFrameByFrame = this.disableFrameByFrame.bind(this);
    this.getPlayer = this.getPlayer.bind(this);
  }

  initialize() {
    this.handleNavigation();
  }

  handleCustomSeekingChange(enabled) {
    if (enabled) {
      this.log.info("[Custom Seeking] Enabling custom seeking");
      this.handleNavigation();
    } else {
      this.log.info("[Custom Seeking] Disabling custom seeking");
      this.disableCustomSeeking();
    }
  }

  handleFrameByFrameChange(enabled) {
    if (enabled) {
      this.log.info("[Custom Seeking] Enabling frame by frame seeking");
      this.handleNavigation();
    } else {
      this.log.info("[Custom Seeking] Disabling frame by frame seeking");
      this.disableFrameByFrame();
    }
  }

  handleNavigation() {
    const currentRoute = this.router?.current_name;
    if (currentRoute === "video") {
      const seekingEnabled = this.settings.get("addon.trubbel.channel.vods.seeking");
      const frameByFrameEnabled = this.settings.get("addon.trubbel.channel.vods.seeking.fbf");

      if (seekingEnabled && !this.isActive) {
        this.log.info("[Custom Seeking] Entering video page, enabling custom seeking");
        this.enableCustomSeeking();
      }

      if (frameByFrameEnabled && !this.frameByFrameActive) {
        this.log.info("[Custom Seeking] Entering video page, enabling frame by frame");
        this.enableFrameByFrame();
      }
    } else {
      if (this.isActive) {
        this.log.info("[Custom Seeking] Leaving video page, disabling custom seeking");
        this.disableCustomSeeking();
      }

      if (this.frameByFrameActive) {
        this.log.info("[Custom Seeking] Leaving video page, disabling frame by frame");
        this.disableFrameByFrame();
      }
    }
  }

  enableCustomSeeking() {
    if (this.isActive) return;
    this.log.info("[Custom Seeking] Setting up custom seeking keydown event listener");
    on(document, "keydown", this.handleCustomSeekingKeyDown, true);
    this.isActive = true;
  }

  disableCustomSeeking() {
    if (!this.isActive) return;
    this.log.info("[Custom Seeking] Removing custom seeking keydown event listener");
    off(document, "keydown", this.handleCustomSeekingKeyDown, true);
    this.isActive = false;
  }

  enableFrameByFrame() {
    if (this.frameByFrameActive) return;
    this.log.info("[Custom Seeking] Setting up frame by frame keydown event listener");
    on(document, "keydown", this.handleFrameByFrameKeyDown, true);
    this.frameByFrameActive = true;
  }

  disableFrameByFrame() {
    if (!this.frameByFrameActive) return;
    this.log.info("[Custom Seeking] Removing frame by frame keydown event listener");
    off(document, "keydown", this.handleFrameByFrameKeyDown, true);
    this.frameByFrameActive = false;
  }

  getPlayer() {
    return document.querySelector("video");
  }

  handleCustomSeekingKeyDown(event) {
    const currentRoute = this.router?.current_name;
    if (currentRoute !== "video") return;
    if (event.ctrlKey || event.shiftKey || event.altKey) return;

    if (event.code === "ArrowRight" || event.code === "ArrowLeft") {
      const player = this.getPlayer();
      if (!player) {
        this.log.info("[Custom Seeking] No video player found");
        return;
      }

      const seekAmount = this.settings.get("addon.trubbel.channel.vods.seeking.amount");

      if (event.code === "ArrowRight") {
        player.currentTime += seekAmount;
        this.log.info(`[Custom Seeking] Seeking forward ${seekAmount} seconds`);
      } else if (event.code === "ArrowLeft") {
        player.currentTime = Math.max(0, player.currentTime - seekAmount);
        this.log.info(`[Custom Seeking] Seeking backward ${seekAmount} seconds`);
      }

      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  }

  handleFrameByFrameKeyDown(event) {
    const currentRoute = this.router?.current_name;
    if (currentRoute !== "video") return;
    if (event.ctrlKey || event.shiftKey || event.altKey) return;

    if (event.key === "," || event.key === ".") {
      const player = this.getPlayer();
      if (!player) {
        this.log.info("[Custom Seeking] No video player found");
        return;
      }

      const wasPlaying = !player.paused;
      if (wasPlaying) {
        player.pause();
        this.log.info("[Custom Seeking] Auto-paused video for frame navigation");
      }

      if (event.key === ",") {
        player.currentTime = Math.max(0, player.currentTime - this.frameDuration);
        this.log.info("[Custom Seeking] Frame backward");
      } else if (event.key === ".") {
        player.currentTime += this.frameDuration;
        this.log.info("[Custom Seeking] Frame forward");
      }

      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  }
}