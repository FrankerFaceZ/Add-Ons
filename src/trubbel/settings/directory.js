import { FollowingChannelsFollowage } from "../modules/directory/following/following-channels-followage";
import { FollowingChannelsStats } from "../modules/directory/following/following-channels-stats";
import { ThumbnailPreviews } from "../modules/directory/thumbnails/preview";

const { createElement, ManagedStyle } = FrankerFaceZ.utilities.dom;

export class Directory extends FrankerFaceZ.utilities.module.Module {
  constructor(...args) {
    super(...args);

    this.style = new ManagedStyle;

    this.inject("settings");
    this.inject("i18n");
    this.inject("site");
    this.inject("site.fine");
    this.inject("site.elemental");
    this.inject("site.router");

    this.followageDate = new FollowingChannelsFollowage(this);
    this.followingChannels = new FollowingChannelsStats(this);
    this.thumbnailPreviews = new ThumbnailPreviews(this);

    // Directory - Following - Show Channel Follow Date
    this.settings.add("addon.trubbel.directory.show-followage", {
      default: false,
      requires: ["context.route.name"],
      process(ctx, val) {
        return ctx.get("context.route.name") === "dir-following" ? val : false;
      },
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Directory >> Followed Channels",
        title: "Show Channel Follow Date",
        description: "This will display the date you followed a channel in the [Followed channels](https://twitch.tv/directory/following/channels)-page.",
        component: "setting-check-box"
      },
      changed: (val) => {
        this.log.info("[Directory] Show followage setting changed to:", val);
        this.followageDate.handleSettingChange(val);
      }
    });

    // Directory - Following - Enable Following Stats
    this.settings.add("addon.trubbel.directory.show-stats", {
      default: false,
      requires: ["context.route.name"],
      process(ctx, val) {
        return ctx.get("context.route.name") === "dir-following" ? val : false;
      },
      ui: {
        sort: 1,
        path: "Add-Ons > Trubbel\u2019s Utilities > Directory >> Following - Tabs",
        title: "Enable Following Stats",
        component: "setting-check-box"
      },
      changed: (val) => {
        this.log.info("[Directory] Following Stats setting changed to:", val);
        this.followingChannels.handleSettingChange(val);
      }
    });

    // Directory - Following - Show Total Followed Channels
    this.settings.add("addon.trubbel.directory.show-stats-channels", {
      default: false,
      requires: ["addon.trubbel.directory.show-stats", "context.route.name"],
      process(ctx, val) {
        if (!ctx.get("addon.trubbel.directory.show-stats"))
          return false;
        return ctx.get("context.route.name") === "dir-following" ? val : false;
      },
      ui: {
        sort: 2,
        path: "Add-Ons > Trubbel\u2019s Utilities > Directory >> Following - Tabs",
        title: "Show Total Followed Channels",
        description: "Display the total number of channels you're following in the `Channels`-tab.",
        component: "setting-check-box"
      },
      changed: (val) => {
        this.log.info("[Directory] Show channels count setting changed to:", val);
        this.followingChannels.handleSettingChange(val);
      }
    });


    // Directory - Thumbnails - Enable Thumbnail Previews
    this.settings.add("addon.trubbel.directory.thumbnail-preview", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Directory >> Thumbnails",
        title: "Enable Thumbnail Previews",
        description: "Show previews when hovering over thumbnails in the directory.\n\n**Note:** For this to work properly, make sure your browser has granted **Autoplay** and **Sound** permissions for `player.twitch.tv`.",
        component: "setting-check-box"
      },
      changed: () => this.thumbnailPreviews.handleSettingChange()
    });

    // Directory - Thumbnails - Preview Quality
    this.settings.add("addon.trubbel.directory.thumbnail-preview-quality", {
      default: "160p30",
      requires: ["addon.trubbel.directory.thumbnail-preview"],
      process(ctx, val) {
        if (!ctx.get("addon.trubbel.directory.thumbnail-preview"))
          return false;
        return val;
      },
      ui: {
        sort: 1,
        path: "Add-Ons > Trubbel\u2019s Utilities > Directory >> Thumbnails",
        title: "Preview Quality",
        component: "setting-select-box",
        data: [
          { title: "Auto", value: "auto" },
          { title: "Source", value: "chunked" },
          { title: "1080p60", value: "1080p60" },
          { title: "720p60", value: "720p60" },
          { title: "720p", value: "720p30" },
          { title: "480p", value: "480p30" },
          { title: "360p", value: "360p30" },
          { title: "160p", value: "160p30" }
        ]
      },
      changed: () => this.thumbnailPreviews.handleSettingChange()
    });

    // Directory - Thumbnails - Enable Audio for Previews
    this.settings.add("addon.trubbel.directory.thumbnail-preview-audio", {
      default: false,
      requires: ["addon.trubbel.directory.thumbnail-preview"],
      process(ctx, val) {
        if (!ctx.get("addon.trubbel.directory.thumbnail-preview"))
          return false;
        return val;
      },
      ui: {
        sort: 2,
        path: "Add-Ons > Trubbel\u2019s Utilities > Directory >> Thumbnails",
        title: "Enable Audio for Previews",
        description: "Please keep in mind that this is using your default volume for streams. Some streams may be loud.",
        component: "setting-check-box"
      },
      changed: () => this.thumbnailPreviews.handleSettingChange()
    });

    this.FollowingCard = this.elemental.define(
      "following-card",
      ".channel-follow-listing--card",
      ["dir-following"], null, 0, 0
    );
  }

  async onEnable() {
    this.FollowingCard.on("mount", this.followageDate.updateFollowingCard, this);
    this.FollowingCard.on("mutate", this.followageDate.updateFollowingCard, this);
    this.FollowingCard.on("unmount", this.followageDate.clearFollowageDate, this);
    this.FollowingCard.each(el => this.followageDate.updateFollowingCard(el));

    this.router.on(":route", this.navigate, this);
    this.followingChannels.initialize();
    this.followageDate.initialize();
    this.thumbnailPreviews.initialize();
  }

  async navigate() {
    this.followingChannels.handleNavigation();
    this.thumbnailPreviews.handleNavigation();
  }
}