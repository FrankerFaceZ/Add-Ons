export class Appearance_Notifications extends FrankerFaceZ.utilities.module.Module {
  constructor(...args) {
    super(...args);

    this.inject("settings");

    // Appearance - Notifications - Custom - Notification Position
    this.settings.add("addon.trubbel.appearance.notifications.custom.position", {
      default: "bottom-left",
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Notifications >> Custom",
        title: "Position",
        description: "Choose where notifications will appear on the screen. Player options will show notifications inside the Twitch player when available.",
        component: "setting-select-box",
        data: [
          { title: "Bottom Left", value: "bottom-left" },
          { title: "Bottom Right", value: "bottom-right" },
          { title: "Top Left", value: "top-left" },
          { title: "Top Right", value: "top-right" },
          { title: "Bottom Left Player", value: "player-bottom-left" },
          { title: "Bottom Right Player", value: "player-bottom-right" },
          { title: "Top Left Player", value: "player-top-left" },
          { title: "Top Right Player", value: "player-top-right" }
        ],
        buttons: () => import("../../components/main_menu/preview-notification.vue")
      }
    });

    // Appearance - Notifications - Custom - Font Size
    this.settings.add("addon.trubbel.appearance.notifications.custom.font_size", {
      default: "16",
      process(ctx, val) {
        if (typeof val !== "number")
          try {
            val = parseFloat(val);
          } catch (err) { val = null; }
        if (!val || val < 1 || isNaN(val) || !isFinite(val) || val > 25)
          val = 16;
        return val;
      },
      ui: {
        sort: 1,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Notifications >> Custom",
        title: "Font Size",
        description: "**Minimum:** `1`, **Maximum:** `25`.",
        component: "setting-text-box",
        type: "number"
      }
    });

    // Appearance - Notifications - Custom - Text
    this.settings.add("addon.trubbel.appearance.notifications.custom.text_color", {
      default: "#ffffff",
      ui: {
        sort: 3,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Notifications >> Custom",
        title: "Text",
        component: "setting-color-box",
        alpha: true
      }
    });

    // Appearance - Notifications - Custom - Background
    this.settings.add("addon.trubbel.appearance.notifications.custom.background_color", {
      default: "#000000",
      ui: {
        sort: 4,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Notifications >> Custom",
        title: "Background",
        component: "setting-color-box",
        alpha: true
      }
    });

    // Appearance - Notifications - Custom - Less Padding
    this.settings.add("addon.trubbel.appearance.notifications.custom.padding", {
      default: false,
      ui: {
        sort: 5,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Notifications >> Custom",
        title: "Less Padding",
        component: "setting-check-box"
      }
    });
  }
}