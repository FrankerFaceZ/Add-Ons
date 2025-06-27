const { createElement, on, off } = FrankerFaceZ.utilities.dom;

export class CustomSeeking {
  constructor(parent) {
    this.parent = parent;
    this.isActive = false;
    this.frameByFrameActive = false;
    this.frameDuration = 1 / 30;

    this.handleKeyDown = this.handleKeyDown.bind(this);
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

  handleSeekingSettingChange(enabled) {
    if (enabled) {
      this.parent.log.info("[Custom Seeking] Enabling custom seeking");
      this.handleNavigation();
    } else {
      this.parent.log.info("[Custom Seeking] Disabling custom seeking");
      this.disableCustomSeeking();
    }
  }

  handleFrameByFrameSettingChange(enabled) {
    if (enabled) {
      this.parent.log.info("[Custom Seeking] Enabling frame by frame seeking");
      this.handleNavigation();
    } else {
      this.parent.log.info("[Custom Seeking] Disabling frame by frame seeking");
      this.disableFrameByFrame();
    }
  }

  handleSettingChange() {
    this.parent.log.info("[Custom Seeking] Settings updated");
  }

  handleNavigation() {
    const currentRoute = this.parent.router?.current_name;
    if (currentRoute === "video") {
      const seekingEnabled = this.parent.settings.get("addon.trubbel.channel.vods-seeking");
      const frameByFrameEnabled = this.parent.settings.get("addon.trubbel.channel.vods-seeking_fbf");

      if (seekingEnabled && !this.isActive) {
        this.parent.log.info("[Custom Seeking] Entering video page, enabling custom seeking");
        this.enableCustomSeeking();
      }

      if (frameByFrameEnabled && !this.frameByFrameActive) {
        this.parent.log.info("[Custom Seeking] Entering video page, enabling frame by frame");
        this.enableFrameByFrame();
      }
    } else {
      if (this.isActive) {
        this.parent.log.info("[Custom Seeking] Leaving video page, disabling custom seeking");
        this.disableCustomSeeking();
      }

      if (this.frameByFrameActive) {
        this.parent.log.info("[Custom Seeking] Leaving video page, disabling frame by frame");
        this.disableFrameByFrame();
      }
    }
  }

  enableCustomSeeking() {
    if (this.isActive) return;
    this.parent.log.info("[Custom Seeking] Setting up keydown event listener");
    on(document, "keydown", this.handleKeyDown, true);
    this.isActive = true;
  }

  disableCustomSeeking() {
    if (!this.isActive) return;
    this.parent.log.info("[Custom Seeking] Removing keydown event listener");
    off(document, "keydown", this.handleKeyDown, true);
    this.isActive = false;
  }

  enableFrameByFrame() {
    if (this.frameByFrameActive) return;
    this.parent.log.info("[Custom Seeking] Frame by frame navigation enabled");
    this.frameByFrameActive = true;
    if (!this.isActive) {
      on(document, "keydown", this.handleKeyDown, true);
    }
  }

  disableFrameByFrame() {
    if (!this.frameByFrameActive) return;
    this.parent.log.info("[Custom Seeking] Frame by frame navigation disabled");
    this.frameByFrameActive = false;
    if (!this.isActive) {
      off(document, "keydown", this.handleKeyDown, true);
    }
  }

  cleanup() {
    this.disableCustomSeeking();
    this.disableFrameByFrame();
  }

  getPlayer() {
    return document.querySelector("video");
  }

  handleKeyDown(event) {
    const currentRoute = this.parent.router?.current_name;
    if (currentRoute !== "video") return;
    if (event.ctrlKey || event.shiftKey || event.altKey) return;

    const player = this.getPlayer();
    if (!player) {
      this.parent.log.debug("[Custom Seeking] No video player found");
      return;
    }

    let handled = false;

    if (this.isActive && this.parent.settings.get("addon.trubbel.channel.vods-seeking")) {
      if (event.code === "ArrowRight" || event.code === "ArrowLeft") {
        const seekAmount = this.parent.settings.get("addon.trubbel.channel.vods-seeking-amount");

        if (event.code === "ArrowRight") {
          player.currentTime += seekAmount;
          this.parent.log.debug(`[Custom Seeking] Seeking forward ${seekAmount} seconds`);
        } else if (event.code === "ArrowLeft") {
          player.currentTime = Math.max(0, player.currentTime - seekAmount);
          this.parent.log.debug(`[Custom Seeking] Seeking backward ${seekAmount} seconds`);
        }

        handled = true;
      }
    }

    if (this.frameByFrameActive && this.parent.settings.get("addon.trubbel.channel.vods-seeking_fbf")) {
      if (event.key === "," || event.key === ".") {
        // Pause the video if it's playing
        const wasPlaying = !player.paused;
        if (wasPlaying) {
          player.pause();
          this.parent.log.debug("[Custom Seeking] Auto-paused video for frame navigation");
        }

        // Move one frame backward or forward
        if (event.key === ",") {
          player.currentTime = Math.max(0, player.currentTime - this.frameDuration);
          this.parent.log.debug("[Custom Seeking] Frame backward");
        } else if (event.key === ".") {
          player.currentTime += this.frameDuration;
          this.parent.log.debug("[Custom Seeking] Frame forward");
        }

        handled = true;
      }
    }

    if (handled) {
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  }
}