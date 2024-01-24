export default class ProUser {
	constructor(parent, userID, badge, emotes) {
		this.parent = parent;

		this.userID = userID;
		this.badge = badge;

		this.setID = `addon--ffzap.betterttv--emotes-pro-${this.userID}`;
		this.emotes = emotes || [];

		this.loadBadge(badge, true);
		this.loadEmotes(emotes, true);
	}

	isBadgeEqual(badge = null) {
		return this.badge?.url == badge?.url && this.badge?.startedAt == badge?.startedAt;
	}

	areEmotesEqual(emotes = []) {
		return this.emotes.length === emotes.length &&
			emotes.every(emote => this.emotes.includes(emote.id));
	}

	loadBadge(badge = null, skipCheck = false) {
		if (window.BetterTTV) return false;

		if (!skipCheck && this.isBadgeEqual(badge)) return false;

		this.badge = badge;

		if (badge) {
			const extraData = {
				image: badge.url,
				title: `BetterTTV Pro\n(Since ${this.parent.i18n.formatDate(new Date(badge.startedAt))})`
			};

			this.parent.chat.getUser(this.userID).addBadge('addon--ffzap.betterttv', this.parent.getProBadgeID(), extraData);
		}
		else {
			this.parent.chat.getUser(this.userID).removeBadge('addon--ffzap.betterttv', this.parent.getProBadgeID());
		}

		return true;
	}

	loadEmotes(_emotes = [], skipCheck = false) {
		if (!skipCheck && this.areEmotesEqual(_emotes)) return false;

		this.emotes = _emotes.map(emote => emote.id);

		const emotes = [];

		for (let i = 0; i < _emotes.length; i++) {
			emotes.push(this.parent.convertBTTVEmote(_emotes[i]));
		}

		const set = {
			emotes,
			personal: true,
			title: 'Personal Emotes',
			source: 'BetterTTV',
			icon: 'https://betterttv.com/favicon.png',
		};

		if (emotes.length) {
			this.parent.emotes.loadSetData(this.setID, set, true);
			this.parent.chat
				.getUser(this.userID)
				.addSet('addon--ffzap.betterttv', this.setID);
		}
		else {
			this.unload();
		}

		return true;
	}

	unload() {
		this.parent.emotes.unloadSet(this.setID, true);
	}
}
