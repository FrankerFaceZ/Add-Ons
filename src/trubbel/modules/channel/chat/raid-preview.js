import { BAD_USERS } from "../../../utilities/constants/types";

import GET_RAID_INFO from "../../../utilities/graphql/raid-info.gql";

const { createElement } = FrankerFaceZ.utilities.dom;

export default class RaidPreview {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.router = parent.router;
    this.style = parent.style;
    this.i18n = parent.i18n;
    this.fine = parent.fine;
    this.site = parent.site;
    this.log = parent.log;

    this.isActive = false;

    this.handleNavigation = this.handleNavigation.bind(this);
    this.enableRaidPreview = this.enableRaidPreview.bind(this);
    this.disableRaidPreview = this.disableRaidPreview.bind(this);
    this.setupRaidController = this.setupRaidController.bind(this);
    this.handleSettingChange = this.handleSettingChange.bind(this);
    this.cleanupRaidController = this.cleanupRaidController.bind(this);

    this.RaidController = this.fine.define(
      "raid-controller",
      n => n.handleLeaveRaid && n.handleJoinRaid,
      this.site.constructor.CHAT_ROUTES
    );
  }

  initialize() {
    const previewType = this.settings.get("addon.trubbel.channel.chat.raids.previews");
    if (previewType > 0) {
      this.handleNavigation();
    } else {
      this.disableRaidPreview();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.log.info("[Raid Preview] Enabling raid preview");
      this.handleNavigation();
    } else {
      this.log.info("[Raid Preview] Disabling raid preview");
      this.disableRaidPreview();
    }
  }

  handleNavigation() {
    const chatRoutes = this.site.constructor.CHAT_ROUTES;
    const currentRoute = this.router?.current?.name;

    let pathname;

    if (this.router?.match && this.router.match[1]) {
      pathname = this.router.match[1];
    } else {
      const location = this.router?.location;
      const segment = location?.split("/").filter(segment => segment.length > 0);
      pathname = segment?.[0];
    }

    if (chatRoutes.includes(currentRoute) && pathname && !BAD_USERS.includes(pathname)) {
      const previewType = this.settings.get("addon.trubbel.channel.chat.raids.previews");
      if (previewType > 0 && !this.isActive) {
        this.log.info("[Raid Preview] Entering user page, enabling raid preview");
        this.enableRaidPreview();
      }
    } else {
      if (this.isActive) {
        this.log.info("[Raid Preview] Leaving user page, disabling raid preview");
        this.disableRaidPreview();
      }
    }
  }

  enableRaidPreview() {
    if (this.isActive) return;

    this.log.info("[Raid Preview] Setting up raid preview functionality");
    this.isActive = true;

    this.RaidController.ready((cls, instances) => {
      for (const inst of instances) {
        this.setupRaidController(inst);
      }
    });

    this.RaidController.on("mount", this.setupRaidController);
    this.RaidController.on("unmount", this.cleanupRaidController);
  }

  setupRaidController(inst) {
    if (!this.isActive) {
      this.log.info("[Raid Preview] Not active, skipping controller setup");
      return;
    }

    if (inst._trubbel_controller_setup) return;
    inst._trubbel_controller_setup = true;

    this.setupRaidPreview(inst);
  }

  cleanupRaidController(inst) {
    if (!inst._trubbel_controller_setup) return;
    inst._trubbel_controller_setup = false;
    inst._trubbel_raid_info_fetched = false;

    if (this.style.has("trubbel-raid-preview")) {
      this.style.delete("trubbel-raid-preview");
    }
  }

  async setupRaidPreview(inst) {
    if (!this.isActive) return;
    if (inst._trubbel_raid_info_fetched) return;

    this.log.info("[Raid Preview] Setting up raid preview for controller");

    const targetLogin = inst?.props?.raid?.targetLogin;
    if (!targetLogin) {
      this.log.info("[Raid Preview] No target login found");
      return;
    }

    const apollo = this.parent.resolve("site.apollo");
    if (!apollo) {
      this.log.info("[Raid Preview] Apollo client not available");
      return;
    }

    try {
      this.log.info("[Raid Preview] Fetching info for:", targetLogin);

      const result = await apollo.client.query({
        query: GET_RAID_INFO,
        variables: {
          login: targetLogin
        },
        fetchPolicy: "network-only"
      });

      const data = result?.data;
      this.log.info("[Raid Preview] data gql:", data);
      if (!data) {
        this.log.info("[Raid Preview] No data received from query");
        return;
      }

      const user = data.user;
      if (!user) {
        this.log.info("[Raid Preview] User not found:", targetLogin);
        return;
      }

      let should_blur_image = false;

      if (user.stream) {
        this.log.info("[Raid Preview] Stream data:", {
          id: user.stream.id,
          type: user.stream.type,
          createdAt: user.stream.createdAt,
          viewersCount: user.stream.viewersCount,
          contentClassificationLabels: user.stream.contentClassificationLabels,
          game: user.stream.game
        });

        should_blur_image = user.stream.contentClassificationLabels &&
          user.stream.contentClassificationLabels.length > 0;

        if (should_blur_image) {
          this.log.info(`[Raid Preview] Stream will be blurred due to content flags:`,
            user.stream.contentClassificationLabels?.map(f => f.id) || []);
        }

        const game = user.stream.game?.name || "Unknown Category";
        const viewers = user.stream.viewersCount || 0;
        this.log.info(`[Raid Preview] ${user.login} is live with ${viewers} viewers playing ${game}`);
      } else {
        this.log.info("[Raid Preview] Target stream is offline:", user.login);
      }

      try {
        const raidBanner = await this.site.awaitElement(
          "div[data-test-selector=\"raid-banner\"] div",
          document.documentElement,
          10000
        );

        if (raidBanner && this.isActive) {
          this.addRaidPreview(raidBanner, user, should_blur_image);
          inst._trubbel_raid_info_fetched = true;
        }
      } catch (err) {
        this.log.warn("[Raid Preview] Could not find raid banner element:", err);
      }

    } catch (err) {
      this.log.error("[Raid Preview] Error fetching raid info:", err);
    }
  }

  addRaidPreview(banner, user, should_blur_image = false) {
    if (!this.isActive) return;
    if (banner.querySelector(".trubbel-raid-stream-info")) return;

    const previewType = this.settings.get("addon.trubbel.channel.chat.raids.previews");

    this.style.set("trubbel-raid-preview", `
      .highlight__collapsed { max-height: unset !important; }
      .trubbel-preview-container {
        position: relative;
        width: 100%;
        overflow: hidden;
        border-radius: 4px;
      }
      .trubbel-blurred-preview {
        filter: blur(3rem) brightness(50%);
        transform: scale(1.3);
        transition: all 0.3s ease;
        transform-origin: center center;
      }
      .trubbel-preview-container:hover .trubbel-blurred-preview {
        filter: blur(0) brightness(100%);
        transform: scale(1);
      }
      .trubbel-blur-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.6);
        color: white;
        text-align: center;
        opacity: 1;
        transition: opacity 0.3s ease;
        pointer-events: none;
        border-radius: 4px;
      }
      .trubbel-preview-container:hover .trubbel-blur-overlay {
        opacity: 0;
      }
      .trubbel-eye-icon {
        width: 24px;
        height: 24px;
        margin-bottom: 8px;
        opacity: 0.8;
      }
      .trubbel-video-preview {
        max-width: 440px;
        max-height: 248px;
        width: 100%;
        height: 248px;
        border: none;
        border-radius: 4px;
        display: block;
      }
    `);

    const container = banner.closest("div[data-test-selector=\"raid-banner\"]");
    if (!container) {
      this.log.warn("[Raid Preview] Could not find main raid banner container");
      if (this.style.has("trubbel-raid-preview")) {
        this.style.delete("trubbel-raid-preview");
      }
      return;
    }

    const targetLogin = user.login;
    let previewMedia = null;

    if (user.stream && previewType > 0) {
      if (previewType === 1) {
        // image
        previewMedia = (
          <div class="trubbel-preview-container">
            <img
              src={user.stream.previewImageURL}
              alt="Stream Preview"
              class={should_blur_image ? "trubbel-blurred-preview" : ""}
              style={{
                maxWidth: "440px",
                maxHeight: "248px",
                width: "100%",
                height: "auto",
                objectFit: "contain",
                borderRadius: "4px",
                display: "block",
              }}
            />
            {should_blur_image && user.stream.contentClassificationLabels && (
              <div class="trubbel-blur-overlay">
                <svg
                  class="trubbel-eye-icon"
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fill-rule="evenodd"
                    clip-rule="evenodd"
                    d="m16.5 18 1.5-1.5-2.876-2.876a9.99 9.99 0 0 0 1.051-1.191L18 10l-1.825-2.433a9.992 9.992 0 0 0-2.855-2.575 35.993 35.993 0 0 1-.232-.14 6 6 0 0 0-6.175 0 35.993 35.993 0 0 1-.35.211L3.5 2 2 3.5 16.5 18zm-2.79-5.79a8 8 0 0 0 .865-.977L15.5 10l-.924-1.233a7.996 7.996 0 0 0-2.281-2.058 37.22 37.22 0 0 1-.24-.144 4 4 0 0 0-4.034-.044l1.53 1.53a2 2 0 0 1 2.397 2.397l1.762 1.762z"
                  />
                  <path
                    d="m11.35 15.85-1.883-1.883a3.996 3.996 0 0 1-1.522-.532 38.552 38.552 0 0 0-.239-.144 7.994 7.994 0 0 1-2.28-2.058L4.5 10l.428-.571L3.5 8 2 10l1.825 2.433a9.992 9.992 0 0 0 2.855 2.575c.077.045.155.092.233.14a6 6 0 0 0 4.437.702z"
                  />
                </svg>
                <div style={{
                  fontSize: "14px",
                  fontWeight: "500"
                }}>
                  May contain: {user.stream.contentClassificationLabels.map(f => f.localizedName || f.id).join(", ")}
                </div>
              </div>
            )}
          </div>
        );
      } else if (previewType === 2) {
        // video
        const params = new URLSearchParams({
          channel: targetLogin,
          enableExtensions: false,
          parent: "twitch.tv",
          player: "site",
          quality: "auto",
          muted: true,
          controls: false,
          disable_frankerfacez: true
        });
        const playerUrl = `https://player.twitch.tv/?${params}`;

        previewMedia = (
          <div class="trubbel-preview-container">
            <iframe
              src={playerUrl}
              class={should_blur_image ? "trubbel-blurred-preview" : ""}
              style={{
                maxWidth: "440px",
                maxHeight: "248px",
                width: "100%",
                height: "auto",
                objectFit: "contain",
                borderRadius: "4px",
                display: "block",
              }}
              allowfullscreen={false}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              title={`${targetLogin} Stream Preview`}
            />
            {should_blur_image && user.stream.contentClassificationLabels && (
              <div class="trubbel-blur-overlay">
                <svg
                  class="trubbel-eye-icon"
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fill-rule="evenodd"
                    clip-rule="evenodd"
                    d="m16.5 18 1.5-1.5-2.876-2.876a9.99 9.99 0 0 0 1.051-1.191L18 10l-1.825-2.433a9.992 9.992 0 0 0-2.855-2.575 35.993 35.993 0 0 1-.232-.14 6 6 0 0 0-6.175 0 35.993 35.993 0 0 1-.35.211L3.5 2 2 3.5 16.5 18zm-2.79-5.79a8 8 0 0 0 .865-.977L15.5 10l-.924-1.233a7.996 7.996 0 0 0-2.281-2.058 37.22 37.22 0 0 1-.24-.144 4 4 0 0 0-4.034-.044l1.53 1.53a2 2 0 0 1 2.397 2.397l1.762 1.762z"
                  />
                  <path
                    d="m11.35 15.85-1.883-1.883a3.996 3.996 0 0 1-1.522-.532 38.552 38.552 0 0 0-.239-.144 7.994 7.994 0 0 1-2.28-2.058L4.5 10l.428-.571L3.5 8 2 10l1.825 2.433a9.992 9.992 0 0 0 2.855 2.575c.077.045.155.092.233.14a6 6 0 0 0 4.437.702z"
                  />
                </svg>
                <div style={{
                  fontSize: "14px",
                  fontWeight: "500"
                }}>
                  May contain: {user.stream.contentClassificationLabels.map(f => f.localizedName || f.id).join(", ")}
                </div>
              </div>
            )}
          </div>
        );
      }
    }

    const infoElement = (
      <div
        class="trubbel-raid-stream-info"
        style={{
          width: "100%",
          padding: "4px 2px",
          fontSize: "13px"
        }}
      >
        <div style={{
          color: user.stream ? "#fff" : "#ff6b6b",
          marginBottom: user.stream && previewType > 0 ? "8px" : "0",
          lineHeight: "1.4",
          fontWeight: user.stream ? "normal" : "bold",
          textAlign: user.stream ? "left" : "center"
        }}>
          {user.stream ? [
            "Streaming ",
            <strong>{user.stream.game?.name || "Unknown Category"}</strong>,
            " to ",
            <strong>{this.i18n.formatNumber(user.stream.viewersCount || 0)}</strong>,
            " viewers"
          ] : "Stream is offline"}
        </div>
        {previewMedia}
      </div>
    );

    container.appendChild(infoElement);

    this.log.info("[Raid Preview] Added stream info to raid banner", {
      previewType: previewType === 1 ? "image" : previewType === 2 ? "video" : "none",
      blurred: should_blur_image,
      flags: user.stream?.contentClassificationLabels?.map(f => f.id) || []
    });
  }

  disableRaidPreview() {
    if (!this.isActive) return;

    this.log.info("[Raid Preview] Removing raid preview functionality");
    this.isActive = false;

    this.RaidController.off("mount", this.setupRaidController);
    this.RaidController.off("unmount", this.cleanupRaidController);

    this.removeExistingPreviews();
  }

  removeExistingPreviews() {
    const existingPreviews = document.querySelectorAll(".trubbel-raid-stream-info");
    existingPreviews.forEach(preview => preview.remove());
    if (this.style.has("trubbel-raid-preview")) {
      this.style.delete("trubbel-raid-preview");
    }
  }
}