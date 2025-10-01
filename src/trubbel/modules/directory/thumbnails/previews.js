const { createElement, on, off } = FrankerFaceZ.utilities.dom;

export default class Previews {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.router = parent.router;
    this.log = parent.log;

    this.isActive = false;

    this.handleMouseEnter = this.handleMouseEnter.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);
  }

  initialize() {
    const enabled = this.settings.get("addon.trubbel.directory.thumbnails.preview");
    if (enabled) {
      this.handleNavigation();
    } else {
      this.cleanupEventListeners();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.log.info("[Directory Previews] Enabling preview handler");
      this.handleNavigation();
    } else {
      this.log.info("[Directory Previews] Disabling preview handler");
      this.cleanupEventListeners();
    }
  }

  handleNavigation() {
    const currentMatch = this.router?.location;
    if (currentMatch?.startsWith("/directory/")) {
      const enabled = this.settings.get("addon.trubbel.directory.thumbnails.preview");
      if (enabled && !this.isActive) {
        this.log.info("[Directory Previews] Entering directory page, enabling preview handler");
        this.setupEventListeners();
        this.isActive = true;
      }
    } else {
      if (this.isActive) {
        this.log.info("[Directory Previews] Leaving directory page, disabling preview handler");
        this.cleanupEventListeners();
        this.isActive = false;
      }
    }
  }

  getVideoPreviewURL(login) {
    const quality = this.settings.get("addon.trubbel.directory.thumbnails.preview.quality");
    const muted = !this.settings.get("addon.trubbel.directory.thumbnails.preview.audio");

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
      const iframe = (
        <iframe
          src={this.getVideoPreviewURL(streamer)}
          style={{
            position: "absolute",
            top: "0",
            left: "0",
            width: "100%",
            height: "100%",
            border: "none",
            pointerEvents: "none",
            backgroundColor: "transparent"
          }}
        />
      );

      container.appendChild(iframe);
      return iframe;
    } catch (error) {
      this.log.error("[Directory Previews] Error creating preview:", error);
      return null;
    }
  }

  handleMouseEnter(event) {
    if (!this.settings.get("addon.trubbel.directory.thumbnails.preview")) return;

    if (!event.target || typeof event.target.closest !== "function") return;
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
    if (this.isActive) return;
    on(document, "mouseenter", this.handleMouseEnter, true);
    on(document, "mouseleave", this.handleMouseLeave, true);
  }

  cleanupEventListeners() {
    off(document, "mouseenter", this.handleMouseEnter, true);
    off(document, "mouseleave", this.handleMouseLeave, true);
    this.isActive = false;
  }
}