import { ChatCommands } from "./settings/chat-commands";
import { ClipsVideos } from "./settings/clips-videos";
import { Directory } from "./settings/directory";
import { DropsRewards } from "./settings/drops-rewards";
import { Player } from "./settings/player";
import { RemoveThings } from "./settings/remove-things";
import { UITweaks } from "./settings/ui-tweaks";
import { Whispers } from "./settings/whispers";

class Trubbel extends Addon {
	constructor(...args) {
		super(...args);

		this.inject(ChatCommands);
		this.inject(ClipsVideos);
		this.inject(Directory);
		this.inject(DropsRewards);
		this.inject(Player);
		this.inject(RemoveThings);
		this.inject(UITweaks);
		this.inject(Whispers);

		this.inject("chat");
		this.inject("chat.badges");

		this.loadDevBadge();
	}

	async loadDevBadge() {
		this.badges.loadBadgeData("addon.trubbel-devbadge", {
			addon: "trubbel",
			id: "addon.trubbel-devbadge",
			base_id: "addon.trubbel-devbadge",
			title: "Trubbel\u2019s Utilities\nDeveloper",
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