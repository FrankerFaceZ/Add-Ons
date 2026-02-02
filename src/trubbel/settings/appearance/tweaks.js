import Tweaks from "../../modules/appearance/tweaks/index";
import SystemThemeSync from "../../modules/appearance/tweaks/theme";

const { ManagedStyle } = FrankerFaceZ.utilities.dom;

export class Appearance_Tweaks extends FrankerFaceZ.utilities.module.Module {
  constructor(...args) {
    super(...args);

    this.style = new ManagedStyle;

    this.inject("settings");

    this.tweaks = new Tweaks(this);
    this.systemTheme = new SystemThemeSync(this);

    // Appearance - Tweaks - Buttons, Input, Select, Textarea - Use old buttons with less border-radius
    this.settings.add("addon.trubbel.appearance.tweaks.form_control.border-radius", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Tweaks >> Buttons, Input, Select, Textarea",
        title: "Use old buttons with less border-radius",
        component: "setting-check-box"
      },
      changed: () => this.tweaks.updateCSS()
    });

    // Appearance - Tweaks - Buttons, Input, Select, Textarea - Use old box-shadow for certain elements
    this.settings.add("addon.trubbel.appearance.tweaks.form_control.box-shadow", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Tweaks >> Buttons, Input, Select, Textarea",
        title: "Use old box-shadow for certain elements",
        description: "Change back to a more thin box-shadow/outline for active/focused `button`, `input`, `select`, `textarea`-elements.",
        component: "setting-check-box"
      },
      changed: () => this.tweaks.updateCSS()
    });



    // Appearance - Tweaks - Chat - Display full replies
    this.settings.add("addon.trubbel.appearance.tweaks.chat.full_replies", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Tweaks >> Chat",
        title: "Display full replies",
        description: "Allows you to see the entire message someone is replying to in chat, instead of it being cut off.\n\n**Note:** Twitch settings needs to be \"**Expanded**\" in \`Chat Settings > Chat Appearance > Replies in Chat > Expanded\`,\n\n& FFZ settings needs to be \"**Twitch (Default)**\" in [Chat > Appearance > Replies](~chat.appearance.replies).",
        component: "setting-check-box"
      },
      changed: () => this.tweaks.updateCSS()
    });

    // Appearance - Tweaks - Chat - Display the same opacity and font-weight for international usernames
    this.settings.add("addon.trubbel.appearance.tweaks.chat.intl", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Tweaks >> Chat",
        title: "Display the same opacity and font-weight for international usernames",
        component: "setting-check-box"
      },
      changed: () => this.tweaks.updateCSS()
    });

    // Appearance - Tweaks - Chat - Reduce padding in viewer list
    this.settings.add("addon.trubbel.appearance.tweaks.chat.viewer_list_padding", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Tweaks >> Chat",
        title: "Reduce padding in viewer list",
        component: "setting-check-box"
      },
      changed: () => this.tweaks.updateCSS()
    });



    // Appearance - Tweaks - Directory - Full-width in directory
    this.settings.add("addon.trubbel.appearance.tweaks.directory.max_width", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Tweaks >> Directory",
        title: "Full-width in directory",
        description: "Removes the `max-width` in the directory pages to reduce empty spaces.",
        component: "setting-check-box"
      },
      changed: () => this.tweaks.updateCSS()
    });



    // Appearance - Tweaks - Inventory - Display bigger images in the inventory page
    this.settings.add("addon.trubbel.appearance.tweaks.inventory.big_img", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Tweaks >> Inventory",
        title: "Display bigger images in the inventory page",
        component: "setting-check-box"
      },
      changed: () => this.tweaks.updateCSS()
    });



    // Appearance - Tweaks - Scrollbars - Thinner scrollbars in chat and sidebar
    this.settings.add("addon.trubbel.appearance.tweaks.scrollbar.thin", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Tweaks >> Scrollbars",
        title: "Thinner scrollbars in chat and sidebar",
        description: "This is meant for certain browsers that has much thicker scrollbars.",
        component: "setting-check-box"
      },
      changed: () => this.tweaks.updateCSS()
    });



    // Appearance - Tweaks - System Theme - Enable System Theme
    this.settings.add("addon.trubbel.appearance.tweaks.system_theme", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Tweaks >> System Theme",
        title: "Enable System Theme",
        description: "Automatically sets Twitch theme based on system preferences.",
        component: "setting-check-box"
      },
      changed: () => this.systemTheme.syncTheme()
    });


    // Appearance - Tweaks - Titles - Display full titles for sidebar tooltips
    this.settings.add("addon.trubbel.appearance.tweaks.titles.full_sidebar_tooltip", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Tweaks >> Titles",
        title: "Display full titles for sidebar tooltips",
        description: "Show the full title tooltip when hovering over a stream in the left side navigation.",
        component: "setting-check-box"
      },
      changed: () => this.tweaks.updateCSS()
    });

    // Appearance - Tweaks - Titles - Display full titles in stream previews
    this.settings.add("addon.trubbel.appearance.tweaks.titles.full_stream_preview", {
      default: false,
      ui: {
        sort: 1,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Tweaks >> Titles",
        title: "Display full titles in stream previews",
        component: "setting-check-box"
      },
      changed: () => this.tweaks.updateCSS()
    });

    // Appearance - Tweaks - Titles - Display full titles in clip previews
    this.settings.add("addon.trubbel.appearance.tweaks.titles.full_clip_preview", {
      default: false,
      ui: {
        sort: 2,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Tweaks >> Titles",
        title: "Display full titles in clip previews",
        component: "setting-check-box"
      },
      changed: () => this.tweaks.updateCSS()
    });

    // Appearance - Tweaks - Titles - Display full titles in VOD previews
    this.settings.add("addon.trubbel.appearance.tweaks.titles.full_vod_preview", {
      default: false,
      ui: {
        sort: 3,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Tweaks >> Titles",
        title: "Display full titles in VOD previews",
        component: "setting-check-box"
      },
      changed: () => this.tweaks.updateCSS()
    });

    // Appearance - Tweaks - Titles - Display full titles for categories in directory
    this.settings.add("addon.trubbel.appearance.tweaks.titles.full_directory_preview", {
      default: false,
      ui: {
        sort: 4,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Tweaks >> Titles",
        title: "Display full titles for categories in directory",
        component: "setting-check-box"
      },
      changed: () => this.tweaks.updateCSS()
    });

    // Appearance - Tweaks - Titles - Display full titles for Most Recent Videos
    this.settings.add("addon.trubbel.appearance.tweaks.titles.full_most_recent_preview", {
      default: false,
      ui: {
        sort: 5,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Tweaks >> Titles",
        title: "Display full titles for Most Recent Videos",
        component: "setting-check-box"
      },
      changed: () => this.tweaks.updateCSS()
    });



    // Appearance - Tweaks - Unban Requests - Hide mod actions in Unban Requests
    this.settings.add("addon.trubbel.appearance.tweaks.unban_requests.hide_mod_actions", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Tweaks >> Unban Requests",
        title: "Hide mod actions in Unban Requests",
        description: "Hide all mod actions taken in the **Unban Requests popout window**.",
        component: "setting-check-box"
      },
      changed: () => this.tweaks.updateCSS()
    });

    // Appearance - Tweaks - Unban Requests - Remove line-through text in Unban Requests & Viewer Cards
    this.settings.add("addon.trubbel.appearance.tweaks.unban_requests.hide_line_through", {
      default: false,
      ui: {
        sort: 1,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Tweaks >> Unban Requests",
        title: "Remove line-through text in Unban Requests & Viewer Cards",
        description: "Remove the line-through text in Unban Requests and within viewer cards moderated messages.",
        component: "setting-check-box"
      },
      changed: () => this.tweaks.updateCSS()
    });



    // Appearance - Tweaks - VODs - Display black background behind current and duration time
    this.settings.add("addon.trubbel.appearance.tweaks.vods.time", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Appearance > Tweaks >> VODs",
        title: "Display black background behind current and duration time",
        description: "Show a black background behind VODs seekbar, for current time and duration. Making it easier to see the white text.",
        component: "setting-check-box"
      },
      changed: () => this.tweaks.updateCSS()
    });
  }

  onEnable() {
    this.tweaks.onEnable();
    this.systemTheme.initialize();
  }
}