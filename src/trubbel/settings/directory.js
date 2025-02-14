const { createElement } = FrankerFaceZ.utilities.dom;

export class Directory extends FrankerFaceZ.utilities.module.Module {
  constructor(...args) {
    super(...args);

    this.inject("settings");
    this.inject("site.router");

    // Directory - Thumbnails - Enable Video Previews in Directory
    this.settings.add("addon.trubbel.directory.previews", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Directory >> Thumbnails",
        title: "Enable Video Previews in Directory",
        description: "Displays a video preview when hovering over channel thumbnails in directories.\n\n**Note:** If you keep seeing \"Click to unmute\", change permission for player.twitch.tv to allow audio/video autoplay.",
        component: "setting-check-box"
      },
      changed: () => this.handlePreviews()
    });

    // Directory - Thumbnails - Video Previews Quality
    this.settings.add("addon.trubbel.directory.preview-quality", {
      default: "160p30",
      requires: ["addon.trubbel.directory.previews"],
      process(ctx, val) {
        if (!ctx.get("addon.trubbel.directory.previews"))
          return false;
        return val;
      },
      ui: {
        sort: 1,
        path: "Add-Ons > Trubbel\u2019s Utilities > Directory >> Thumbnails",
        title: "Video Previews Quality",
        description: "Change the quality for the previews to be shown in.",
        component: "setting-select-box",
        data: [
          { title: "Auto", value: "auto" },
          { title: "Source", value: "chunked" },
          { title: "1080p60", value: "1080p60" },
          { title: "720p60", value: "720p60" },
          { title: "720p", value: "720p30" },
          { title: "480p", value: "480p30" },
          { title: "360p", value: "360p30" },
          { title: "160p", value: "160p30" }
        ]
      },
      changed: () => this.handlePreviews()
    });

    // Directory - Thumbnails - Enable Audio for Previews
    this.settings.add("addon.trubbel.directory.preview-audio", {
      default: false,
      requires: ["addon.trubbel.directory.previews"],
      process(ctx, val) {
        if (!ctx.get("addon.trubbel.directory.previews"))
          return false;
        return val;
      },
      ui: {
        sort: 2,
        path: "Add-Ons > Trubbel\u2019s Utilities > Directory >> Thumbnails",
        title: "Enable Audio for Previews",
        description: "Please keep in mind that this is using your default volume for streams. Some streams may be loud.",
        component: "setting-check-box"
      },
      changed: () => this.handlePreviews()
    });

    this.handleMouseEnter = this.handleMouseEnter.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);
  }

  onEnable() {
    this.settings.getChanges("addon.trubbel.directory.previews", () => this.handlePreviews());
    this.router.on(":route", this.checkNavigation, this);
    this.checkNavigation();
  }

  checkNavigation() {
    const currentMatch = this.router?.match?.[0];
    const oldMatch = this.router?.old_match?.[0];

    const isCurrentDirectory = currentMatch?.startsWith("/directory/") ?? false;
    const wasDirectory = oldMatch?.startsWith("/directory/") ?? false;

    if (isCurrentDirectory || wasDirectory) {
      if (wasDirectory && !isCurrentDirectory) {
        this.log.info("[Directory Previews] Leaving directory page, cleaning up event listeners");
        this.cleanupEventListeners();
      }

      if (isCurrentDirectory && this.settings.get("addon.trubbel.directory.previews")) {
        this.log.info("[Directory Previews] Entering directory page, setting up event listeners");
        this.setupEventListeners();
      }
    }
  }

  getVideoPreviewURL(login) {
    const quality = this.settings.get("addon.trubbel.directory.preview-quality");
    const muted = !this.settings.get("addon.trubbel.directory.preview-audio");

    const params = new URLSearchParams({
      channel: login,
      enableExtensions: false,
      parent: "twitch.tv",
      player: "popout",
      quality: quality,
      muted: muted,
      controls: false,
      disable_frankerfacez: true
    });
    return `https://player.twitch.tv/?${params}`;
  }

  createVideoPreview(container, streamer) {
    try {
      const iframe = createElement("iframe", {
        src: this.getVideoPreviewURL(streamer),
        style: {
          position: "absolute",
          top: "0",
          left: "0",
          width: "100%",
          height: "100%",
          border: "none",
          pointerEvents: "none",
          backgroundColor: "transparent"
        }
      });
      container.appendChild(iframe);
      return iframe;
    } catch (error) {
      this.log.error("[Directory Previews] Error creating preview:", error);
      return null;
    }
  }

  handleMouseEnter(event) {
    if (!this.settings.get("addon.trubbel.directory.previews")) return;
    // Skip thumbnails that are blurred
    if (event.target.closest(".blurred-preview-card-image")) return;

    const link = event.target.closest("[data-a-target=\"preview-card-image-link\"]");
    if (!link) return;

    const href = link.getAttribute("href");
    if (!/^\/(?!videos\/\d+$)[^/]+$/.test(href)) return;

    const streamer = href.substring(1);
    const container = link.querySelector(".tw-aspect");
    if (container && !container.querySelector("iframe")) {
      const iframe = this.createVideoPreview(container, streamer);
      if (iframe) {
        container.dataset.previewActive = "true";
      }
    }
  }

  handleMouseLeave(event) {
    const link = event.target.closest("[data-a-target=\"preview-card-image-link\"]");
    if (!link) return;
    if (link.contains(event.relatedTarget)) return;

    const container = link.querySelector(".tw-aspect");
    if (container && container.dataset.previewActive === "true") {
      const iframe = container.querySelector("iframe");
      if (iframe) {
        iframe.remove();
        delete container.dataset.previewActive;
      }
    }
  }

  setupEventListeners() {
    document.addEventListener("mouseenter", this.handleMouseEnter, true);
    document.addEventListener("mouseleave", this.handleMouseLeave, true);
  }

  cleanupEventListeners() {
    document.removeEventListener("mouseenter", this.handleMouseEnter, true);
    document.removeEventListener("mouseleave", this.handleMouseLeave, true);
  }

  handlePreviews() {
    const enabled = this.settings.get("addon.trubbel.directory.previews");
    if (enabled) {
      this.checkNavigation();
    } else {
      this.cleanupEventListeners();
    }
  }
}