import { Appearance } from "./settings/appearance";
import { Channel } from "./settings/channel";
import { Directory } from "./settings/directory";
import { Inventory } from "./settings/inventory";
import { Overall } from "./settings/overall";

class Trubbel extends Addon {
	constructor(...args) {
		super(...args);

		this.inject(Appearance);
		this.inject(Channel);
		this.inject(Directory);
		this.inject(Inventory);
		this.inject(Overall);

		this.inject("chat");

		this.loadDevBadge();
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