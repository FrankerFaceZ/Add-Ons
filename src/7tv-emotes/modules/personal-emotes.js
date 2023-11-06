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

		// 7TV Set ID -> Emote Set
		this.emoteSets = new Map();

		// Twitch User ID -> Set(7TV Set ID)
		this.userToSetsMap = new Map();
		
		// 7TV Set ID -> Set(Twitch User ID)
		this.setToUsersMap = new Map();
	}

	onEnable() {
		this.on('settings:changed:addon.seventv_emotes.personal_emotes', () => this.updatePersonalSets());
	}

	updatePersonalSets() {
		for (const setID of this.emoteSets.keys()) {
			this.reloadSet(setID);
		}
	}

	getSetID(setID) {
		return `addon.seventv_emotes.personal-${setID}`;
	}

	createPersonalSet(set_id, set_name) {
		// In case the set was created before this method
		const _emoteSet = this.emoteSets.get(set_id);

		this.emoteSets.set(set_id, {
			id: _emoteSet?.id || set_id,
			name: _emoteSet?.name || set_name,
			emotes: _emoteSet?.emotes || {}
		});

		if (_emoteSet?.id) {
			this.reloadSet(set_id);
		}
	}

	getPersonalSet(set_id) {
		if (!this.emoteSets.has(set_id)) {
			this.emoteSets.set(set_id, {
				emotes: {}
			});
		}

		return this.emoteSets.get(set_id);
	}

	addUserToSets(user_id, set_id) {
		const userToSets = this.userToSetsMap.get(user_id) || new Set();
		userToSets.add(set_id);
		this.userToSetsMap.set(user_id, userToSets);
		
		const setToUsers = this.setToUsersMap.get(set_id) || new Set();
		setToUsers.add(user_id);
		this.setToUsersMap.set(set_id, setToUsers);
	}

	grantSetToUser(data) {
		const setID = data.ref_id;
		const user = data.user.connections.find(c => c.platform === 'TWITCH');

		this.addUserToSets(user.id, setID);

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
		const userIDs = this.setToUsersMap.get(setID);
		if (userIDs?.size) {
			for (const userID of userIDs) {
				this.chat
					.getUser(userID)
					.removeSet('addon.seventv_emotes', this.getSetID(setID));
			}
		}

		if(!this.settings.get('addon.seventv_emotes.personal_emotes')) {
			this.emotes.unloadSet(this.getSetID(setID), true, true);
			return;
		}

		const showUnlisted = this.settings.get('addon.seventv_emotes.unlisted_emotes');

		const set = this.getPersonalSet(setID);

		const emotes = [];

		for (const [, emote] of Object.entries(set.emotes)) {
			if (showUnlisted || !this.seventv_emotes.isEmoteUnlisted(emote)) {
				const convertedEmote = this.seventv_emotes.convertEmote(emote);
				if (!convertedEmote) continue;

				emotes.push(convertedEmote);
			}
		}

		const ffzSet = {
			title: set.name,
			source: '7TV',
			icon: this.setIcon,
			sort: 50,
			emotes
		};

		if (emotes.length) {
			this.emotes.loadSetData(this.getSetID(setID), ffzSet, true);

			if (userIDs?.size) {
				for (const userID of userIDs) {
					this.chat
						.getUser(userID)
						.addSet('addon.seventv_emotes', this.getSetID(setID));
				}
			}
		}

		return true;
	}

	getEmoteFromSet(setID, emoteID) {
		const set = this.getPersonalSet(setID);

		if (!set?.emotes) return null;
		
		return set.emotes[emoteID];
	}

	addEmoteToSet(setID, emote) {
		const isPersonal = emote?.data?.state?.includes('PERSONAL');
		if (!isPersonal) return false;

		const set = this.getPersonalSet(setID);
		set.emotes[emote.id] = emote;

		return true;
	}

	removeEmoteFromSet(setID, emoteID) {
		const set = this.getPersonalSet(setID);
		if (!set.emotes[emoteID]) return false;

		delete set.emotes[emoteID];
		
		return true;
	}
}