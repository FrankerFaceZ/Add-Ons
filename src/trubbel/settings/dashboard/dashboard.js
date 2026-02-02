import VideoDeletionDate from "../../modules/dashboard/video-producer";

export class Dashboard extends FrankerFaceZ.utilities.module.Module {
  constructor(...args) {
    super(...args);

    this.inject("settings");
    this.inject("i18n");
    this.inject("site");
    this.inject("site.fine");
    this.inject("site.router");

    this.videoDeletionDate = new VideoDeletionDate(this);

    // Dashboard - Video Producer - Deletion - Show Video Deletion Date
    this.settings.add("addon.trubbel.dashboard.video_producer.deletion_date", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Dashboard > Video Producer >> Deletion",
        title: "Show Video Deletion Date",
        description: "Always display when past broadcasts are scheduled for deletion.",
        component: "setting-check-box"
      },
      changed: val => this.videoDeletionDate.handleSettingChange(val)
    });
  }

  onEnable() {
    this.router.on(":route", this.navigate, this);
    this.videoDeletionDate.initialize();
  }

  async navigate() {
    this.videoDeletionDate.handleNavigation();
  }
}