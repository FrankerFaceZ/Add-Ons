const { createElement } = FrankerFaceZ.utilities.dom;

export default class ProgressBar {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.router = parent.router;
    this.style = parent.style;
    this.site = parent.site;
    this.log = parent.log;

    this.isActive = false;
    this.progressOverlay = null;
    this.progressBar = null;
    this.progressFill = null;
    this.updateInterval = null;
    this.observer = null;

    this.initialize = this.initialize.bind(this);
    this.handleSettingChange = this.handleSettingChange.bind(this);
    this.handleNavigation = this.handleNavigation.bind(this);
    this.enableProgressBar = this.enableProgressBar.bind(this);
    this.disableProgressBar = this.disableProgressBar.bind(this);
    this.createProgressOverlay = this.createProgressOverlay.bind(this);
    this.updateProgress = this.updateProgress.bind(this);
    this.checkPlayerControlsVisibility = this.checkPlayerControlsVisibility.bind(this);
    this.setupObserver = this.setupObserver.bind(this);
    this.waitForPlayerToLoad = this.waitForPlayerToLoad.bind(this);
    this.cleanup = this.cleanup.bind(this);
  }

  initialize() {
    const enabled = this.settings.get("addon.trubbel.channel.vods.progress_bar");
    if (enabled) {
      this.handleNavigation();
    } else {
      this.disableProgressBar();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.log.info("[VOD Progress Bar] Enabling progress bar");
      this.handleNavigation();
    } else {
      this.log.info("[VOD Progress Bar] Disabling progress bar");
      this.disableProgressBar();
    }
  }

  async handleNavigation() {
    const currentRoute = this.router?.current?.name;
    if (currentRoute === "video") {
      const enabled = this.settings.get("addon.trubbel.channel.vods.progress_bar");
      if (enabled && !this.isActive) {
        this.log.info("[VOD Progress Bar] Entering video page, enabling progress bar");
        await this.waitForPlayerToLoad();
      }
    } else {
      if (this.isActive) {
        this.log.info("[VOD Progress Bar] Leaving video page, disabling progress bar");
        this.disableProgressBar();
      }
    }
  }

  async enableProgressBar() {
    if (this.isActive) return;
    this.log.info("[VOD Progress Bar] Setting up progress bar");
    await this.createProgressOverlay();
    await this.setupObserver();
    this.isActive = true;
    this.updateCSS();
  }

  disableProgressBar() {
    if (!this.isActive) return;
    this.log.info("[VOD Progress Bar] Cleaning up progress bar");
    this.cleanup();
    this.isActive = false;
    this.updateCSS();
  }

  async waitForPlayerToLoad() {
    try {
      await this.site.awaitElement("[data-a-target=\"player-controls\"]", document.documentElement, 10000);
      await this.site.awaitElement("[data-a-target=\"player-seekbar-current-time\"]", document.documentElement, 5000);
      await this.site.awaitElement("[data-a-target=\"player-seekbar-duration\"]", document.documentElement, 5000);
      await this.site.awaitElement(".video-player__container", document.documentElement, 5000);

      this.log.info("[VOD Progress Bar] All required player elements found");
      this.enableProgressBar();
    } catch (error) {
      this.log.warn("[VOD Progress Bar] Failed to find required player elements:", error);
    }
  }

  async createProgressOverlay() {
    if (this.progressOverlay) return;
    try {
      const playerContainer = await this.site.awaitElement(".video-player__container", document.documentElement, 5000);

      this.progressOverlay = createElement("div", {
        className: "vod-progress-overlay"
      });

      const computedStyle = window.getComputedStyle(playerContainer);
      if (computedStyle.position === "static") {
        playerContainer.style.position = "relative";
      }

      this.progressBar = createElement("div", {
        className: "vod-progress-bar"
      });

      this.progressFill = createElement("div", {
        className: "vod-progress-fill"
      });

      this.progressBar.appendChild(this.progressFill);
      this.progressOverlay.appendChild(this.progressBar);
      playerContainer.appendChild(this.progressOverlay);

      this.log.info("[VOD Progress Bar] Progress bar created and positioned in video player container");
    } catch (error) {
      this.log.warn("[VOD Progress Bar] Failed to find video player container:", error);
    }
  }

  parseTimeToSeconds(timeString) {
    if (!timeString) return 0;

    const parts = timeString.split(":").reverse();
    let seconds = 0;

    for (let i = 0; i < parts.length; i++) {
      seconds += parseInt(parts[i] || 0) * Math.pow(60, i);
    }

    return seconds;
  }

  updateProgress() {
    try {
      const currentTimeElement = document.querySelector("[data-a-target=\"player-seekbar-current-time\"]");
      const durationElement = document.querySelector("[data-a-target=\"player-seekbar-duration\"]");

      if (!currentTimeElement || !durationElement) {
        const videoElement = document.querySelector("video");
        if (videoElement && videoElement.duration) {
          const progress = (videoElement.currentTime / videoElement.duration) * 100;
          this.progressFill.style.width = `${Math.min(100, Math.max(0, progress))}%`;
        }
        return;
      }

      const currentTime = currentTimeElement.textContent.trim();
      const duration = durationElement.textContent.trim();

      if (currentTime && duration) {
        const currentSeconds = this.parseTimeToSeconds(currentTime);
        const totalSeconds = this.parseTimeToSeconds(duration);

        if (totalSeconds > 0) {
          const progress = (currentSeconds / totalSeconds) * 100;
          this.progressFill.style.width = `${Math.min(100, Math.max(0, progress))}%`;
        }
      }
    } catch (error) {
      this.log.warn("[VOD Progress Bar] Error updating progress:", error);
    }
  }

  checkPlayerControlsVisibility() {
    const playerControls = document.querySelector("[data-a-target=\"player-controls\"]");
    if (!playerControls) return false;

    const isVisible = playerControls.getAttribute("data-a-visible") === "true";

    if (this.progressOverlay) {
      if (isVisible) {
        this.progressOverlay.classList.remove("visible");
        this.progressOverlay.style.display = "none";
        if (this.updateInterval) {
          clearInterval(this.updateInterval);
          this.updateInterval = null;
        }
      } else {
        this.progressOverlay.classList.add("visible");
        this.progressOverlay.style.display = "block";
        if (!this.updateInterval) {
          this.updateProgress();
          this.updateInterval = setInterval(this.updateProgress, 1000);
        }
      }
    }

    return isVisible;
  }

  async setupObserver() {
    if (this.observer) this.observer.disconnect();

    try {
      const playerControls = await this.site.awaitElement("[data-a-target=\"player-controls\"]", document.documentElement, 5000);

      this.observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === "attributes" && mutation.attributeName === "data-a-visible") {
            this.checkPlayerControlsVisibility();
          }
        });
      });

      this.observer.observe(playerControls, {
        attributes: true,
        attributeFilter: ["data-a-visible"]
      });

      this.checkPlayerControlsVisibility();
    } catch (error) {
      this.log.warn("[VOD Progress Bar] Failed to find player controls for observer:", error);
    }
  }

  cleanup() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    if (this.progressOverlay) {
      this.progressOverlay.remove();
      this.progressOverlay = null;
      this.progressBar = null;
      this.progressFill = null;
    }
  }

  updateCSS() {
    if (this.settings.get("addon.trubbel.channel.vods.progress_bar")) {
      const position = this.settings.get("addon.trubbel.channel.vods.progress_bar.position");
      this.style.set("vod-progress-bar", `
        .vod-progress-overlay {
          position: absolute;
          ${position === "top" ? "top: 0;" : "bottom: 0;"}
          left: 0;
          right: 0;
          width: 100%;
          height: 4px;
          z-index: 9999;
          display: none;
          pointer-events: none;
        }
        .vod-progress-bar {
          width: 100%;
          height: 100%;
          background: rgba(255, 255, 255, 0.3);
          position: relative;
        }
        .vod-progress-fill {
          height: 100%;
          background: rgb(169, 112, 255);
          transition: width 0.1s ease;
          width: 0%;
        }
        .vod-progress-overlay.visible {
          display: block !important;
        }
      `);
    } else {
      this.style.delete("vod-progress-bar");
    }
  }
}