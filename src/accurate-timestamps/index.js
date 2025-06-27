import { TIMESTAMP_SELECTOR } from "./utilities/constants/selectors";
import { VALID_ROUTES } from "./utilities/constants/types";

import GET_CLIP from "./utilities/graphql/clip_info.gql";
import GET_VIDEO from "./utilities/graphql/video_info.gql";

class AccurateTimestamps extends Addon {
  constructor(...args) {
    super(...args);

    this.inject("i18n");
    this.inject("site");
    this.inject("site.router");

    // Accurate Timestamps - Clips - Enable Custom Timestamps for Clips
    this.settings.add("addon.accurate_timestamps.clips", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Accurate Timestamps >> Clips",
        title: "Enable Custom Timestamps for Clips",
        description: "Show the full timestamp when a clip was created.",
        component: "setting-check-box"
      },
      changed: () => this.checkNavigation()
    });

    // Accurate Timestamps - Clips - Timestamp Format
    this.settings.add("addon.accurate_timestamps.clips-format", {
      default: "medium",
      ui: {
        sort: 1,
        path: "Add-Ons > Accurate Timestamps >> Clips",
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
        this.checkNavigation();
      }
    });

    // Accurate Timestamps - Clips - Include Relative Timestamp
    this.settings.add("addon.accurate_timestamps.clips-relative", {
      default: false,
      ui: {
        sort: 2,
        path: "Add-Ons > Accurate Timestamps >> Clips",
        title: "Include Relative Timestamp",
        description: "Display a relative timestamp, such as `(2 days ago)`, `(2 months ago)`, `(2 years ago)` at the end.",
        component: "setting-check-box"
      },
      changed: () => this.checkNavigation()
    });


    // Accurate Timestamps - Videos - Enable Custom Timestamps for Videos
    this.settings.add("addon.accurate_timestamps.videos", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Accurate Timestamps >> Videos",
        title: "Enable Custom Timestamps for Videos",
        description: "Show the full timestamp when a video was created.",
        component: "setting-check-box"
      },
      changed: () => this.checkNavigation()
    });

    // Accurate Timestamps - Videos - Timestamp Format
    this.settings.add("addon.accurate_timestamps.videos-format", {
      default: "medium",
      ui: {
        sort: 1,
        path: "Add-Ons > Accurate Timestamps >> Videos",
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
        this.checkNavigation();
      }
    });

    // Accurate Timestamps - Videos - Include Relative Timestamp
    this.settings.add("addon.accurate_timestamps.videos-relative", {
      default: false,
      ui: {
        sort: 2,
        path: "Add-Ons > Accurate Timestamps >> Videos",
        title: "Include Relative Timestamp",
        description: "Display a relative timestamp, such as `(2 days ago)`, `(2 months ago)`, `(2 years ago)` at the end.",
        component: "setting-check-box"
      },
      changed: () => this.checkNavigation()
    });
  }

  onEnable() {
    this.router.on(":route", this.checkNavigation, this);
    this.checkNavigation();
  }

  async checkNavigation() {
    if (VALID_ROUTES.includes(this.router.current?.name)) {
      const media = await this.getIdFromURL();
      if (!media) return;

      if (!this.settings.get("addon.accurate_timestamps.clips") && media.type === "clip") return;
      if (!this.settings.get("addon.accurate_timestamps.videos") && media.type === "video") return;

      const createdAt = await this.fetchTimestamp(media.type, media.id);
      if (createdAt) {
        await this.updateTimestamp(createdAt);
      }
    }
  }

  async getIdFromURL() {
    if (location.hostname === "clips.twitch.tv" || location.pathname.includes("/clip/")) {
      const clipId = location.hostname === "clips.twitch.tv"
        ? location.pathname.slice(1)
        : location.pathname.split("/clip/")[1];

      if (clipId) {
        if (!this.settings.get("addon.accurate_timestamps.clips")) return;
        return { type: "clip", id: clipId };
      }
    }

    const videoId = location.pathname.match(/\/videos\/(\d+)/);
    if (videoId) {
      if (!this.settings.get("addon.accurate_timestamps.videos")) return;
      return { type: "video", id: videoId[1] };
    }

    return null;
  }

  async fetchTimestamp(type, id) {
    try {
      const apollo = this.resolve("site.apollo");
      if (!apollo) {
        this.log.error("[Accurate Timestamps] Apollo client not resolved.");
        return null;
      }

      const query = type === "clip" ? GET_CLIP : GET_VIDEO;
      const variables = type === "clip" ? { slug: id } : { id };

      const result = await apollo.client.query({
        query,
        variables,
      });

      return type === "clip"
        ? result?.data?.clip?.createdAt
        : result?.data?.video?.createdAt;
    } catch (error) {
      this.log.error(`[Accurate Timestamps] Error fetching ${type} data:`, error);
      return null;
    }
  }

  async updateTimestamp(createdAt) {
    const element = await this.site.awaitElement(TIMESTAMP_SELECTOR, document.documentElement, 15000);
    if (!element) {
      this.log.error("[Accurate Timestamps] Timestamp element not found.");
      return;
    }

    const media = await this.getIdFromURL();
    if (!media) {
      this.log.error("[Accurate Timestamps] Unable to get ID from URL.");
      return null;
    }

    let relative = "";
    if ((media.type === "clip" && this.settings.get("addon.accurate_timestamps.clips-relative")) ||
      (media.type === "video" && this.settings.get("addon.accurate_timestamps.videos-relative"))) {
      relative = `(${this.i18n.toRelativeTime(createdAt)})`;
    }

    const format = media.type === "clip"
      ? this.settings.get("addon.accurate_timestamps.clips-format")
      : this.settings.get("addon.accurate_timestamps.videos-format");

    const timestamp = this.i18n.formatDateTime(createdAt, format);

    element.textContent = `${timestamp} ${relative}`;
  }
}

AccurateTimestamps.register();