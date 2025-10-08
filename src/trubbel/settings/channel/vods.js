import AutoSkipMutedSegments from "../../modules/channel/vods/auto-skip-muted-segments";
import CustomSeeking from "../../modules/channel/vods/custom-seeking";
import ProgressBar from "../../modules/channel/vods/progress-bar";

const { ManagedStyle } = FrankerFaceZ.utilities.dom;

export class Channel_VODs extends FrankerFaceZ.utilities.module.Module {
  constructor(...args) {
    super(...args);

    this.style = new ManagedStyle;

    this.inject("settings");
    this.inject("site");
    this.inject("site.router");

    this.autoSkipMutedSegments = new AutoSkipMutedSegments(this);
    this.customSeeking = new CustomSeeking(this);
    this.progressBar = new ProgressBar(this);

    // Channel - VODs - Progress Bar - Enable Custom Progress Bar
    this.settings.add("addon.trubbel.channel.vods.progress_bar", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > VODs >> Progress Bar",
        title: "Enable Custom Progress Bar",
        description: "Display a custom progress bar at the bottom of VODs, when player controls are not being displayed, works in both fullscreen and normal view.",
        component: "setting-check-box"
      },
      changed: val => this.progressBar.handleSettingChange(val)
    });

    // Channel - VODs - Progress Bar - Progress Bar Position
    this.settings.add("addon.trubbel.channel.vods.progress_bar.position", {
      default: "bottom",
      requires: ["addon.trubbel.channel.vods.progress_bar"],
      process(ctx, val) {
        if (!ctx.get("addon.trubbel.channel.vods.progress_bar"))
          return false;
        return val;
      },
      ui: {
        sort: 1,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > VODs >> Progress Bar",
        title: "Position",
        description: "Choose where to display the progress bar.",
        component: "setting-select-box",
        data: [
          { title: "Bottom", value: "bottom" },
          { title: "Top", value: "top" }
        ]
      },
      changed: val => this.progressBar.updateCSS()
    });



    // Channel - VODs - Seeking - Enable Custom Seeking
    this.settings.add("addon.trubbel.channel.vods.seeking", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > VODs >> Seeking",
        title: "Enable Custom Seeking",
        description: "Twitch defaults the seeking to `10` seconds. Enabling this will let you set a custom amount below.",
        component: "setting-check-box"
      },
      changed: val => this.customSeeking.handleCustomSeekingChange(val)
    });

    // Channel - VODs - Seeking - Custom Seeking Amount
    this.settings.add("addon.trubbel.channel.vods.seeking.amount", {
      default: 30,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > VODs >> Seeking",
        title: "Custom Seeking Amount",
        description: "How many seconds to seek when using arrow keys.",
        component: () => import("../../components/main_menu/setting-slider.vue"),
        min: 1,
        max: 300,
        step: 1,
        unit: "s",
      }
    });

    // Channel - VODs - Seeking - Enable Frame by Frame Seeking
    this.settings.add("addon.trubbel.channel.vods.seeking.fbf", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > VODs >> Seeking",
        title: "Enable Frame by Frame Seeking",
        description: "Use `,` to move backwards and `.` to go forward.\n\n**Note:** If the video isn't paused already when using these shortcuts, it will be automatically paused.",
        component: "setting-check-box"
      },
      changed: val => this.customSeeking.handleFrameByFrameChange(val)
    });



    // Channel - VODs - Segments - Auto-skip muted segments
    this.settings.add("addon.trubbel.channel.vods.segments.skip_muted", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > VODs >> Segments",
        title: "Auto-skip muted segments",
        description: "Automatically detects and skips muted segments.\n\nOnce you reach the start of a muted segment, this will automatically skip to the end of said muted segment.",
        component: "setting-check-box"
      },
      changed: val => this.autoSkipMutedSegments.handleSettingChange(val)
    });

    // Channel - VODs - Segments - Display a notification whenever a muted segment is skipped
    this.settings.add("addon.trubbel.channel.vods.segments.skip_muted.notification", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > VODs >> Segments",
        title: "Display a notification whenever a muted segment is skipped",
        component: "setting-check-box"
      }
    });
  }

  onEnable() {
    this.router.on(":route", this.navigate, this);
    this.autoSkipMutedSegments.initialize();
    this.customSeeking.initialize();
    this.progressBar.initialize();
  }

  async navigate() {
    this.autoSkipMutedSegments.handleNavigation();
    this.customSeeking.handleNavigation();
    this.progressBar.handleNavigation();
  }
}