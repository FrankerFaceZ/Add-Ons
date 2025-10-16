import TimestampSearch from "../../modules/twilight/timestamp/search";

export class Twilight_Timestamp extends FrankerFaceZ.utilities.module.Module {
  constructor(...args) {
    super(...args);

    this.inject("settings");
    this.inject("i18n");
    this.inject("site");
    this.inject("site.fine");
    this.inject("site.router");
    this.inject("site.elemental");

    this.timestampSearch = new TimestampSearch(this);

    // Twilight - Timestamp - Info
    this.settings.addUI("addon.trubbel.twilight.timestamp.info", {
      ui: {
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall > Timestamp >> Info",
        title: "Info",
        description: "Custom time formats are formatted using the [Day.js](https://day.js.org/docs/en/display/format) library.",
        component: () => import("../../components/main_menu/setting-info.vue"),
        force_seen: true
      },
    });

    // Twilight - Timestamp - Search - Display accurate timestamp on search pages
    this.settings.add("addon.trubbel.twilight.timestamp.search", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall > Timestamp >> Search",
        title: "Display accurate timestamp on search pages",
        component: "setting-check-box"
      },
      changed: val => this.timestampSearch.handleSettingChange(val)
    });

    // Twilight - Timestamp - Search - Timestamp Format
    this.settings.add("addon.trubbel.twilight.timestamp.search.format", {
      default: "short",
      ui: {
        sort: 1,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall > Timestamp >> Search",
        title: "Timestamp Format",
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
        this.timestampSearch.handleSettingChange(val);
      }
    });

    // Twilight - Timestamp - Search - Include Relative Timestamp
    this.settings.add("addon.trubbel.twilight.timestamp.search.relative", {
      default: false,
      ui: {
        sort: 2,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall > Timestamp >> Search",
        title: "Include Relative Timestamp",
        description: "Display a relative timestamp, such as `(2 days ago)`, `(2 months ago)`, `(2 years ago)` at the end.",
        component: "setting-check-box"
      },
      changed: val => this.timestampSearch.handleSettingChange(val)
    });
  }

  onEnable() {
    this.router.on(":route", this.navigate, this);
    this.timestampSearch.initialize();
  }

  async navigate() {
    this.timestampSearch.handleNavigation();
  }
}