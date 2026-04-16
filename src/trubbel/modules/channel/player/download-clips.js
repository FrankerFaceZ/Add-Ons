import GET_CLIP from "../../../utilities/graphql/download-clip.gql";

const { createElement, ManagedStyle, on, off, setChildren } = FrankerFaceZ.utilities.dom;

export default class DownloadClips {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.router = parent.router;
    this.player = parent.player;
    this.fine = parent.fine;
    this.site = parent.site;
    this.log = parent.log;

    this.style = new ManagedStyle;
    this.isActive = false;

    this._cache = null;
    this._overlay = null;
    this._escKey = null;

    this.handleNavigation = this.handleNavigation.bind(this);
    this.handleSettingChange = this.handleSettingChange.bind(this);
    this.onPlayerMount = this.onPlayerMount.bind(this);
    this.onPlayerUpdate = this.onPlayerUpdate.bind(this);
    this.onPlayerUnmount = this.onPlayerUnmount.bind(this);
  }

  initialize() {
    const enabled = this.settings.get("addon.trubbel.channel.player.clip.download");
    if (enabled) {
      this.handleNavigation();
    } else {
      this.disable();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.log.info("[DownloadClips] Enabling");
      this.handleNavigation();
    } else {
      this.log.info("[DownloadClips] Disabling");
      this.disable();
    }
  }

  getSlug() {
    const match = this.router.match;
    if (!match) return null;
    // clips.twitch.tv: /:slug → match[1]
    // www.twitch.tv:   /:user/clip/:slug → match[2]
    return this.router.current_name === "clip-page" ? match[1] : match[2];
  }

  handleNavigation() {
    const slug = this.getSlug();
    const enabled = this.settings.get("addon.trubbel.channel.player.clip.download");

    if (slug !== this._cache?.slug) {
      this._cache = null;
      this.hidePopup();
    }

    if (enabled && slug) {
      if (!this.isActive) {
        this.log.info("[DownloadClips] Entering clip page, enabling");
        this.enable();
      } else {
        for (const inst of this.player.Player.instances)
          this.addClipButton(inst);
      }
    } else {
      if (this.isActive) {
        this.log.info("[DownloadClips] Leaving clip page, disabling");
        this.disable();
      }
    }
  }

  enable() {
    if (this.isActive) return;
    this.isActive = true;

    this.style.set("download-clip", `
      .trubbel-download-overlay {
        position: fixed;
        inset: 0;
        z-index: 9000;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.6);
      }
      .trubbel-download-popup {
        width: 360px;
        border-radius: var(--border-radius-large);
        box-shadow: var(--shadow-elevation-4);
        background: var(--color-background-alt);
        color: var(--color-text-base);
        border: 1px solid rgba(173, 173, 184, 0.35);
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      .trubbel-download-popup header {
        display: flex;
        align-items: center;
        padding: 0.5rem 0.75rem;
        background: var(--color-background-base);
        border-bottom: 1px solid rgba(173, 173, 184, 0.35);
        gap: 0.4rem;
      }
      .trubbel-download-popup header h3 {
        flex: 1;
        margin: 0;
        font-size: 15px;
        font-weight: var(--font-weight-semibold);
      }
      .trubbel-download-popup .trubbel-popup-body {
        padding: 0.75rem;
      }
    `);

    this.player.Player.on("mount", this.onPlayerMount);
    this.player.Player.on("update", this.onPlayerUpdate);
    this.player.Player.on("unmount", this.onPlayerUnmount);

    this.player.Player.ready((cls, instances) => {
      for (const inst of instances)
        this.addClipButton(inst);
    });
  }

  disable() {
    if (!this.isActive) return;
    this.isActive = false;

    this.style.delete("download-clip");
    this.hidePopup();
    this._cache = null;

    this.player.Player.off("mount", this.onPlayerMount);
    this.player.Player.off("update", this.onPlayerUpdate);
    this.player.Player.off("unmount", this.onPlayerUnmount);

    for (const inst of this.player.Player.instances) {
      const outer = inst.props.containerRef || this.fine.getChildNode(inst);
      outer?.querySelector(".ffz--download-clip")?.remove();
    }
  }

  onPlayerMount(inst) {
    this.addClipButton(inst);
  }

  onPlayerUpdate(inst) {
    this.addClipButton(inst);
  }

  onPlayerUnmount(inst) {
    inst.ffzUninstall?.();
  }

  addClipButton(inst, tries = 0) {
    const outer = inst.props.containerRef || this.fine.getChildNode(inst),
      container = outer && outer.querySelector(this.player.RIGHT_CONTROLS);

    if (!container) {
      if (tries < 5)
        return setTimeout(this.addClipButton.bind(this, inst, (tries || 0) + 1), 250);
      return;
    }

    let cont = container.querySelector(".ffz--download-clip");
    if (!this.getSlug()) {
      if (cont) cont.remove();
      return;
    }

    if (!cont) {
      cont = (<div class="ffz--download-clip" style={{ display: "inline-flex" }}>
        <div>
          <button
            className="ffz-il-tooltip__container"
            data-a-target="ffz-download-clip-button"
            aria-label="Download Clip"
            style={{
              display: "inline-flex",
              position: "relative",
              alignItems: "center",
              justifyContent: "center",
              verticalAlign: "middle",
              overflow: "visible",
              textDecoration: "none",
              whiteSpace: "nowrap",
              userSelect: "none",
              fontWeight: "var(--font-weight-semibold)",
              fontSize: "var(--button-text-default)",
              height: "var(--button-size-default)",
              width: "var(--button-size-default)",
              borderRadius: "var(--button-border-radius-default)",
              border: "none",
              background: "none",
              color: "var(--color-fill-button-icon, #53535f)",
            }}
            onMouseEnter={(e) => Object.assign(e.currentTarget.style, {
              backgroundColor: "var(--color-background-button-text-hover, rgba(255, 255, 255, 0.13))",
              color: "var(--color-fill-button-icon-hover, #fff)"
            })}
            onMouseLeave={(e) => Object.assign(e.currentTarget.style, {
              backgroundColor: "",
              color: "var(--color-fill-button-icon, #fff)"
            })}
            onClick={() => this.handleDownload(inst)}
          >
            <div style={{
              pointerEvents: "none",
              width: "var(--button-icon-size-default)",
              height: "var(--button-icon-size-default)",
              display: "inline-flex",
              alignItems: "center",
              fill: "var(--color-fill-current)",
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24"
                focusable="false" aria-hidden="true" role="presentation"
                style={{ width: "100%", height: "100%" }}>
                <path d="M13 3v9.586l3.293-3.293 1.414 1.414L12 16.414l-5.707-5.707 1.414-1.414L11 12.586V3h2ZM2 21v-2c2.284 0 20 .055 20 .055V21H2Z" />
              </svg>
            </div>
            <div className="ffz-il-tooltip ffz-il-tooltip--up ffz-il-tooltip--align-center">
              Download Clip
            </div>
          </button>
        </div>
      </div>);

      let thing = container.querySelector("button[data-a-target=\"player-settings-button\"]");
      while (thing?.parentElement && thing.parentElement !== container)
        thing = thing.parentElement;

      if (thing?.parentElement === container)
        container.insertBefore(cont, thing);
      else
        container.appendChild(cont);
    }
  }

  showPopup() {
    if (this._overlay) return;

    const overlay = (
      <div class="trubbel-download-overlay" onClick={(e) => {
        if (e.target === overlay) this.hidePopup();
      }}>
        <div class="trubbel-download-popup tw-elevation-3">
          <header>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 3v9.586l3.293-3.293 1.414 1.414L12 16.414l-5.707-5.707 1.414-1.414L11 12.586V3h2ZM2 21v-2c2.284 0 20 .055 20 .055V21H2Z" />
            </svg>
            <h3>Download Clip</h3>
            <button
              onclick={() => this.hidePopup()}
              class="tw-button-icon tw-relative ffz-il-tooltip__container"
            >
              <span class="tw-button-icon__icon">
                <figure class="ffz-i-window-close" />
              </span>
              <div class="ffz-il-tooltip ffz-il-tooltip--down ffz-il-tooltip--align-right">
                Close
              </div>
            </button>
          </header>
          <div class="trubbel-popup-body" data-content="download-qualities">
            <p style={{ color: "var(--color-text-alt)", fontSize: "13px", textAlign: "center" }}>
              Loading...
            </p>
          </div>
        </div>
      </div>
    );

    this._overlay = overlay;

    const tooltips = this.parent.resolve("tooltips");
    const container = tooltips?.container ?? document.querySelector("#root") ?? document.body;
    container.appendChild(this._overlay);

    this._escKey = (e) => { if (e.key === "Escape") this.hidePopup(); };
    on(document, "keydown", this._escKey);
  }

  hidePopup() {
    if (!this._overlay) return;

    if (this._escKey) {
      off(document, "keydown", this._escKey);
      this._escKey = null;
    }

    this._overlay.remove();
    this._overlay = null;
  }

  updatePopupContent(clip) {
    if (!this._overlay) return;

    const content = this._overlay.querySelector("[data-content=\"download-qualities\"]");
    if (!content) return;

    const { signature, value } = clip.playbackAccessToken;

    const qualities = clip.videoQualities.map(q => ({
      label: `${q.quality}p${Math.round(q.frameRate) >= 60 ? " 60fps" : ""}`,
      url: `${q.sourceURL}?sig=${signature}&token=${encodeURIComponent(value)}`,
    }));

    const children = (
      <div style={{ width: "100%", overflow: "hidden" }}>
        <img src={clip.thumbnailURL} alt={clip.title}
          style={{
            width: "100%",
            display: "block",
            borderRadius: "var(--border-radius-medium)"
          }}
        />
        <div
          class="tw-relative ffz-tooltip"
          data-tooltip-type="html"
          data-title={clip.title}
          style={{
            fontSize: "12px",
            fontWeight: "var(--font-weight-semibold)",
            color: "var(--color-text-base)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            padding: "0.4rem 0"
          }}>
          {clip.title}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${qualities.length}, 1fr)`, gap: "0.4rem" }}>
          {qualities.map(q => (
            <button
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "0.5rem 0.3rem",
                borderRadius: "var(--border-radius-medium)",
                border: "1px solid rgba(173, 173, 184, 0.35)",
                background: "var(--color-background-base)",
                color: "var(--color-text-base)",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "var(--font-weight-semibold)",
                gap: "0.3rem"
              }}
              onMouseEnter={(e) => Object.assign(e.currentTarget.style, {
                background: "var(--color-background-button-text-hover)",
                color: "var(--color-text-button-text-hover)"
              })}
              onMouseLeave={(e) => Object.assign(e.currentTarget.style, {
                background: "var(--color-background-base)",
                color: "var(--color-text-base)"
              })}
              onClick={() => { window.open(q.url, "_blank"); this.hidePopup(); }}
            >
              <span>{q.label}</span>
            </button>
          ))}
        </div>
      </div>
    );

    setChildren(content, [children]);
  }

  async handleDownload(inst) {
    const slug = this.getSlug();
    if (!slug) {
      this.log.warn("[DownloadClips] No clip slug found in route");
      return;
    }

    if (this._overlay) {
      this.hidePopup();
      return;
    }

    this.showPopup();

    if (this._cache?.slug === slug) {
      this.updatePopupContent(this._cache.clip);
      return;
    }

    try {
      const apollo = this.parent.resolve("site.apollo");
      if (!apollo) {
        this.log.warn("[DownloadClips] Apollo client not available");
        return;
      }

      const result = await apollo.client.query({
        query: GET_CLIP,
        variables: { slug },
        fetchPolicy: "network-only"
      });

      this.log.info("[DownloadClips] result:", result);

      const clip = result?.data?.clip;
      if (!clip) {
        this.log.warn("[DownloadClips] No clip data received");
        return;
      }

      this._cache = { slug, clip };
      this.updatePopupContent(clip);

    } catch (error) {
      this.log.error("[DownloadClips] Error fetching clip:", error);
    }
  }
}