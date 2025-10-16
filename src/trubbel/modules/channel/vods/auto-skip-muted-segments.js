import { formatTime } from "../../../utilities/format";
import { notification } from "../../../utilities/notification";

export default class AutoSkipMutedSegments {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.router = parent.router;
    this.site = parent.site;
    this.log = parent.log;

    this.isActive = false;
    this.currentVideoUrl = null;
    this.video = null;
    this.seekbar = null;
    this.mutedSegments = [];
    this.isSkipping = false;
    this.lastUpdateTime = 0;
    this.observers = [];

    this.handleNavigation = this.handleNavigation.bind(this);
    this.enableAutoSkip = this.enableAutoSkip.bind(this);
    this.disableAutoSkip = this.disableAutoSkip.bind(this);
    this.handleSettingChange = this.handleSettingChange.bind(this);
    this.onTimeUpdate = this.onTimeUpdate.bind(this);
    this.onLoadedMetadata = this.onLoadedMetadata.bind(this);
    this.onDurationChange = this.onDurationChange.bind(this);
    this.initializeVideoMonitoring = this.initializeVideoMonitoring.bind(this);
    this.setupVideoMonitoring = this.setupVideoMonitoring.bind(this);
    this.setupSeekbarMonitoring = this.setupSeekbarMonitoring.bind(this);
    this.parseMutedSegments = this.parseMutedSegments.bind(this);
    this.checkForMutedSegment = this.checkForMutedSegment.bind(this);
    this.skipToTime = this.skipToTime.bind(this);
    this.updateMutedSegments = this.updateMutedSegments.bind(this);
  }

  initialize() {
    const enabled = this.settings.get("addon.trubbel.channel.vods.segments.skip_muted");
    if (enabled) {
      this.handleNavigation();
    } else {
      this.disableAutoSkip();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.log.info("[Auto Skip Muted Segments] Enabling auto-skip muted segments");
      this.handleNavigation();
    } else {
      this.log.info("[Auto Skip Muted Segments] Disabling auto-skip muted segments");
      this.disableAutoSkip();
    }
  }

  getVideoId(url) {
    const match = url?.match(/\/videos\/(\d+)/);
    return match ? match[1] : "unknown";
  }

  handleNavigation() {
    const currentRoute = this.router?.current?.name;
    const currentVideoUrl = this.router?.location;
    if (currentRoute === "video") {
      const enabled = this.settings.get("addon.trubbel.channel.vods.segments.skip_muted");

      if (enabled) {
        if (this.currentVideoUrl !== currentVideoUrl) {
          const oldVideoId = this.getVideoId(this.currentVideoUrl);
          const newVideoId = this.getVideoId(currentVideoUrl);
          this.log.info(`[Auto Skip Muted Segments] Video changed: ${oldVideoId} → ${newVideoId}`);

          if (this.isActive) {
            this.log.info("[Auto Skip Muted Segments] Cleaning up previous video");
            this.disableAutoSkip();
          }

          this.currentVideoUrl = currentVideoUrl;
          this.log.info(`[Auto Skip Muted Segments] Enabling for new video: ${newVideoId}`);
          this.enableAutoSkip();
        } else if (!this.isActive) {
          const videoId = this.getVideoId(currentVideoUrl);
          this.log.info(`[Auto Skip Muted Segments] Entering video page, enabling auto-skip for: ${videoId}`);
          this.currentVideoUrl = currentVideoUrl;
          this.enableAutoSkip();
        }
      } else if (this.isActive) {
        this.log.info("[Auto Skip Muted Segments] Setting disabled, disabling auto-skip");
        this.disableAutoSkip();
      }
    } else {
      if (this.isActive) {
        this.log.info("[Auto Skip Muted Segments] Leaving video page, disabling auto-skip");
        this.disableAutoSkip();
      }
      this.currentVideoUrl = null;
    }
  }

  async enableAutoSkip() {
    if (this.isActive) return;

    this.log.info("[Auto Skip Muted Segments] Setting up auto-skip muted segments");
    this.isActive = true;

    this.mutedSegments = [];
    this.isSkipping = false;
    this.lastUpdateTime = 0;

    setTimeout(() => {
      this.initializeVideoMonitoring();
    }, 1000);
  }

  disableAutoSkip() {
    if (!this.isActive) return;

    this.log.info("[Auto Skip Muted Segments] Removing auto-skip muted segments");

    if (this.video) {
      this.video.removeEventListener("timeupdate", this.onTimeUpdate);
      this.video.removeEventListener("loadedmetadata", this.onLoadedMetadata);
      this.video.removeEventListener("durationchange", this.onDurationChange);
    }

    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];

    this.video = null;
    this.seekbar = null;
    this.mutedSegments = [];
    this.isSkipping = false;
    this.lastUpdateTime = 0;
    this.isActive = false;
  }

  async initializeVideoMonitoring() {
    if (!this.isActive) return;

    const videoId = this.getVideoId(this.currentVideoUrl);

    try {
      this.log.info(`[Auto Skip Muted Segments] Waiting for video player (${videoId})...`);
      this.video = await this.site.awaitElement(".video-player video", document.documentElement, 5000);
      this.log.info(`[Auto Skip Muted Segments] Video player found (${videoId})`);

      this.log.info(`[Auto Skip Muted Segments] Waiting for seekbar (${videoId})...`);
      this.seekbar = await this.site.awaitElement(".seekbar-bar", document.documentElement, 5000);
      this.log.info(`[Auto Skip Muted Segments] Seekbar found (${videoId})`);

      await new Promise(resolve => setTimeout(resolve, 2000));

      this.setupVideoMonitoring();
      this.setupSeekbarMonitoring();

      this.mutedSegments = this.parseMutedSegments(true);

      this.log.info(`[Auto Skip Muted Segments] Auto-skip initialized successfully for video: ${videoId}`);

    } catch (error) {
      this.log.error(`[Auto Skip Muted Segments] Failed to initialize auto-skip for video ${videoId}:`, error);
    }
  }

  setupVideoMonitoring() {
    if (!this.video || !this.isActive) return;

    this.video.addEventListener("timeupdate", this.onTimeUpdate);
    this.video.addEventListener("loadedmetadata", this.onLoadedMetadata);
    this.video.addEventListener("durationchange", this.onDurationChange);

    this.log.info("[Auto Skip Muted Segments] Video monitoring setup complete");
  }

  setupSeekbarMonitoring() {
    if (!this.seekbar || !this.isActive) return;

    const observer = new MutationObserver(() => {
      if (this.isActive) {
        this.updateMutedSegments();
      }
    });

    observer.observe(this.seekbar, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style"]
    });

    this.observers.push(observer);
    this.log.info("[Auto Skip Muted Segments] Seekbar monitoring setup complete");
  }

  onTimeUpdate() {
    if (!this.isActive) return;
    this.updateMutedSegments();
    this.checkForMutedSegment();
  }

  onLoadedMetadata() {
    if (!this.isActive) return;
    setTimeout(() => {
      const newSegments = this.parseMutedSegments();
      if (this.segmentsChanged(this.mutedSegments, newSegments)) {
        this.mutedSegments = newSegments;
        this.log.info("[Auto Skip Muted Segments] Segments updated after metadata load");
      }
    }, 1000);
  }

  onDurationChange() {
    if (!this.isActive) return;
    setTimeout(() => {
      const newSegments = this.parseMutedSegments();
      if (this.segmentsChanged(this.mutedSegments, newSegments)) {
        this.mutedSegments = newSegments;
        this.log.info("[Auto Skip Muted Segments] Segments updated after duration change");
      }
    }, 1000);
  }

  parseMutedSegments(logResults = false) {
    if (!this.seekbar || !this.video || !this.isActive) return [];

    const rawSegments = [];
    const seekbarSegments = this.seekbar.querySelectorAll(".seekbar-segment");
    const totalDuration = this.video.duration;

    if (!totalDuration) {
      if (logResults) {
        this.log.info("[Auto Skip Muted Segments] Video duration not available yet, no segments to parse");
      }
      return [];
    }

    seekbarSegments.forEach(segment => {
      const style = segment.style;
      const bgColor = style.backgroundColor;

      if (bgColor && bgColor.includes("rgba(212, 73, 73, 0.5)")) {
        const insetStart = style.insetInlineStart || style.left;
        const width = style.width;

        if (insetStart && width) {
          const segmentStart = parseFloat(insetStart) / 100 * totalDuration;
          const segmentEnd = segmentStart + parseFloat(width) / 100 * totalDuration;

          rawSegments.push({
            start: segmentStart,
            end: segmentEnd,
            element: segment
          });
        }
      }
    });

    if (logResults) {
      if (rawSegments.length === 0) {
        this.log.info("[Auto Skip Muted Segments] No muted segments found in this video");
      } else {
        this.log.info(`[Auto Skip Muted Segments] Found ${rawSegments.length} individual muted segments`);
      }
    }

    if (rawSegments.length === 0) return [];

    rawSegments.sort((a, b) => a.start - b.start);
    const mergedSegments = [];
    let currentBlock = { ...rawSegments[0] };

    for (let i = 1; i < rawSegments.length; i++) {
      const segment = rawSegments[i];
      const gap = segment.start - currentBlock.end;

      if (gap <= 1.0) {
        currentBlock.end = Math.max(currentBlock.end, segment.end);
      } else {
        mergedSegments.push(currentBlock);
        currentBlock = { ...segment };
      }
    }

    mergedSegments.push(currentBlock);

    if (logResults && rawSegments.length > 0) {
      this.log.info(`[Auto Skip Muted Segments] Found ${rawSegments.length} individual muted segments, merged into ${mergedSegments.length} blocks:`, mergedSegments);
    }

    return mergedSegments;
  }

  checkForMutedSegment() {
    if (!this.video || this.isSkipping || this.mutedSegments.length === 0 || !this.isActive) return;

    const currentTime = this.video.currentTime;
    const lookAheadTime = 0.5;

    for (let segment of this.mutedSegments) {
      if (currentTime >= segment.start - lookAheadTime && currentTime < segment.end) {
        const startTime = formatTime(segment.start);
        const endTime = formatTime(segment.end);
        const segmentDuration = formatTime(segment.end - segment.start);

        this.skipToTime(segment.end);

        this.log.info(`[Auto Skip Muted Segments] Skipped muted segment: ${startTime} → ${endTime} (${segmentDuration} duration)`);

        if (this.settings.get("addon.trubbel.channel.vods.segments.skip_muted.notification")) {
          notification("🔇", `Skipped muted segment: ${startTime} → ${endTime} (${segmentDuration} duration)`, 12000);
        }
        break;
      }
    }
  }

  skipToTime(time) {
    if (!this.video || this.isSkipping || !this.isActive) return;

    this.isSkipping = true;
    this.video.currentTime = Math.min(time + 0.1, this.video.duration);

    setTimeout(() => {
      this.isSkipping = false;
    }, 1000);
  }

  updateMutedSegments() {
    if (!this.isActive) return;

    const now = Date.now();
    if (now - this.lastUpdateTime < 5000) return;

    this.lastUpdateTime = now;
    const newSegments = this.parseMutedSegments();

    if (this.segmentsChanged(this.mutedSegments, newSegments)) {
      this.mutedSegments = newSegments;
      if (newSegments.length === 0) {
        this.log.info("[Auto Skip Muted Segments] Updated: No muted segments found");
      } else {
        this.log.info(`[Auto Skip Muted Segments] Updated: Found ${this.getTotalRawSegments()} individual muted segments, merged into ${newSegments.length} blocks`);
      }
    }
  }

  segmentsChanged(oldSegments, newSegments) {
    if (oldSegments.length !== newSegments.length) return true;

    for (let i = 0; i < oldSegments.length; i++) {
      const oldSeg = oldSegments[i];
      const newSeg = newSegments[i];
      if (Math.abs(oldSeg.start - newSeg.start) > 0.1 || Math.abs(oldSeg.end - newSeg.end) > 0.1) {
        return true;
      }
    }

    return false;
  }

  getTotalRawSegments() {
    if (!this.seekbar || !this.video || !this.isActive) return 0;

    const seekbarSegments = this.seekbar.querySelectorAll(".seekbar-segment");
    let count = 0;

    seekbarSegments.forEach(segment => {
      const bgColor = segment.style.backgroundColor;
      if (bgColor && bgColor.includes("rgba(212, 73, 73, 0.5)")) {
        count++;
      }
    });

    return count;
  }
}