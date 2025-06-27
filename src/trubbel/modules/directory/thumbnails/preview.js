const { createElement, on, off } = FrankerFaceZ.utilities.dom;

export class ThumbnailPreviews {
  constructor(parent) {
    this.parent = parent;

    this.handleMouseEnter = this.handleMouseEnter.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);
  }

  initialize() {
    const enabled = this.parent.settings.get("addon.trubbel.directory.thumbnail-preview");
    if (enabled) {
      this.handleNavigation();
    }
  }

  handleNavigation() {
    const currentMatch = this.parent.router?.match?.[0];
    const oldMatch = this.parent.router?.old_match?.[0];

    const isCurrentDirectory = currentMatch?.startsWith("/directory/") ?? false;
    const wasDirectory = oldMatch?.startsWith("/directory/") ?? false;

    if (isCurrentDirectory || wasDirectory) {
      if (wasDirectory && !isCurrentDirectory) {
        this.parent.log.info("[Directory Previews] Leaving directory page, cleaning up event listeners");
        this.cleanupEventListeners();
      }

      if (isCurrentDirectory && this.parent.settings.get("addon.trubbel.directory.thumbnail-preview")) {
        this.parent.log.info("[Directory Previews] Entering directory page, setting up event listeners");
        this.setupEventListeners();
      }
    }
  }

  getVideoPreviewURL(login) {
    const quality = this.parent.settings.get("addon.trubbel.directory.thumbnail-preview-quality");
    const muted = !this.parent.settings.get("addon.trubbel.directory.thumbnail-preview-audio");

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
      this.parent.log.error("[Directory Previews] Error creating preview:", error);
      return null;
    }
  }

  handleMouseEnter(event) {
    if (!this.parent.settings.get("addon.trubbel.directory.thumbnail-preview")) return;

    // Stop Chromium-based browsers console spam
    if (!event.target || typeof event.target.closest !== "function") return;

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
    // Stop Chromium-based browsers console spam
    if (!event.target || typeof event.target.closest !== "function") return;

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
    on(document, "mouseenter", this.handleMouseEnter, true);
    on(document, "mouseleave", this.handleMouseLeave, true);
  }

  cleanupEventListeners() {
    off(document, "mouseenter", this.handleMouseEnter, true);
    off(document, "mouseleave", this.handleMouseLeave, true);
  }

  handlePreviews() {
    const enabled = this.parent.settings.get("addon.trubbel.directory.thumbnail-preview");
    if (enabled) {
      this.handleNavigation();
    } else {
      this.cleanupEventListeners();
    }
  }

  handleSettingChange() {
    this.handlePreviews();
  }
}