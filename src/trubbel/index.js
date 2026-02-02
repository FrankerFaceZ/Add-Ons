// Appearance
import { Appearance_Declutter } from "./settings/appearance/declutter";
import { Appearance_Notifications } from "./settings/appearance/notifications";
import { Appearance_Tweaks } from "./settings/appearance/tweaks";

// Channel
import { Channel_Chat } from "./settings/channel/chat";
import { Channel_ModView } from "./settings/channel/mod-view";
import { Channel_Player } from "./settings/channel/player";
import { Channel_VODs } from "./settings/channel/vods";

// Dashboard
import { Dashboard } from "./settings/dashboard/dashboard";

// Directory
import { Directory_Following } from "./settings/directory/following";
import { Directory_Thumbnails } from "./settings/directory/thumbnails";

// Inventory
import { Inventory_Drops } from "./settings/inventory/drops";

// Twilight
import { Twilight_Clips } from "./settings/twilight/clips";
import { Twilight_Prime } from "./settings/twilight/prime";
import { Twilight_Sidebar } from "./settings/twilight/sidebar";
import { Twilight_Timestamp } from "./settings/twilight/timestamp";
import { Twilight_Whispers } from "./settings/twilight/whispers";

import SETTING_SLIDER from "./components/main_menu/styles/setting-slider.scss";

const { createElement } = FrankerFaceZ.utilities.dom;

class Trubbel extends Addon {
  constructor(...args) {
    super(...args);

    this.inject("settings");
    this.inject("chat");

    if (this.root.flavor === "main") {
      // Appearance
      this.inject(Appearance_Declutter);
      this.inject(Appearance_Notifications);
      this.inject(Appearance_Tweaks);

      // Channel
      this.inject(Channel_Chat);
      this.inject(Channel_ModView);
      this.inject(Channel_Player);
      this.inject(Channel_VODs);

      // Dashboard
      this.inject(Dashboard);

      // Directory
      this.inject(Directory_Following);
      this.inject(Directory_Thumbnails);

      // Inventory
      this.inject(Inventory_Drops);

      // Twilight
      this.inject(Twilight_Prime);
      this.inject(Twilight_Sidebar);
      this.inject(Twilight_Timestamp);
      this.inject(Twilight_Whispers);
    }

    // Twilight - Clips
    this.inject(Twilight_Clips);

    this.loadDevBadge();
  }

  onEnable() {
    this.settingSlider = (
      <link
        href={SETTING_SLIDER}
        rel="stylesheet"
        type="text/css"
        crossOrigin="anonymous"
      />
    );
    document.body.appendChild(this.settingSlider);
  }

  async loadDevBadge() {
    this.chat.badges.loadBadgeData("addon.trubbel-devbadge", {
      addon: "trubbel",
      id: "addon.trubbel-devbadge",
      base_id: "addon.trubbel-devbadge",
      title: "Trubbel\u2019s Utilities\nAdd-On Developer",
      slot: 666,
      color: "transparent",
      image: "https://i.imgur.com/8TRjfOx.png",
      urls: {
        1: "https://i.imgur.com/8TRjfOx.png",
        2: "https://i.imgur.com/vu08acF.png",
        4: "https://i.imgur.com/s8TIgUg.png"
      },
      click_url: "https://twitch.tv/trubbel"
    });

    this.chat.getUser(39172973, "trubbel").addBadge("addon.trubbel", "addon.trubbel-devbadge");
  }
}

Trubbel.register();