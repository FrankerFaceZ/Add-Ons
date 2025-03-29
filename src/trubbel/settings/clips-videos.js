import setTimestamp from "../features/clips-videos/set-timestamp";
import applyMostRecentVideoTimestamp from "../features/clips-videos/most-recent-video";
import GET_VIDEO from "../utils/graphql/video_info.gql";
import { showNotification } from "../utils/create-notification";
import { formatTime } from "../utils/format";

export class ClipsVideos extends FrankerFaceZ.utilities.module.Module {
  constructor(...args) {
    super(...args);

    this.inject("settings");
    this.inject("i18n");
    this.inject("site");
    this.inject("site.fine");
    this.inject("site.player");
    this.inject("site.router");

    // Clips and Videos - Timestamps - Enable Custom Timestamps for Clips
    this.settings.add("addon.trubbel.clip-video.timestamps-clip", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Clips and Videos >> Timestamps",
        title: "Enable Custom Timestamps for Clips",
        description: "Show the full timestamp when a clip was created.",
        component: "setting-check-box"
      },
      changed: () => this.getClipOrVideo()
    });
    // Clips and Videos - Timestamps - Enable Custom Timestamps for Videos
    this.settings.add("addon.trubbel.clip-video.timestamps-video", {
      default: false,
      ui: {
        sort: 1,
        path: "Add-Ons > Trubbel\u2019s Utilities > Clips and Videos >> Timestamps",
        title: "Enable Custom Timestamps for Videos",
        description: "Show the full timestamp when a video was created.",
        component: "setting-check-box"
      },
      changed: () => this.getClipOrVideo()
    });

    // Clips and Videos - Timestamps - Enable Timestamps for Most Recent Videos
    this.settings.add("addon.trubbel.clip-video.timestamps-most-recent", {
      default: false,
      ui: {
        sort: 2,
        path: "Add-Ons > Trubbel\u2019s Utilities > Clips and Videos >> Timestamps",
        title: "Enable Timestamps for Most Recent Videos",
        description: "Show timestamps on most recent videos when a stream is offline.",
        component: "setting-check-box"
      },
      changed: () => this.getMostRecentVideo()
    });

    // Clips and Videos - Timestamp - Timestamp Format
    this.settings.add("addon.trubbel.clip-video.timestamps-format", {
      default: "medium",
      ui: {
        sort: 3,
        path: "Add-Ons > Trubbel\u2019s Utilities > Clips and Videos >> Timestamps",
        title: "Timestamp Format",
        description: "The default combined timestamp format. Custom time formats are formatted using the [Day.js](https://day.js.org/docs/en/display/format) library.",
        component: "setting-combo-box",
        extra: {
          before: true,
          mode: "datetime",
          component: "format-preview"
        },
        data: () => {
          const out = [], now = new Date;
          for (const [key, fmt] of Object.entries(this.i18n._.formats.datetime)) {
            out.push({
              value: key, title: `${this.i18n.formatDateTime(now, key)} (${key})`
            })
          }
          return out;
        }
      },
      changed: val => {
        this.i18n._.defaultDateTimeFormat = val;
        this.emit(":update");
        this.getClipOrVideo();
      }
    });
    // Clips and Videos - Timestamp - Enable Relative Timestamp
    this.settings.add("addon.trubbel.clip-video.timestamps-relative", {
      default: false,
      ui: {
        sort: 4,
        path: "Add-Ons > Trubbel\u2019s Utilities > Clips and Videos >> Timestamps",
        title: "Enable Relative Timestamp",
        description: "Include relative timestamp, such as `(2 days ago)`, `(2 months ago)`, `(2 years ago)` at the end.",
        component: "setting-check-box"
      },
      changed: () => this.getClipOrVideo()
    });

    // Clips and Videos - VODs - Enable Auto-Skip Muted Segments
    this.settings.add("addon.trubbel.vods.skip-segments", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Clips and Videos >> VODs",
        title: "Enable Auto-Skip Muted Segments",
        description: "Automatically detects and skips muted segments.\n\nOnce you reach the start of a muted segment, this will automatically skip to the end of that muted segment.",
        component: "setting-check-box"
      },
      changed: () => this.getMutedSegments()
    });
    // Clips and Videos - VODs - Enable Auto-Skip Muted Segments
    this.settings.add("addon.trubbel.vods.skip-segments-notify", {
      default: false,
      ui: {
        sort: 1,
        path: "Add-Ons > Trubbel\u2019s Utilities > Clips and Videos >> VODs",
        title: "Enable Auto-Skip Notifications",
        description: "Show a notification bottom left when a muted segment is skipped.",
        component: "setting-check-box"
      }
    });

    this.currentVideoId = null;
    this.isProcessing = false;
    this.pendingFetch = null;
  }

  onEnable() {
    this.settings.getChanges("addon.trubbel.vods.skip-segments", () => this.getMutedSegments());
    this.router.on(":route", this.checkNavigation, this);
    this.checkNavigation();

    this.settings.getChanges("addon.trubbel.vods.skip-segments", () => this.getMostRecentVideo());
    this.router.on(":route", (route, match) => {
      if (route?.name === "clip-page" || route?.name === "user-clip" || route?.name === "video") {
        this.getClipOrVideo();
      }
      if (route?.name === "mod-view" || route?.name === "user") {
        this.getMostRecentVideo();
      }
    });
  }

  checkNavigation() {
    if ((this.router?.old_name === "video" || this.router?.old_name === "user-home" || this.router?.old_name === "user-videos") &&
      (this.router.current?.name !== "video" && this.router.current?.name !== "user-home" && this.router.current?.name !== "user-videos")) {
      this.cleanupEventListeners();
    }
    if (this.router.current?.name === "video" || this.router.current?.name === "user-home" || this.router.current?.name === "user-videos") {
      this.getMutedSegments();
    }
  }

  getClipOrVideo() {
    setTimestamp(this);
  }

  getMostRecentVideo() {
    const enabled = this.settings.get("addon.trubbel.clip-video.timestamps-most-recent");
    if (enabled) {
      applyMostRecentVideoTimestamp(this);
    } else {
      document.querySelector(".most_recent_video-overlay")?.remove();
    }
  }

  cleanupEventListeners() {
    const video = document.querySelector("[data-a-target=\"video-player\"] video");
    if (video && video._mutedSegmentsHandler) {
      video.removeEventListener("timeupdate", video._mutedSegmentsHandler);
      delete video._mutedSegmentsHandler;
    }

    this.currentVideoId = null;
    this.isProcessing = false;
    this.pendingFetch = null;
  }

  async waitForVideo() {
    try {
      const video = await this.site.awaitElement("[data-a-target=\"video-player\"] video", document.documentElement, 15000);
      // Pre-check: Look for muted segments in the seekbar
      // Instead of fetching information for each video
      // Check for muted segments parts in the seekbar before continuing
      try {
        // Wait for the seekbar to load
        const seekbar = await this.site.awaitElement(".seekbar-bar", document.documentElement, 15000);
        // Get all the segments
        const segments = Array.from(seekbar.querySelectorAll("[data-test-selector=\"seekbar-segment__segment\"]"));

        this.log.info("[Muted Segments] Found seekbar segments:", segments.length);

        // Handle muted segments
        const hasMutedSegments = segments.some(segment => {
          const style = window.getComputedStyle(segment);
          const backgroundColor = style.backgroundColor;
          // Look for the muted segment color
          return backgroundColor === "rgba(212, 73, 73, 0.5)";
        });

        // If no muted segments are found in the seekbar, we don't want to continue, to avoid making unnecessary GraphQL requests
        if (!hasMutedSegments) {
          this.log.info("[Muted Segments] No muted segments found in seekbar, stopping process");
          return false;
        }

        this.log.info("[Muted Segments] Found muted segments in seekbar, continuing with processing");
      } catch (error) {
        this.log.info("[Muted Segments] Error checking seekbar:", error);
        return false;
      }

      // If we found muted segments, proceed with getting the videoId
      const videoId = this?.site?.children?.player?.PlayerSource?.first?.props?.content?.vodID;
      if (videoId) {
        return { video, videoId };
      }

      return false;
    } catch (error) {
      this.log.error("[Muted Segments] Error waiting for video:", error);
      return false;
    }
  }

  async getMutedSegments() {
    const enabled = this.settings.get("addon.trubbel.vods.skip-segments");
    if (enabled) {
      // Clean up any existing handlers
      this.cleanupEventListeners();

      const result = await this.waitForVideo();

      // If waitForVideo returns false, stop processing
      if (result === false) {
        this.log.info("[Muted Segments] Stopping process - no muted segments found or error occurred");
        return;
      }

      const { video, videoId } = result;
      if (!videoId || !video) return;

      const segments = await this.fetchMutedSegments(videoId);
      if (segments) {
        const processedSegments = this.processMutedSegments(segments);
        await this.setupVideoTimeHandler(video, processedSegments);
      }
    } else {
      this.cleanupEventListeners();
      return;
    }
  }

  async fetchMutedSegments(videoId) {
    if (this.pendingFetch && this.currentVideoId === videoId) {
      return this.pendingFetch;
    }

    if (videoId === this.currentVideoId || this.isProcessing) return null;

    this.isProcessing = true;

    this.pendingFetch = new Promise(async (resolve) => {
      try {
        const apollo = this.resolve("site.apollo");
        if (!apollo) {
          resolve(null);
          return;
        }

        const result = await apollo.client.query({
          query: GET_VIDEO,
          variables: { id: videoId },
        });

        const segments = result.data?.video?.muteInfo?.mutedSegmentConnection?.nodes;
        if (segments?.length) {
          this.log.info("[Muted Segments] Found segments:", segments.length);
          this.currentVideoId = videoId;
          resolve(segments);
        } else {
          this.log.info("[Muted Segments] No muted segments found for this video");
          resolve(null);
        }
      } catch (error) {
        this.log.error("[Muted Segments] Error fetching segments:", error);
        resolve(null);
      } finally {
        this.isProcessing = false;
      }
    });

    return this.pendingFetch;
  }

  processMutedSegments(segments) {
    if (!segments) return [];

    const sortedSegments = [...segments].sort((a, b) => a.offset - b.offset);
    const combined = [];
    let current = { ...sortedSegments[0] };

    for (let i = 1; i < sortedSegments.length; i++) {
      const segment = sortedSegments[i];
      if (segment.offset <= current.offset + current.duration + 1) {
        current.duration = Math.max(
          current.duration,
          segment.offset + segment.duration - current.offset
        );
      } else {
        combined.push(current);
        current = { ...segment };
      }
    }
    combined.push(current);
    this.log.info("[Muted Segments] processMutedSegments() combined:", combined);
    return combined;
  }

  async setupVideoTimeHandler(video, processedSegments) {
    if (!video) return;

    const timeUpdateHandler = () => {
      const currentTime = video.currentTime;
      for (const segment of processedSegments) {
        if (!video.paused && currentTime >= segment.offset &&
          currentTime < segment.offset + segment.duration) {
          video.currentTime = segment.offset + segment.duration;
          this.log.info(`[Muted Segments] Skipped segment: ${segment.offset} -> ${segment.offset + segment.duration}`);
          if (this.settings.get("addon.trubbel.vods.skip-segments-notify")) {
            const startTime = formatTime(segment.offset);
            const endTime = formatTime(segment.offset + segment.duration);
            showNotification("🔇", `Skipped muted segment: ${startTime} → ${endTime}`);
          }
          break;
        }
      }
    };

    if (video._mutedSegmentsHandler) {
      video.removeEventListener("timeupdate", video._mutedSegmentsHandler);
    }

    video.addEventListener("timeupdate", timeUpdateHandler);
    video._mutedSegmentsHandler = timeUpdateHandler;
  }
}