export default class ProUser {
	constructor(parent, username, emotes) {
		this.parent = parent;

		this.username = username;
		this.setID = `addon--ffzap.betterttv--emotes-pro-${this.username}`;

		this.loadEmotes(emotes);
	}

	loadEmotes(_emotes = []) {
		const emotes = [];

		for (let i = 0; i < _emotes.length; i++) {
			emotes.push(this.parent.convertBTTVEmote(_emotes[i]));
		}

		const set = {
			emotes,
			title: 'Personal Emotes',
			source: 'BetterTTV',
			icon: 'https://cdn.betterttv.net/tags/developer.png',
		};

		if (emotes.length) {
			this.parent.emotes.loadSetData(this.setID, set, true);
			this.parent.chat
				.getUser(undefined, this.username)
				.addSet('addon--ffzap.betterttv', this.setID);
		} else {
			this.unload();
		}
	}

	unload() {
		this.parent.emotes.unloadSet(this.setID, true);
	}
}
