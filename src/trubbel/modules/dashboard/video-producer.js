const { createElement, ManagedStyle } = FrankerFaceZ.utilities.dom;

export default class VideoDeletionDate {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.router = parent.router;
    this.style = new ManagedStyle();
    this.site = parent.site;
    this.fine = parent.fine;
    this.i18n = parent.i18n;
    this.log = parent.log;

    this.isActive = false;
    this.currentChannel = null;

    this.handleNavigation = this.handleNavigation.bind(this);
    this.enableDeletionDate = this.enableDeletionDate.bind(this);
    this.disableDeletionDate = this.disableDeletionDate.bind(this);
    this.handleSettingChange = this.handleSettingChange.bind(this);
    this.updateVideoCard = this.updateVideoCard.bind(this);

    this.VideoCard = this.fine.define(
      "video-producer-card",
      n => n.props?.video?.id &&
        n.props?.channelName &&
        n.props?.onDeleteVideo,
      ["dash-video-producer"]
    );
  }

  initialize() {
    const enabled = this.settings.get("addon.trubbel.dashboard.video_producer.deletion_date");
    if (enabled) {
      this.handleNavigation();
    } else {
      this.disableDeletionDate();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.handleNavigation();
    } else {
      this.disableDeletionDate();
    }
  }

  handleNavigation() {
    const currentRoute = this.router?.current?.name;
    const isVideoProducerPage = currentRoute === "dash-video-producer";

    if (isVideoProducerPage) {
      const enabled = this.settings.get("addon.trubbel.dashboard.video_producer.deletion_date");

      if (enabled && !this.isActive) {
        this.enableDeletionDate();
      }
    } else {
      if (this.isActive) {
        this.disableDeletionDate();
      }
    }
  }

  enableDeletionDate() {
    if (this.isActive) return;

    this.VideoCard.ready((cls, instances) => {
      for (const inst of instances) {
        this.updateVideoCard(inst);
      }
    });

    this.VideoCard.on("mount", this.updateVideoCard, this);
    this.VideoCard.on("update", this.updateVideoCard, this);

    this.style.set("video-deletion-date", `
      .trubbel-video-deletion-notice {
        margin-inline-end: 8px !important;
      }
      
      .trubbel-video-deletion-notice.trubbel-deletion-urgent {
        color: #ff4444;
      }
    `);

    this.isActive = true;
  }

  disableDeletionDate() {
    if (!this.isActive) return;

    this.VideoCard.off("mount", this.updateVideoCard, this);
    this.VideoCard.off("update", this.updateVideoCard, this);

    const notices = document.querySelectorAll(".trubbel-video-deletion-notice");
    notices.forEach(notice => notice.remove());

    if (this.style.has("video-deletion-date")) {
      this.style.delete("video-deletion-date");
    }

    this.isActive = false;
  }

  updateVideoCard(inst) {
    const videoId = inst.props?.video?.id;
    if (!videoId) return;

    const cardElement = document.querySelector(`[data-video-id="${videoId}"]`);

    if (!cardElement) {
      this.log.warn("[VideoDeletionDate] No element found for video:", videoId);
      return;
    }

    const deletedAt = inst.props?.video?.deletedAt;

    if (!deletedAt) {
      const existing = cardElement.querySelector(".trubbel-video-deletion-notice");
      if (existing) existing.remove();
      return;
    }

    const publishDateEl = cardElement.querySelector("[data-test-selector=\"video-card-publish-date-selector\"]");
    if (!publishDateEl) {
      this.log.warn("[VideoDeletionDate] No element found for video:", videoId);
      return;
    }

    const deletionDate = new Date(deletedAt);
    const now = new Date();
    const daysUntilDeletion = Math.ceil((deletionDate - now) / (1000 * 60 * 60 * 24));

    const formattedDate = this.i18n.formatDate(deletionDate);

    const isUrgent = daysUntilDeletion <= 10 && daysUntilDeletion >= 0;
    const urgencyClass = isUrgent ? "trubbel-deletion-urgent" : "";

    let deletionText = "";
    if (daysUntilDeletion > 0) {
      deletionText = `Deletes in ${daysUntilDeletion} day${daysUntilDeletion !== 1 ? "s" : ""} (${formattedDate})`;
    } else if (daysUntilDeletion === 0) {
      deletionText = `Deletes today (${formattedDate})`;
    } else {
      deletionText = `Deleted on ${formattedDate}`;
    }

    let deletionNotice = cardElement.querySelector(".trubbel-video-deletion-notice");

    if (!deletionNotice) {
      deletionNotice = (
        <div class={`trubbel-video-deletion-notice ${urgencyClass}`}>
          <div
            style={{
              display: "flex",
              MozBoxPack: "center",
              justifyContent: "center",
              MozBoxAlign: "center",
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                marginInlineEnd: "4px",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  MozBoxAlign: "center",
                  alignItems: "center",
                  width: "16px",
                  height: "16px",
                  fill: "currentColor",
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  style={{
                    width: "16px",
                    height: "16px",
                  }}
                >
                  <path
                    fill-rule="evenodd"
                    d="M13.226 2.72a1.404 1.404 0 0 0-2.452 0L2.192 17.84c-.545.96.136 2.16 1.226 2.16h17.164c1.09 0 1.771-1.2 1.226-2.16L13.226 2.72ZM13 7h-2v7h2V7Zm0 9h-2v2h2v-2Z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
            </div>

            <p
              style={{
                fontSize: "var(--font-size-base)",
                lineHeight: "var(--line-height-body)",
                margin: 0,
                fontWeight: 600
              }}
            >
              {deletionText}
            </p>
          </div>
        </div>
      );

      publishDateEl.parentNode.insertBefore(deletionNotice, publishDateEl.nextSibling);
    } else {
      deletionNotice.className = `trubbel-video-deletion-notice ${urgencyClass}`;
      const textElement = deletionNotice.querySelector("p");
      if (textElement) {
        textElement.textContent = deletionText;
      }
    }
  }
}