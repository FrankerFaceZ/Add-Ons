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
      .trubbel-chat-settings {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 8px;
        font-size: 12px;
        opacity: 0.8;
      }
      .trubbel-chat-setting {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 6px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
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

    const createBlurOverlay = () => {
      if (!should_blur_image || !user.stream?.contentClassificationLabels) {
        return null;
      }

      return (
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
      );
    };

    const createPreviewMedia = () => {
      if (!user.stream || previewType === 0) {
        return null;
      }

      const mediaStyle = {
        maxWidth: "440px",
        maxHeight: "248px",
        width: "100%",
        height: "auto",
        objectFit: "contain",
        borderRadius: "4px",
        display: "block",
      };

      const blurOverlay = createBlurOverlay();

      if (previewType === 1) {
        // Image preview
        return (
          <div class="trubbel-preview-container">
            <img
              src={user.stream.previewImageURL}
              alt="Stream Preview"
              class={should_blur_image ? "trubbel-blurred-preview" : ""}
              style={mediaStyle}
            />
            {blurOverlay}
          </div>
        );
      } else if (previewType === 2) {
        // Video preview
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

        return (
          <div class="trubbel-preview-container">
            <iframe
              src={playerUrl}
              class={should_blur_image ? "trubbel-blurred-preview" : ""}
              style={mediaStyle}
              allowfullscreen={false}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              title={`${targetLogin} Stream Preview`}
            />
            {blurOverlay}
          </div>
        );
      }

      return null;
    };

    const createChatSettings = () => {
      const chatSettings = user.chatSettings;
      if (!chatSettings) return null;

      const settings = [];

      const formatFollowersDuration = (minutes) => {
        if (minutes === 0) return "";

        if (minutes % 43200 === 0) {
          const months = minutes / 43200;
          return ` ${months}mo`;
        }

        if (minutes % 10080 === 0) {
          const weeks = minutes / 10080;
          return ` ${weeks}w`;
        }

        if (minutes % 1440 === 0) {
          const days = minutes / 1440;
          return ` ${days}d`;
        }

        if (minutes % 60 === 0) {
          const hours = minutes / 60;
          return ` ${hours}h`;
        }

        return ` ${minutes}m`;
      };

      // Subscribers-Only Mode
      if (chatSettings.isSubscribersOnlyModeEnabled) {
        settings.push(
          <div
            class="trubbel-chat-setting ffz-tooltip"
            data-title="Subscribers-Only Mode"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10.883 2.72c.43-.96 1.803-.96 2.234 0l2.262 5.037 5.525.578c1.052.11 1.477 1.406.69 2.11l-4.127 3.691 1.153 5.395c.22 1.028-.89 1.828-1.808 1.303L12 18.08l-4.812 2.755c-.917.525-2.028-.275-1.808-1.303l1.153-5.395-4.127-3.691c-.786-.704-.362-2 .69-2.11l5.525-.578 2.262-5.037Z" />
            </svg>
            Subscribers-Only
          </div>
        );
      }

      // Followers-Only Mode
      if (chatSettings.followersOnlyDurationMinutes !== null && chatSettings.followersOnlyDurationMinutes !== undefined) {
        const duration = formatFollowersDuration(chatSettings.followersOnlyDurationMinutes);
        settings.push(
          <div
            class="trubbel-chat-setting ffz-tooltip"
            data-title={`Followers-Only Mode${duration}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path fill-rule="evenodd" d="M10.964 5.422A5.075 5.075 0 0 0 7.429 4H7C4.239 4 2 6.175 2 8.857v.417a4.79 4.79 0 0 0 1.464 3.434L12 21l8.535-8.292A4.788 4.788 0 0 0 22 9.274v-.417C22 6.175 19.761 4 17 4h-.429a5.076 5.076 0 0 0-3.536 1.423L12 6.429l-1.036-1.007Z" clip-rule="evenodd" />
            </svg>
            Followers-Only{duration}
          </div>
        );
      }

      // Emotes-Only Mode
      if (chatSettings.isEmoteOnlyModeEnabled) {
        settings.push(
          <div
            class="trubbel-chat-setting ffz-tooltip"
            data-title="Emotes-Only Mode"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 19a3 3 0 0 0 3-3H9a3 3 0 0 0 3 3Zm-6-6.5a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM16.5 11a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
              <path fill-rule="evenodd" d="M1 12C1 5.925 5.925 1 12 1s11 4.925 11 11-4.925 11-11 11S1 18.075 1 12Zm11 9a9 9 0 1 1 0-18 9 9 0 0 1 0 18Z" clip-rule="evenodd" />
            </svg>
            Emotes-Only
          </div>
        );
      }

      // Slow Mode
      if (chatSettings.slowModeDurationSeconds && chatSettings.slowModeDurationSeconds > 0) {
        settings.push(
          <div
            class="trubbel-chat-setting ffz-tooltip"
            data-title={`Slow Mode ${chatSettings.slowModeDurationSeconds}s`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path fill-rule="evenodd" d="M21 4.47a8 8 0 0 1-3.884 6.86l-.973.584a.1.1 0 0 0 0 .172l.973.584a8.008 8.008 0 0 1 .774.528A8 8 0 0 1 21 19.53V22H3v-2.47a8 8 0 0 1 3.884-6.86l.973-.584a.1.1 0 0 0 0-.172l-.973-.584A7.998 7.998 0 0 1 3 4.47V2h18v2.47ZM18.44 17a5.999 5.999 0 0 0-2.353-2.615l-.973-.584c-1.36-.816-1.36-2.786 0-3.602l.973-.584A6 6 0 0 0 19 4.47V4H5v.47a6 6 0 0 0 2.913 5.145l.973.584c1.36.816 1.36 2.786 0 3.602l-.973.584A5.998 5.998 0 0 0 5.559 17h12.882Z" clip-rule="evenodd" />
            </svg>
            Slow Mode {chatSettings.slowModeDurationSeconds}s
          </div>
        );
      }

      // Unique Chat Mode
      if (chatSettings.isUniqueChatModeEnabled) {
        settings.push(
          <div
            class="trubbel-chat-setting ffz-tooltip"
            data-title="Unique Chat Mode"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 10h2v2H9zm6 0h-2v2h2z" />
              <path d="m12 22-3-3H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4zm-2.172-5L12 19.172 14.172 17H19V5H5v12z" fill-rule="evenodd" />
            </svg>
            Unique Mode
          </div>
        );
      }

      // Non-Mod Chat Delay
      if (chatSettings.chatDelayMs && chatSettings.chatDelayMs > 0) {
        const delaySec = Math.round(chatSettings.chatDelayMs / 1000);
        settings.push(
          <div
            class="trubbel-chat-setting ffz-tooltip"
            data-title={`Non-Mod Chat Delay ${delaySec}s`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 10v4h-2v-4h2Z" />
              <path fill-rule="evenodd" d="M11 4H9V2h6v2h-2v2.062a7.96 7.96 0 0 1 3.906 1.618l1.387-1.387 1.414 1.414-1.387 1.387a8 8 0 1 1-12.64 0L4.293 7.707l1.414-1.414L7.094 7.68A7.96 7.96 0 0 1 11 6.062V4ZM6 14a6 6 0 1 0 12 0 6 6 0 0 0-12 0Z" clip-rule="evenodd" />
            </svg>
            Chat Delay {delaySec}s
          </div>
        );
      }

      // Verified account required
      if (chatSettings.requireVerifiedAccount) {
        settings.push(
          <div
            class="trubbel-chat-setting ffz-tooltip"
            data-title="Verified Account Required"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path fill-rule="evenodd" d="M19.707 8.207 10 17.914l-6.207-6.207 1.414-1.414L10 15.086l8.293-8.293z" clip-rule="evenodd" />
            </svg>
            Verified Only
          </div>
        );
      }

      if (settings.length === 0) return null;

      return (
        <div class="trubbel-chat-settings">
          {settings}
        </div>
      );
    };

    // Main info element with restructured JSX
    const previewMedia = createPreviewMedia();
    const chatSettings = createChatSettings();

    const infoElement = (
      <div class="trubbel-raid-stream-info" style={{ width: "100%", padding: "4px 2px", fontSize: "13px" }}>
        {/* Raid info text */}
        <div style={{
          color: user.stream ? "#fff" : "#ff6b6b",
          marginBottom: (user.stream && previewMedia) || chatSettings ? "8px" : "0",
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

        {/* Raid preview */}
        {previewMedia}

        {/* Chat settings (if any) */}
        {chatSettings}
      </div>
    );

    container.appendChild(infoElement);

    this.log.info("[Raid Preview] Added stream info to raid banner", {
      previewType: previewType === 1 ? "image" : previewType === 2 ? "video" : "none",
      blurred: should_blur_image,
      flags: user.stream?.contentClassificationLabels?.map(f => f.id) || [],
      chatSettingsCount: chatSettings ? user.chatSettings : 0
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