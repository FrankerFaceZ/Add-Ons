import FollowedChannels from "../../modules/directory/following/followed-channels";
import FollowingStats from "../../modules/directory/following/stats";

export class Directory_Following extends FrankerFaceZ.utilities.module.Module {
  constructor(...args) {
    super(...args);

    this.inject("settings");
    this.inject("i18n");
    this.inject("site");
    this.inject("site.fine");
    this.inject("site.router");
    this.inject("site.elemental");

    this.followedChannels = new FollowedChannels(this);
    this.followingStats = new FollowingStats(this);

    // Directory - Following - Followed Channels - Show channel follow date
    this.settings.add("addon.trubbel.directory.following.followed_channels", {
      default: false,
      requires: ["context.route.name"],
      process(ctx, val) {
        return ctx.get("context.route.name") === "dir-following" ? val : false;
      },
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Directory > Following >> Followed Channels",
        title: "Show channel follow date",
        description: "This will display the date you followed a channel in the [Followed channels](https://twitch.tv/directory/following/channels)-page.",
        component: "setting-check-box"
      },
      changed: val => this.followedChannels.handleSettingChange(val)
    });


    // Directory - Following - Tabs - Enable following stats
    this.settings.add("addon.trubbel.directory.following.tabs", {
      default: false,
      requires: ["context.route.name"],
      process(ctx, val) {
        return ctx.get("context.route.name") === "dir-following" ? val : false;
      },
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Directory > Following >> Tabs",
        title: "Enable following stats",
        component: "setting-check-box"
      },
      changed: val => this.followingStats.handleSettingChange(val)
    });

    // Directory - Following - Tabs - Show total followed channels
    this.settings.add("addon.trubbel.directory.following.tabs.channels", {
      default: false,
      requires: ["addon.trubbel.directory.following.tabs", "context.route.name"],
      process(ctx, val) {
        if (!ctx.get("addon.trubbel.directory.following.tabs"))
          return false;
        return ctx.get("context.route.name") === "dir-following" ? val : false;
      },
      ui: {
        sort: 1,
        path: "Add-Ons > Trubbel\u2019s Utilities > Directory > Following >> Tabs",
        title: "Show total followed channels",
        description: "Display the total number of channels you're following in the `Channels`-tab.",
        component: "setting-check-box"
      },
      changed: val => this.followingStats.handleSettingChange(val)
    });
  }

  onEnable() {
    this.router.on(":route", this.navigate, this);
    this.followedChannels.initialize();
    this.followingStats.initialize();
  }

  async navigate() {
    this.followedChannels.handleNavigation();
    this.followingStats.handleNavigation();
  }
}