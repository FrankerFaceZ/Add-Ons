import { SidebarManager } from "../../modules/twilight/sidebar/index";

const { ManagedStyle } = FrankerFaceZ.utilities.dom;

export class Twilight_Sidebar extends FrankerFaceZ.utilities.module.Module {
  constructor(...args) {
    super(...args);

    this.style = new ManagedStyle;

    this.inject("settings");
    this.inject("site");
    this.inject("site.fine");
    this.inject("site.router");
    this.inject("site.elemental");
    this.inject("site.twitch_data");

    this.sidebarManager = new SidebarManager(this);

    // Twilight - Sidebar - Preview - Enable Sidebar Previews
    this.settings.add("addon.trubbel.twilight.sidebar.preview", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall > Sidebar >> Preview",
        title: "Enable Sidebar Previews",
        description: "Show previews when hovering over channels in the sidebar.\n\n**Note:** For this to work properly, make sure your browser has granted **Autoplay** and **Sound** permissions for `player.twitch.tv`.\n\n--\n\nSince Twitch stores your [preferences](https://www.twitch.tv/settings/content-preferences) on the main domain and isn't shared across their subdomains (`clips.twitch.tv`, `player.twitch.tv`)\n\nReplace the **CHANNEL_NAME** with the stream you're currently having issues with and open the link `https://player.twitch.tv/?channel=CHANNEL_NAME&parent=twitch.tv` and click \"Start Watching\" and it should remember your choice for that current category/game when it comes to \"content is intended for certain audiences.\"",
        component: "setting-check-box"
      },
      changed: val => {
        this.log.info("[Sidebar] Preview setting changed:", val);
        this.Sidebar.each(el => this.sidebarManager.onSidebarUpdate(el));
      }
    });

    // Twilight - Sidebar - Preview - Preview Delay
    this.settings.add("addon.trubbel.twilight.sidebar.preview.delay", {
      default: 500,
      ui: {
        sort: 1,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall > Sidebar >> Preview",
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

    // Twilight - Sidebar - Preview - Preview Size
    this.settings.add("addon.trubbel.twilight.sidebar.preview.size", {
      default: 480,
      ui: {
        sort: 2,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall > Sidebar >> Preview",
        title: "Preview Size",
        description: "Adjust the size of the preview popup.",
        component: () => import("../../components/main_menu/setting-slider.vue"),
        min: 280,
        max: 1000,
        step: 10,
        ratio: 16 / 9,
        unit: "px"
      }
    });


    // Twilight - Sidebar - Preview - Enable Audio for Previews
    this.settings.add("addon.trubbel.twilight.sidebar.preview.audio", {
      default: false,
      ui: {
        sort: 3,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall > Sidebar >> Preview",
        title: "Enable Audio for Previews",
        description: "Please keep in mind that this is using your default volume for streams. Some streams may be loud.",
        component: "setting-check-box"
      }
    });

    // Twilight - Sidebar - Preview - Preview Quality
    this.settings.add("addon.trubbel.twilight.sidebar.preview.quality", {
      default: "160p30",
      ui: {
        sort: 4,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall > Sidebar >> Preview",
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

    // Twilight - Sidebar - Preview - Show Stream Uptime
    this.settings.add("addon.trubbel.twilight.sidebar.preview.show_uptime", {
      default: false,
      ui: {
        sort: 5,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall > Sidebar >> Preview",
        title: "Show Stream Uptime",
        component: "setting-check-box"
      }
    });

    // Twilight - Sidebar - Preview - Show Stream Title
    this.settings.add("addon.trubbel.twilight.sidebar.preview.show_title", {
      default: false,
      ui: {
        sort: 5,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall > Sidebar >> Preview",
        title: "Show Stream Title",
        description: "Display the stream title below the preview.",
        component: "setting-check-box"
      }
    });

    // Twilight - Sidebar - Preview - Show Stream Category
    this.settings.add("addon.trubbel.twilight.sidebar.preview.show_category", {
      default: false,
      ui: {
        sort: 6,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall > Sidebar >> Preview",
        title: "Show Stream Category",
        description: "Display the stream category below the preview.",
        component: "setting-check-box"
      }
    });

    // Twilight - Sidebar - Preview - Show Viewer Count
    this.settings.add("addon.trubbel.twilight.sidebar.preview.show_viewer_count", {
      default: false,
      ui: {
        sort: 7,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall > Sidebar >> Preview",
        title: "Show Viewer Count",
        description: "Display the viewer count below the preview.",
        component: "setting-check-box"
      }
    });

    // Twilight - Sidebar - Preview - Show Hype Train
    this.settings.add("addon.trubbel.twilight.sidebar.preview.show_hype_train", {
      default: false,
      ui: {
        sort: 8,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall > Sidebar >> Preview",
        title: "Show Hype Train",
        description: "Display hype train information when available.",
        component: "setting-check-box"
      }
    });

    // Twilight - Sidebar - Preview - Show Gift Discount
    this.settings.add("addon.trubbel.twilight.sidebar.preview.show_gift_discount", {
      default: false,
      ui: {
        sort: 9,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall > Sidebar >> Preview",
        title: "Show Gift Discount",
        description: "Display gift discount information when available.",
        component: "setting-check-box"
      }
    });

    // Twilight - Sidebar - Preview - Show Stream Guests
    this.settings.add("addon.trubbel.twilight.sidebar.preview.show_guests", {
      default: false,
      ui: {
        sort: 10,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall > Sidebar >> Preview",
        title: "Show Stream Guests",
        description: "Display guest information when available.",
        component: "setting-check-box"
      }
    });

    // Twilight - Sidebar - Preview - Show Sponsorship
    this.settings.add("addon.trubbel.twilight.sidebar.preview.show_sponsorship", {
      default: false,
      ui: {
        sort: 11,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall > Sidebar >> Preview",
        title: "Show Sponsorship",
        description: "Display sponsorship information when available.",
        component: "setting-check-box"
      }
    });

    // Twilight - Sidebar - Preview - Tooltip background
    this.settings.add("addon.trubbel.twilight.sidebar.preview.tooltip_background", {
      default: "#1f1f23",
      ui: {
        sort: 12,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall > Sidebar >> Preview",
        title: "Tooltip background",
        component: "setting-color-box",
        openUp: true
      }
    });

    // Twilight - Sidebar - Preview - Tooltip title
    this.settings.add("addon.trubbel.twilight.sidebar.preview.tooltip_title", {
      default: "#dedee3",
      ui: {
        sort: 13,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall > Sidebar >> Preview",
        title: "Tooltip title",
        component: "setting-color-box",
        openUp: true
      }
    });

    // Twilight - Sidebar - Preview - Tooltip text
    this.settings.add("addon.trubbel.twilight.sidebar.preview.tooltip_text", {
      default: "#adadb8",
      ui: {
        sort: 14,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall > Sidebar >> Preview",
        title: "Tooltip text",
        component: "setting-color-box",
        openUp: true
      }
    });

    // Twilight - Sidebar - Preview - Tooltip border
    this.settings.add("addon.trubbel.twilight.sidebar.preview.tooltip_border", {
      default: "#26262c",
      ui: {
        sort: 15,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall > Sidebar >> Preview",
        title: "Tooltip border",
        component: "setting-color-box",
        openUp: true
      }
    });

    // Twilight - Sidebar - Preview - Hide native sidebar tooltips
    this.settings.add("addon.trubbel.twilight.sidebar.preview.hide_native_tooltips", {
      default: false,
      ui: {
        sort: 16,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall > Sidebar >> Preview",
        title: "Hide native sidebar tooltips",
        description: "This is recommended to be enabled.",
        component: "setting-check-box"
      },
      changed: () => this.updateCSS()
    });



    // Twilight - Sidebar Extended - About
    this.settings.addUI("addon.trubbel.twilight.sidebar_extended.info", {
      ui: {
        sort: -1,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall > Sidebar Extended >> About",
        title: "About",
        description: "⚠️ Please note that these features are experimental.\n\n• If you're having issues, try disabling addons that might interfere with the sidebar.",
        component: () => import("../../components/main_menu/setting-info.vue"),
        force_seen: true
      },
    });

    // Twilight - Sidebar Extended - Pinned Channels - Enable Pinned Channels
    this.settings.add("addon.trubbel.twilight.sidebar_extended.pinned_channels", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall > Sidebar Extended >> Pinned Channels",
        title: "Enable Pinned Channels",
        component: "setting-check-box"
      },
      changed: val => {
        this.sidebarManager.pinned.handleSettingChange(val);
        this.Sidebar.each(el => this.sidebarManager.onSidebarUpdate(el));
      }
    });

    // Twilight - Sidebar Extended - Pinned Channels - Sort by
    this.settings.add("addon.trubbel.twilight.sidebar_extended.pinned_channels.sort", {
      default: "manual",
      ui: {
        sort: 1,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall > Sidebar Extended >> Pinned Channels",
        title: "Sort by",
        component: "setting-select-box",
        data: [
          { value: "manual", title: "Manual (Order Added)" },
          { value: "alphabetical", title: "Alphabetical" },
          { value: "viewers_desc", title: "Viewers (High to Low)" },
          { value: "viewers_asc", title: "Viewers (Low to High)" }
        ]
      },
      changed: () => {
        this.Sidebar.each(el => this.sidebarManager.onSidebarUpdate(el));
      }
    });

    // Twilight - Sidebar Extended - Pinned Channels - Show Offline Channels
    this.settings.add("addon.trubbel.twilight.sidebar_extended.pinned_channels.show_offline_channels", {
      default: true,
      ui: {
        sort: 3,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall > Sidebar Extended >> Pinned Channels",
        title: "Show Offline Channels",
        component: "setting-check-box"
      },
      changed: () => {
        this.Sidebar.each(el => this.sidebarManager.onSidebarUpdate(el));
      }
    });

    // Twilight - Sidebar Extended - Pinned Channels - Manage Pinned Channels
    this.settings.addUI("addon.trubbel.twilight.sidebar_extended.pinned_channels.manage", {
      sort: 4,
      path: "Add-Ons > Trubbel\u2019s Utilities > Overall > Sidebar Extended >> Pinned Channels",
      title: "Manage Pinned Channels",
      description: "Add, remove, and reorder your pinned channels.",
      component: () => import("../../components/main_menu/setting-table.vue"),
      getPinnedChannels: () => this.sidebarManager.pinned.getPinnedChannels(),
      setPinnedChannels: (channels) => this.sidebarManager.pinned.setPinnedChannels(channels)
    });



    // Twilight - Sidebar Extended - Show More - Auto Expand Channels
    this.settings.add("addon.trubbel.twilight.sidebar_extended.show_more.expand", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall > Sidebar Extended >> Show More",
        title: "Auto Expand Channels",
        description: "You can hide offline channels in [Appearance > Layout > Side Navigation > \"Hide Offline Channels\"](~appearance.layout).\n\n**Note:** Keep in mind that the pinned channel setting **Show Offline Channels** might not work correctly if it's turned off.",
        component: "setting-check-box"
      },
      changed: () => {
        this.Sidebar.each(el => this.sidebarManager.onSidebarUpdate(el));
      }
    });



    // Twilight - Sidebar Extended - Sidebar Expand - Auto expand sidebar on hover
    this.settings.add("addon.trubbel.twilight.sidebar_extended.expand", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall > Sidebar Extended >> Sidebar Expand",
        title: "Auto expand sidebar on hover",
        description: "_Might_ interfere when combined with the settings above.",
        component: "setting-check-box"
      },
      changed: () => {
        this.Sidebar.each(el => this.sidebarManager.onSidebarUpdate(el));
      }
    });

    // Twilight - Sidebar Extended - Sidebar Expand - Hover Delay
    this.settings.add("addon.trubbel.twilight.sidebar_extended.expand.delay", {
      default: 150,
      ui: {
        sort: 1,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall > Sidebar Extended >> Sidebar Expand",
        title: "Hover Delay",
        description: "How long to hover before expanding the sidebar (in milliseconds). Use `0` for no delay.",
        component: "setting-text-box",
        process(val) {
          const cleanVal = val.toString().replace(/[^\d]/g, "");
          const num = parseInt(cleanVal, 10);
          if (isNaN(num) || num < 0 || num > 5000) return 500;
          return num;
        }
      }
    });

    this.Sidebar = this.elemental.define(
      "sidebar",
      ".side-bar-contents",
      null,
      { childNodes: true, subtree: true },
      1
    );
  }

  async onEnable() {
    this.sidebarManager.enable();
    this.updateCSS();
  }

  updateCSS() {
    // Twilight - Sidebar - Preview - Hide native sidebar tooltips
    if (this.settings.get("addon.trubbel.twilight.sidebar.preview.hide_native_tooltips")) {
      this.style.set("hide-native-tooltips", `
          div :is(.tw-balloon) :has(.online-side-nav-channel-tooltip__body),
          div :is(.tw-balloon) :has(.side-nav-guest-star-tooltip__body),
          div :is(.tw-balloon) :has(.side-nav-sponsored-channel-tooltip--expanded),
          div :is(.tw-balloon) :has(.side-nav-sponsored-channel-tooltip--collapsed) {
            display: none !important;
          }
        `);
    } else {
      this.style.delete("hide-native-tooltips");
    }
  }
}