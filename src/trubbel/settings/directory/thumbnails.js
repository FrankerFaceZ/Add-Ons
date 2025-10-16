import ThumbnailPreviews from "../../modules/directory/thumbnails/previews";

export class Directory_Thumbnails extends FrankerFaceZ.utilities.module.Module {
  constructor(...args) {
    super(...args);

    this.inject("settings");
    this.inject("site.router");

    this.thumbnailPreviews = new ThumbnailPreviews(this);

    // Directory - Thumbnails - Preview - Enable Thumbnail Previews
    this.settings.add("addon.trubbel.directory.thumbnails.preview", {
      default: false,
      requires: ["context.location"],
      process(ctx, val) {
        return ctx.get("context.location").pathname?.startsWith("/directory/") ? val : false;
      },
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Directory > Thumbnails >> Preview",
        title: "Enable Thumbnail Previews",
        description: "Show previews when hovering over thumbnails in the directory.\n\n**Note:** For this to work properly, make sure your browser has granted **Autoplay** and **Sound** permissions for `player.twitch.tv`.",
        component: "setting-check-box"
      },
      changed: val => this.thumbnailPreviews.handleSettingChange(val)
    });

    // Directory - Thumbnails - Preview - Preview Quality
    this.settings.add("addon.trubbel.directory.thumbnails.preview.quality", {
      default: "160p30",
      requires: ["addon.trubbel.directory.thumbnails.preview"],
      process(ctx, val) {
        if (!ctx.get("addon.trubbel.directory.thumbnails.preview"))
          return false;
        return val;
      },
      ui: {
        sort: 1,
        path: "Add-Ons > Trubbel\u2019s Utilities > Directory > Thumbnails >> Preview",
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
      changed: val => this.thumbnailPreviews.handleSettingChange(val)
    });

    // Directory - Thumbnails - Preview - Enable Audio for Previews
    this.settings.add("addon.trubbel.directory.thumbnails.preview.audio", {
      default: false,
      requires: ["addon.trubbel.directory.thumbnails.preview"],
      process(ctx, val) {
        if (!ctx.get("addon.trubbel.directory.thumbnails.preview"))
          return false;
        return val;
      },
      ui: {
        sort: 2,
        path: "Add-Ons > Trubbel\u2019s Utilities > Directory > Thumbnails >> Preview",
        title: "Enable Audio for Previews",
        description: "Please keep in mind that this is using your default volume for streams. Some streams may be loud.",
        component: "setting-check-box"
      },
      changed: val => this.thumbnailPreviews.handleSettingChange(val)
    });
  }

  onEnable() {
    this.router.on(":route", this.navigate, this);
    this.thumbnailPreviews.initialize();
  }

  async navigate() {
    this.thumbnailPreviews.handleNavigation();
  }
}