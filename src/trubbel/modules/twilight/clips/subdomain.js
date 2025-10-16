const { createElement, on, off } = FrankerFaceZ.utilities.dom;
const { sleep } = FrankerFaceZ.utilities.object;

export default class ClipsSubdomain {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.router = parent.router;
    this.site = parent.site;
    this.log = parent.log;

    this.isActive = false;
    this.processedCards = new WeakSet();
    this.observer = null;

    this.handleNavigation = this.handleNavigation.bind(this);
    this.handleSettingChange = this.handleSettingChange.bind(this);
    this.checkNodeForNewClipCards = this.checkNodeForNewClipCards.bind(this);
  }

  initialize() {
    const enabled = this.settings.get("addon.trubbel.twilight.clips.subdomain");
    if (enabled) {
      this.handleNavigation();
    } else {
      this.disableClipsSubdomain();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.log.info("[Clips Subdomain] Enabling clips subdomain handler");
      this.handleNavigation();
    } else {
      this.log.info("[Clips Subdomain] Disabling clips subdomain handler");
      this.disableClipsSubdomain();
    }
  }

  handleNavigation() {
    const router = this.router?.current;

    if (router?.name === "clip-page" && router?.domain === "clips.twitch.tv") {
      const enabled = this.settings.get("addon.trubbel.twilight.clips.subdomain");
      if (enabled && !this.isActive) {
        this.log.info("[Clips Subdomain] Entering clips page, enabling subdomain handler");
        this.enableClipsSubdomain();
      }
    } else {
      if (this.isActive) {
        this.log.info("[Clips Subdomain] Leaving clips page, disabling subdomain handler");
        this.disableClipsSubdomain();
      }
    }
  }

  async enableClipsSubdomain() {
    if (this.isActive) return;

    this.log.info("[Clips Subdomain] Setting up clips subdomain handling");
    this.isActive = true;

    // wait for clips
    await sleep(1000);

    this.setupClickHandlers();
    this.startObserver();
  }

  disableClipsSubdomain() {
    if (!this.isActive) return;

    this.log.info("[Clips Subdomain] Removing clips subdomain handling");
    this.isActive = false;

    this.processedCards = new WeakSet();
    this.removeAllClickListeners();
    this.stopObserver();
  }

  startObserver() {
    if (this.observer) {
      this.stopObserver();
    }

    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.checkNodeForNewClipCards(node);
            }
          });
        }
      });
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  stopObserver() {
    if (this.observer) {
      this.log.info("[Clips Subdomain] Stopping MutationObserver");
      this.observer.disconnect();
      this.observer = null;
    }
  }

  checkNodeForNewClipCards(node) {
    if (!this.isActive) return;

    let foundNewCards = 0;

    if (node.matches && node.matches("[data-test-selector=\"shelf-card-selector\"] article")) {
      if (!this.processedCards.has(node)) {
        this.processClipCard(node);
        foundNewCards++;
        this.log.info("[Clips Subdomain] Found new clip card (direct match)");
      }
    }

    if (node.querySelectorAll) {
      const clipCards = node.querySelectorAll("[data-test-selector=\"shelf-card-selector\"] article");
      if (clipCards.length > 0) {
        clipCards.forEach(card => {
          if (!this.processedCards.has(card)) {
            this.processClipCard(card);
            foundNewCards++;
          }
        });
        if (foundNewCards > 0) {
          this.log.info(`[Clips Subdomain] Found ${foundNewCards} new clip cards inside added node`);
        }
      }
    }

    if (foundNewCards > 0) {
      this.log.info(`[Clips Subdomain] Processed ${foundNewCards} new clip cards from observer`);
    }
  }

  setupClickHandlers() {
    if (!this.isActive) return;

    const clipCards = document.querySelectorAll("[data-test-selector=\"shelf-card-selector\"] article");
    clipCards.forEach(card => this.processClipCard(card));
  }

  processClipCard(article) {
    if (!this.isActive || this.processedCards.has(article)) return;

    this.processedCards.add(article);

    const links = article.querySelectorAll("a[href*=\"/clip/\"]");
    links.forEach((link, index) => {
      const originalHref = link.href;
      this.log.info(`[Clips Subdomain] Link ${index}: ${originalHref}`);

      const slug = this.extractClipSlug(originalHref);

      if (slug) {
        this.log.info(`[Clips Subdomain] Extracted slug: ${slug} from ${originalHref}`);
        this.addClickHandler(link, slug, originalHref);
      } else {
        this.log.warn(`[Clips Subdomain] Could not extract slug from: ${originalHref}`);
      }
    });
  }

  extractClipSlug(url) {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname !== "www.twitch.tv" || !urlObj.pathname.includes("/clip/")) {
        return null;
      }

      const pathParts = urlObj.pathname.split("/");
      const clipIndex = pathParts.indexOf("clip");
      if (clipIndex === -1 || clipIndex + 1 >= pathParts.length) {
        this.log.warn("[Clips Subdomain] Could not find clip slug in path:", urlObj.pathname);
        return null;
      }

      const slug = pathParts[clipIndex + 1];
      if (!slug) {
        this.log.warn("[Clips Subdomain] Empty clip slug in:", url);
        return null;
      }

      return slug;

    } catch (error) {
      this.log.error("[Clips Subdomain] Error extracting slug from URL:", url, error);
      return null;
    }
  }

  addClickHandler(link, slug, originalHref) {
    if (!this.isActive || link._trubbel_clips_handler) {
      if (link._trubbel_clips_handler) {
        this.log.info(`[Clips Subdomain] Handler already exists for: ${originalHref}`);
      }
      return;
    }

    const clickHandler = (event) => {
      if (!this.isActive) return;

      if (event.button !== 0 || event.ctrlKey || event.shiftKey || event.metaKey || event.altKey) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      try {
        this.router.navigate("clip-page", { slug: slug });
      } catch (error) {
        this.log.error("[Clips Subdomain] Error with navigation:", error);
        window.location.href = `https://clips.twitch.tv/${slug}`;
      }
    };

    on(link, "click", clickHandler, true);
    link._trubbel_clips_handler = clickHandler;
  }

  removeAllClickListeners() {
    const clipCards = document.querySelectorAll("[data-test-selector=\"shelf-card-selector\"] article");

    clipCards.forEach(card => {
      const links = card.querySelectorAll("a[href*=\"/clip/\"]");
      links.forEach(link => {
        if (link._trubbel_clips_handler) {
          off(link, "click", link._trubbel_clips_handler, true);
          delete link._trubbel_clips_handler;
        }
      });
    });

    this.log.info("[Clips Subdomain] Removed all click listeners");
  }
}