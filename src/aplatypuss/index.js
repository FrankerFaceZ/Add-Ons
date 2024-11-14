class Aplatypuss extends Addon {
	HOST_URL = 'https://ffz.thetiki.club';
	ASSETS_URL = `${this.HOST_URL}/static`;
	CHANNELS_IDS = ['39464264'];

	ADDON_ID = 'addon.aplatypuss';
	ADDON_NAME = 'APlatypuss';

	ADDON_EMOTES_ID = `${this.ADDON_ID}.emotes`;
	EMOTICONS_SETTINGS_CHECK = `${this.ADDON_ID}.enable_emotes`;

	ADDON_BADGES_ID = `${this.ADDON_ID}.badges`;
	BADGES_SETTINGS_CHECK = `${this.ADDON_ID}.enable_badges`;
	BADGE_PREFIX = `${this.ADDON_ID}.badge`;
	BADGES_START_SLOT = 420;
	DEFAULT_BADGE_URL = 'https://thetiki.club/';

	REFRESH_TIME_SETTINGS = `${this.ADDON_ID}.refresh_time`;
	MIN_REFRESH_TIME_SECONDS = 20;
	DEFAULT_REFRESH_TIME_SECONDS = 60;
	REFRESH_TIME_SECONDS = this.settings.get(this.REFRESH_TIME_SETTINGS) ?? this.DEFAULT_REFRESH_TIME_SECONDS;
	UPDATE_TIMER_ID = null;
	SHOULD_REFRESH = true;

	BADGES_KEYS = [];
	CURRENT_BADGES = {};
	CURRENT_BADGES_USERS = {};


	constructor(...args) {
		super(...args);

		this.inject('settings');
		this.inject('chat');
		this.inject('chat.badges');
		this.inject('chat.emotes');

		this.settings.add(this.EMOTICONS_SETTINGS_CHECK, {
			default: true,
			ui: {
				path: `Add-Ons > ${this.ADDON_NAME} >> Emotes`,
				title: 'Show Emotes',
				description: 'Enable to show custom emotes.',
				component: 'setting-check-box',
			},
			changed: () => this.updateAllChannels()
		});

		this.settings.add(this.BADGES_SETTINGS_CHECK, {
			default: true,
			ui: {
				path: `Add-Ons > ${this.ADDON_NAME} >> Badges`,
				title: 'Enable Badges',
				description: 'Enable to show custom badges',
				component: 'setting-check-box',
			},
			changed: () => this.updateAllChannels()
		});

		this.settings.add(this.REFRESH_TIME_SETTINGS, {
			default: this.DEFAULT_REFRESH_TIME_SECONDS,
			ui: {
				path: `Add-Ons > ${this.ADDON_NAME} >> Refresh`,
				title: 'Refresh Time',
				description: 'Time in seconds to check for updates',
				component: 'setting-text-box',
				process: (newVal, _oldVal) => {
					let newTime = parseInt(newVal);
					newTime = newTime < this.MIN_REFRESH_TIME_SECONDS ? this.MIN_REFRESH_TIME_SECONDS : newTime;
					return newTime;
				},
			},
			changed: val => {
				if (val != this.REFRESH_TIME_SECONDS) {
					this.REFRESH_TIME_SECONDS = val;
					this.log.info(`new refresh time, ${this.REFRESH_TIME_SECONDS}`)
					clearInterval(this.UPDATE_TIMER_ID);
					this.UPDATE_TIMER_ID = setInterval(() => {
						this.refreshData();
					}, this.REFRESH_TIME_SECONDS * 1000);
				}
			}
		});

		setTimeout(() => this.enable(), 0)

	}

	enable() {
		this.log.info(`addon was enabled`);
		this.on('chat:room-add', this.roomChange);
		this.on('chat:room-remove', this.roomChange);
		this.on('chat:room-update-login', this.roomChange);
		this.refreshData();

		this.UPDATE_TIMER_ID = setInterval(() => {
			this.refreshData();
		}, this.REFRESH_TIME_SECONDS * 1000);
	}

	onDisable() {
		clearInterval(this.UPDATE_TIMER_ID);
	}
	
	async refreshData() {
		this.log.info(`refreshing emotes and badges`)
		this.updateAllChannels(false);
		await this.updateBadges(0, false);
		if (!this.SHOULD_REFRESH) {
			clearInterval(this.UPDATE_TIMER_ID);
		}
	}

	roomChange(room) {
		this.updateChannel(room);
	}

	updateChannel(room, retry) {
		if (this.CHANNELS_IDS.indexOf(room._id) == -1) {
			this.unloadEmotes();
			this.disableBadges();
			this.SHOULD_REFRESH = false;
			this.log.info(`disabling on room ${room._id} (is not present in the ID's list)`);

		}
		else {
			this.updateChannelEmotes(room, retry);
		}
	}

	updateAllChannels(retry = true) {
		for (const room of this.chat.iterateRooms()) {
			if (room) this.updateChannel(room, retry);
		}
	}

	async updateChannelEmotes(room, attempts = 0, retry = true) {
		room.removeSet(this.ADDON_ID, this.ADDON_EMOTES_ID);
		if (!this.chat.context.get(this.EMOTICONS_SETTINGS_CHECK)) {
			return;
		}

		const response = await fetch(`${this.HOST_URL}/emotes.json`);
		if (response.ok) {
			const emotesData = [];

			for (const dataEmote of await response.json()) {

				const arbitraryEmote = /[^A-Za-z0-9]/.test(dataEmote.code);

				const emote = {
					id: dataEmote.code,
					urls: {
						1: undefined,
					},
					name: dataEmote.code,
					width: dataEmote.width,
					height: dataEmote.width,
					require_spaces: arbitraryEmote,
					modifier: dataEmote.modifier !== undefined,
					modifier_offset: dataEmote.modifier,
				};

				emote.urls = {
					1: `${this.ASSETS_URL}/${dataEmote.id}_1X.webp`,
					2: `${this.ASSETS_URL}/${dataEmote.id}_2X.webp`,
					4: `${this.ASSETS_URL}/${dataEmote.id}_3X.webp`,
				};
				emotesData.push(emote);
			}

			let EMOTES_ARRAY = [];
			EMOTES_ARRAY = EMOTES_ARRAY.concat(emotesData);

			const emoteSet = {
				emoticons: EMOTES_ARRAY,
				title: 'Channel Emotes',
				source: `${this.ADDON_NAME}`,
				icon: `${this.ASSETS_URL}/icon.png`,
			};
			room.addSet(this.ADDON_ID, this.ADDON_EMOTES_ID, emoteSet);

		} else {
			if (response.status === 404 || !retry) return;

			const newAttempts = (attempts || 0) + 1;
			if (newAttempts < 12) {
				this.log.error(`Failed to fetch emotes. Trying again in 5 seconds.`);
				setTimeout(this.updateChannelEmotes.bind(this, room, newAttempts), 5000);
			}
		}
	}

	async updateBadges(attempts = 0, retry = true) {
		if (!this.settings.get(this.BADGES_SETTINGS_CHECK)) {
			return;
		}
		const baseBadgesResponse = await fetch(`${this.HOST_URL}/badgesDefinitions.json`);
		const baseUsersResponse = await fetch(`${this.HOST_URL}/badgesUsers.json`);

		if (baseBadgesResponse.ok && baseUsersResponse.ok) {
			const baseBadgeData = await baseBadgesResponse.json();
			const usersData = await baseUsersResponse.json();
			this.BADGES_KEYS = Object.keys(baseBadgeData);
			const NEW_BADGES = {};
			const NEW_BADGES_USERS = {};

			for (let i = 0; i < this.BADGES_KEYS.length; i++) {
				const badge = baseBadgeData[this.BADGES_KEYS[i]]
				const badgeId = `${this.BADGE_PREFIX}.${this.BADGES_KEYS[i].toLowerCase()}`;
				NEW_BADGES[badgeId] = {
					id: `${badgeId}`,
					addon: this.ADDON_ID,
					name: this.BADGES_KEYS[i],
					title: badge.tooltip,
					slot: this.BADGES_START_SLOT + i,
					image: this.ASSETS_URL + badge.image1,
					urls: {
						1: `${this.ASSETS_URL}/${badge.image1}`,
						2: `${this.ASSETS_URL}/${badge.image2}`,
						4: `${this.ASSETS_URL}/${badge.image3}`,
					},
					click_url: badge.url ?? this.DEFAULT_BADGE_URL
				};
				NEW_BADGES_USERS[badgeId] = badge.users ?? [];
			}

			for (let i = 0; i < usersData.length; i++) {
				const userData = usersData[i]
				for (let j = 0; j < userData.badges.length; j++) {
					const badgeId = `${this.BADGE_PREFIX}.${userData.badges[j].toLowerCase()}`;
					NEW_BADGES_USERS[badgeId] = NEW_BADGES_USERS[badgeId].concat(userData.user);
				}

			}

			if (!(JSON.stringify(NEW_BADGES) === JSON.stringify(this.CURRENT_BADGES) || JSON.stringify(NEW_BADGES_USERS) === JSON.stringify(this.CURRENT_BADGES_USERS))) {
				this.log.info(`Badge info differs, updating ...`);
				this.CURRENT_BADGES = NEW_BADGES;
				this.CURRENT_BADGES_USERS = NEW_BADGES_USERS;

				for (let i = 0; i < this.BADGES_KEYS.length; i++) {
					const badgeId = `${this.BADGE_PREFIX}.${this.BADGES_KEYS[i].toLowerCase()}`;
					this.badges.loadBadgeData(badgeId, (this.CURRENT_BADGES[badgeId]));
					this.badges.setBulk(this.ADDON_BADGES_ID, badgeId, (this.CURRENT_BADGES_USERS[badgeId]));
				}

				this.badges.buildBadgeCSS();
				this.emit('chat:update-lines');
			}
		}
		else {
			if (baseBadgesResponse.status === 404 || !retry) return;

			const newAttempts = (attempts || 0) + 1;
			if (newAttempts < 12) {
				this.log.error(`Failed to fetch badges. Trying again in 5 seconds.`);
				setTimeout(this.updateBadges.bind(this, newAttempts), 5000);
			}
		}
	}

	disableBadges() {
		for (let i = 0; i < this.BADGES_KEYS.length; i++) {
			const badgeId = `${this.BADGE_PREFIX}.${this.BADGES_KEYS[i].toLowerCase()}`;
			this.badges.deleteBulk(this.ADDON_BADGES_ID, badgeId);
		}
		this.badges.buildBadgeCSS();
		this.emit('chat:update-lines');
	}

	unloadEmotes() {
		this.emotes.unloadSet(this.ADDON_ID, this.ADDON_EMOTES_ID);
	}

}

Aplatypuss.register('aplatypuss');