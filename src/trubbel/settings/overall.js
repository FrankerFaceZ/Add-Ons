import SETTING_SLIDER from "../components/main_menu/styles/setting-slider.scss";

import { PrimeReminder } from "../modules/twilight/prime/reminder";
import { SidebarPreview } from "../modules/twilight/sidebar/preview";
import { ResizableDropDown } from "../modules/twilight/whispers/resizable-drop-down";

const { createElement, ManagedStyle } = FrankerFaceZ.utilities.dom;

export class Overall extends FrankerFaceZ.utilities.module.Module {
  constructor(...args) {
    super(...args);

    this.style = new ManagedStyle;

    this.inject("settings");
    this.inject("site");
    this.inject("site.fine");
    this.inject("site.router");
    this.inject("site.elemental");
    this.inject("site.twitch_data");

    this.primeReminder = new PrimeReminder(this);
    this.sidebarPreview = new SidebarPreview(this);
    this.resizableDropDown = new ResizableDropDown(this);

    // Overall - Sidebar - Enable Sidebar Previews
    this.settings.add("addon.trubbel.overall.sidebar-preview", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall >> Sidebar",
        title: "Enable Sidebar Previews",
        description: "Show previews when hovering over channels in the sidebar.\n\n**Note:** For this to work properly, make sure your browser has granted **Autoplay** and **Sound** permissions for `player.twitch.tv`.",
        component: "setting-check-box"
      },
      changed: val => {
        this.log.info("[Sidebar Preview] Stream Previews setting changed:", val);
        if (val) {
          this.SideBar.each(el => this.sidebarPreview.updateSidebar(el));
        } else {
          this.sidebarPreview.hidePreview();
          this.SideBar.each(el => this.sidebarPreview.clearSidebar(el));
        }
      }
    });

    // Overall - Sidebar - Preview Delay
    this.settings.add("addon.trubbel.overall.sidebar-preview-delay", {
      default: 500,
      ui: {
        sort: 1,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall >> Sidebar",
        title: "Preview Delay",
        description: "How long to hover before showing the preview (in milliseconds). Use `0` for no delay.",
        component: "setting-text-box",
        process(val) {
          const cleanVal = val.toString().replace(/[^\d]/g, "");
          const num = parseInt(cleanVal, 10);
          if (isNaN(num) || num < 0 || num > 5000) return 500;
          return num;
        }
      }
    });

    // Overall - Sidebar - Preview Size
    this.settings.add("addon.trubbel.overall.sidebar-preview-size", {
      default: 480,
      ui: {
        sort: 2,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall >> Sidebar",
        title: "Preview Size",
        description: "Adjust the size of the preview popup.",
        component: () => import("../components/main_menu/setting-slider.vue"),
        min: 280,
        max: 1000,
        step: 10,
        ratio: 16 / 9,
        unit: "px"
      },
      changed: val => {
        this.log.info("[Sidebar Preview] Stream Preview Size setting changed:", val);
        this.sidebarPreview.updatePreviewSize();
      }
    });

    // Overall - Sidebar - Enable Audio for Previews
    this.settings.add("addon.trubbel.overall.sidebar-preview-audio", {
      default: false,
      ui: {
        sort: 3,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall >> Sidebar",
        title: "Enable Audio for Previews",
        description: "Please keep in mind that this is using your default volume for streams. Some streams may be loud.",
        component: "setting-check-box"
      }
    });

    // Overall - Sidebar - Preview Quality
    this.settings.add("addon.trubbel.overall.sidebar-preview-quality", {
      default: "160p30",
      ui: {
        sort: 4,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall >> Sidebar",
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
      }
    });

    // Overall - Sidebar - Show Stream Uptime
    this.settings.add("addon.trubbel.overall.sidebar-preview-show-uptime", {
      default: false,
      ui: {
        sort: 5,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall >> Sidebar",
        title: "Show Stream Uptime",
        component: "setting-check-box"
      }
    });

    // Overall - Sidebar - Show Stream Title
    this.settings.add("addon.trubbel.overall.sidebar-preview-show-title", {
      default: false,
      ui: {
        sort: 5,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall >> Sidebar",
        title: "Show Stream Title",
        description: "Display the stream title below the preview.",
        component: "setting-check-box"
      }
    });

    // Overall - Sidebar - Show Stream Category
    this.settings.add("addon.trubbel.overall.sidebar-preview-show-category", {
      default: false,
      ui: {
        sort: 6,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall >> Sidebar",
        title: "Show Stream Category",
        description: "Display the stream category below the preview.",
        component: "setting-check-box"
      }
    });

    // Overall - Sidebar - Show Viewer Count
    this.settings.add("addon.trubbel.overall.sidebar-preview-show-viewer_count", {
      default: false,
      ui: {
        sort: 7,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall >> Sidebar",
        title: "Show Viewer Count",
        description: "Display the viewer count below the preview.",
        component: "setting-check-box"
      }
    });

    // Overall - Sidebar - Show Hype Train
    this.settings.add("addon.trubbel.overall.sidebar-preview-show-hype_train", {
      default: false,
      ui: {
        sort: 8,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall >> Sidebar",
        title: "Show Hype Train",
        description: "Display hype train information when available.",
        component: "setting-check-box"
      }
    });

    // Overall - Sidebar - Show Gift Discount
    this.settings.add("addon.trubbel.overall.sidebar-preview-show-gift_discount", {
      default: false,
      ui: {
        sort: 9,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall >> Sidebar",
        title: "Show Gift Discount",
        description: "Display gift discount information when available.",
        component: "setting-check-box"
      }
    });

    // Overall - Sidebar - Show Stream Guests
    this.settings.add("addon.trubbel.overall.sidebar-preview-show-guests", {
      default: false,
      ui: {
        sort: 10,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall >> Sidebar",
        title: "Show Stream Guests",
        description: "Display guest information when available.",
        component: "setting-check-box"
      }
    });

    // Overall - Sidebar - Tooltip Background
    this.settings.add("addon.trubbel.overall.sidebar-preview-tooltip-background", {
      default: "#1f1f23",
      ui: {
        sort: 11,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall >> Sidebar",
        title: "Tooltip Background",
        component: "setting-color-box",
        openUp: true
      }
    });

    // Overall - Sidebar - Tooltip Title
    this.settings.add("addon.trubbel.overall.sidebar-preview-tooltip-title", {
      default: "#dedee3",
      ui: {
        sort: 12,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall >> Sidebar",
        title: "Tooltip Title",
        component: "setting-color-box",
        openUp: true
      }
    });

    // Overall - Sidebar - Tooltip Text
    this.settings.add("addon.trubbel.overall.sidebar-preview-tooltip-text", {
      default: "#adadb8",
      ui: {
        sort: 13,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall >> Sidebar",
        title: "Tooltip Text",
        component: "setting-color-box",
        openUp: true
      }
    });

    // Overall - Sidebar - Tooltip Border
    this.settings.add("addon.trubbel.overall.sidebar-preview-tooltip-border", {
      default: "#26262c",
      ui: {
        sort: 14,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall >> Sidebar",
        title: "Tooltip Border",
        component: "setting-color-box",
        openUp: true
      }
    });

    // Overall - Sidebar - Hide Native Sidebar Tooltip
    this.settings.add("addon.trubbel.overall.sidebar-preview-hide-native-tooltip", {
      default: false,
      ui: {
        sort: 15,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall >> Sidebar",
        title: "Hide Native Sidebar Tooltip",
        component: "setting-check-box"
      },
      changed: () => this.updateCSS()
    });


    // Overall - Subscription - Yet Another Prime Reminder
    this.settings.add("addon.trubbel.overall.subscription-yapr", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall >> Subscription",
        title: "Yet Another Prime Reminder (Experimental)",
        description: "You can only use this option if you currently have Prime; otherwise, it will automatically disable itself.\n\n**Notes:**\n\n• This checks once every hour to see if you have Prime and whether it is available.\n\n• If your Prime is available, a crown will be displayed next to the search bar at the top of the page.\n\n• Even if you use your Prime, the crown won't disappear until the next check occurs.",
        component: "setting-check-box"
      },
      changed: val => {
        this.log.info("[Yet Another Prime Reminder] Setting changed:", val);
        this.primeReminder.handleSettingChange(val);
      }
    });


    // Overall - Whispers - Enable Resizable Drop Down
    this.settings.add("addon.trubbel.overall.whispers-resizable", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall >> Whispers",
        title: "Enable Resizable Drop Down",
        description: "Gives the ability to adjust the height of the whisper window drop down.",
        component: "setting-check-box"
      },
      changed: val => {
        this.log.info("[Whisper Resize] Resizable drop down setting changed:", val);
        this.resizableDropDown.handleSettingChange(val);
      }
    });

    this.SideBar = this.elemental.define(
      "sidebar",
      ".side-bar-contents",
      null, null, 0
    );
  }

  onEnable() {
    this.SideBar.on("mount", this.sidebarPreview.updateSidebar, this);
    this.SideBar.on("mutate", this.sidebarPreview.updateSidebar, this);
    this.SideBar.on("unmount", this.sidebarPreview.clearSidebar, this);
    this.SideBar.each(el => this.sidebarPreview.updateSidebar(el));

    this.updateCSS();

    this.settingSlider = (
      <link
        href={SETTING_SLIDER}
        rel="stylesheet"
        type="text/css"
        crossOrigin="anonymous"
      />
    );

    document.body.appendChild(this.settingSlider);

    this.resizableDropDown.initialize();
    this.primeReminder.initialize();
  }

  updateCSS() {
    // Overall - Sidebar - Hide Native Sidebar Tooltip
    if (this.settings.get("addon.trubbel.overall.sidebar-preview-hide-native-tooltip")) {
      this.style.set("hide-native-tooltip1", "div :is(.tw-balloon) :has(.online-side-nav-channel-tooltip__body) { display: none !important; }");
      this.style.set("hide-native-tooltip2", "div :is(.tw-balloon) :has(.side-nav-guest-star-tooltip__body) { display: none !important; }");
    } else {
      this.style.delete("hide-native-tooltip1");
      this.style.delete("hide-native-tooltip2");
    }
  }
}