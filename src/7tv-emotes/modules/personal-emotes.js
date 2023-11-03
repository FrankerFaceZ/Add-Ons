export default class PersonalEmotes extends FrankerFaceZ.utilities.module.Module {
	constructor(...args) {
		super(...args);

		this.injectAs('seventv_emotes', '..emotes');

		this.inject('settings');
		this.inject('chat');
		this.inject('chat.emotes');

		this.setIcon = this.parent.manifest.icon;

		this.settings.add('addon.seventv_emotes.personal_emotes', {
			default: true,
			ui: {
				path: 'Add-Ons > 7TV Emotes >> Emotes',
				title: 'Personal Emotes',
				description: 'Enables personal emotes from 7TV.',
				component: 'setting-check-box',
			}
		});

		// 7TV Set ID -> Emotes
		this.emoteMap = new Map();

		// Twitch User ID -> 7TV Set ID
		this.userToSetMap = new Map();
		
		// 7TV Set ID -> Twitch User ID
		this.setToUserMap = new Map();
	}

	onEnable() {
		this.on('settings:changed:addon.seventv_emotes.personal_emotes', () => this.updatePersonalSets());
	}

	updatePersonalSets() {
		for (const setID of this.emoteMap.keys()) {
			this.reloadSet(setID);
		}
	}

	getSetID(setID) {
		return `addon.seventv_emotes.personal-${setID}`;
	}

	createPersonalSet(set_id) {
		this.emoteMap.set(set_id, {});
	}

	getPersonalEmotesForSet(set_id) {
		if (!this.emoteMap.has(set_id)) {
			this.emoteMap.set(set_id, {});
		}

		return this.emoteMap.get(set_id);
	}

	hasSetID(set_id) {
		for (const set of this.emoteMap.keys()) {
			if (set === set_id) return true;
		}

		return false;
	}

	grantSetToUser(data) {
		const setID = data.ref_id;
		const user = data.user.connections.find(c => c.platform === 'TWITCH');

		this.userToSetMap.set(user.id, setID);
		this.setToUserMap.set(setID, user.id);

		this.reloadSet(setID);
	}

	updateSet(body) {		
		if (!this.settings.get('addon.seventv_emotes.personal_emotes')) return;

		let action;
		let dataType;

		if (body.pushed) {
			dataType = 'pushed';
			action = 'ADD';
		} else if (body.pulled) {
			dataType = 'pulled';
			action = 'REMOVE';
		} else if (body.updated) {
			dataType = 'updated';
			action = 'UPDATE';
		} else {
			// No data, ignore
			return;
		}

		const setID = body.id;

		for (const emote of body[dataType]) {
			if (emote.key !== 'emotes') continue;
			
			const emoteId = emote.value?.id ?? emote.old_value.id;
			const oldEmote = this.getEmoteFromSet(setID, emoteId);
			
			switch (action) {
				case 'UPDATE':
					if (!oldEmote) break;

					this.addEmoteToSet(setID, emote.value);
					break;
				case 'ADD':
					this.addEmoteToSet(setID, emote.value);
					break;
				case 'REMOVE':
					this.removeEmoteFromSet(setID, emoteId);
					break;
			}
		}

		this.reloadSet(setID);
	}

	reloadSet(setID) {
		const userID = this.setToUserMap.get(setID);
		if (userID) {
			this.chat
				.getUser(userID)
				.removeSet('addon.seventv_emotes', this.getSetID(setID));
		}

		if(!this.settings.get('addon.seventv_emotes.personal_emotes')) {
			this.emotes.unloadSet(this.getSetID(setID), true, true);
			return;
		}

		const showUnlisted = this.settings.get('addon.seventv_emotes.unlisted_emotes');

		const rawEmotes = this.getPersonalEmotesForSet(setID);

		const emotes = [];

		for (const [, emote] of Object.entries(rawEmotes)) {
			if (showUnlisted || !this.seventv_emotes.isEmoteUnlisted(emote)) {
				emotes.push(this.seventv_emotes.convertEmote(emote));
			}
		}

		const set = {
			title: 'Personal Emotes',
			source: '7TV',
			icon: this.setIcon,
			emotes
		};

		if (emotes.length) {
			this.emotes.loadSetData(this.getSetID(setID), set, true);

			if (userID) {
				this.chat
					.getUser(userID)
					.addSet('addon.seventv_emotes', this.getSetID(setID));
			}
		}

		return true;
	}

	getEmoteFromSet(setID, emoteID) {
		const emotes = this.getPersonalEmotesForSet(setID);

		if (!emotes) return null;
		
		return emotes[emoteID];
	}

	addEmoteToSet(setID, emote) {
		const isPersonal = emote?.data?.state?.includes('PERSONAL');
		if (!isPersonal) return false;

		const emotes = this.getPersonalEmotesForSet(setID);
		emotes[emote.id] = emote;

		return true;
	}

	removeEmoteFromSet(setID, emoteID) {
		const emotes = this.emoteMap.get(setID);
		if (!emotes[emoteID]) return false;

		delete emotes[emoteID];
		
		return true;
	}
}