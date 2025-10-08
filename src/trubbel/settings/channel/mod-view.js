import ActivityFeedModeration from "../../modules/channel/mod-view/activity-feed-moderation";
import ActivityFeedTooltip from "../../modules/channel/mod-view/activity-feed-tooltip";
import AutoModView from "../../modules/channel/mod-view/auto";

const { ManagedStyle } = FrankerFaceZ.utilities.dom;

export class Channel_ModView extends FrankerFaceZ.utilities.module.Module {
  constructor(...args) {
    super(...args);

    this.style = new ManagedStyle;

    this.inject("settings");
    this.inject("i18n");
    this.inject("site");
    this.inject("site.fine");
    this.inject("site.router");
    this.inject("site.elemental");

    this.activityFeedModeration = new ActivityFeedModeration(this);
    this.activityFeedTooltip = new ActivityFeedTooltip(this);
    this.autoModView = new AutoModView(this);

    // Channel - Mod View - Activity Feed - Enable Right-Click Context Menu
    this.settings.add("addon.trubbel.channel.mod_view.activity_feed.context", {
      default: false,
      requires: ["context.moderator"],
      process(ctx, val) {
        return ctx.get("context.moderator") ? val : false;
      },
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Mod View >> Activity Feed",
        title: "Enable Right-Click Context Menu",
        description: "This will let you moderate through the activity feed, right clicking anywhere in the feed will bring up a menu.",
        component: "setting-check-box"
      },
      changed: () => this.activityFeedModeration.initialize()
    });

    // Channel - Mod View - Activity Feed - Show emote and cheer tooltips on hover
    this.settings.add("addon.trubbel.channel.mod_view.activity_feed.tooltips", {
      default: false,
      requires: ["context.moderator"],
      process(ctx, val) {
        return ctx.get("context.moderator") ? val : false;
      },
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Mod View >> Activity Feed",
        title: "Show emote and cheer tooltips on hover",
        component: "setting-check-box"
      },
      changed: val => this.activityFeedTooltip.handleSettingChange(val)
    });



    // Channel - Mod View - Auto - Enable Auto Mod View
    this.settings.add("addon.trubbel.channel.mod_view.auto", {
      default: false,
      requires: ["context.moderator"],
      process(ctx, val) {
        return ctx.get("context.moderator") ? val : false;
      },
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Mod View >> Auto",
        title: "Enable Auto Mod View",
        description: "Automatically changes to mod view if you are a moderator of current channel.",
        component: "setting-check-box"
      },
      changed: () => this.autoModView.initialize()
    });
  }

  onEnable() {
    this.router.on(":route", this.navigate, this);
    this.activityFeedModeration.initialize();
    this.activityFeedTooltip.initialize();
    this.autoModView.initialize();
  }

  async navigate() {
    this.activityFeedModeration.handleNavigation();
    this.activityFeedTooltip.handleNavigation();
    this.autoModView.handleNavigation();
  }
}