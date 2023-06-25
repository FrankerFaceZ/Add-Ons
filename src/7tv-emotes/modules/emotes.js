export default class Emotes extends FrankerFaceZ.utilities.module.Module {
	constructor(...args) {
		super(...args);

		this.inject('..api');

		this.inject('settings');
		this.inject('chat');
		this.inject('chat.emotes');

		this.setIcon = this.parent.manifest.icon;

		this.settings.add('addon.seventv_emotes.global_emotes', {
			default: true,
			ui: {
				path: 'Add-Ons > 7TV Emotes >> Emotes',
				title: 'Global Emotes',
				description: 'Enables global emotes from 7TV.',
				component: 'setting-check-box',
			}
		});

		this.settings.add('addon.seventv_emotes.channel_emotes', {
			default: true,
			ui: {
				path: 'Add-Ons > 7TV Emotes >> Emotes',
				title: 'Channel Emotes',
				description: 'Enables channel specific emotes from 7TV.',
				component: 'setting-check-box',
			}
		});

		this.settings.add('addon.seventv_emotes.unlisted_emotes', {
			default: true,
			ui: {
				path: 'Add-Ons > 7TV Emotes >> Emotes > Emote Visibility',
				title: 'Show unlisted emotes',
				description: 'Show emotes which have been deemed non-TOS friendly by 7TV moderators.',
				component: 'setting-check-box',
			}
		});
	}

	onEnable() {
		this.on('settings:changed:addon.seventv_emotes.global_emotes', () => this.updateGlobalEmotes());
		this.on('settings:changed:addon.seventv_emotes.channel_emotes', () => this.updateChannelSets());
		this.on('settings:changed:addon.seventv_emotes.unlisted_emotes', () => this.updateChannelSets());

		this.on('chat:room-add', channel => this.updateChannelSet(channel));
		this.on('chat:room-remove', channel => this.setChannelSet(channel, null));

		this.updateGlobalEmotes();
		this.updateChannelSets();
	}

	async updateGlobalEmotes() {
		this.emotes.removeDefaultSet('addon.seventv_emotes', 'addon.seventv_emotes.global');
		this.emotes.unloadSet('addon.seventv_emotes.global');

		if (!this.settings.get('addon.seventv_emotes.global_emotes')) return;

		const emotes = await this.api.emotes.fetchGlobalEmotes();

		const ffzEmotes = [];
		for (const emote of emotes) {
			ffzEmotes.push(this.convertEmote(emote));
		}

		this.emotes.addDefaultSet('addon.seventv_emotes', 'addon.seventv_emotes.global', {
			title: 'Global Emotes',
			source: '7TV',
			icon: this.setIcon,
			emotes: ffzEmotes
		});
	}

	getChannelSetID(channel) {
		return `addon.seventv_emotes.channel-${channel.id}`;
	}

	getChannelSet(channel) {
		return this.emotes.emote_sets[this.getChannelSetID(channel)] || {};
	}

	setChannelSet(channel, ffzEmotes) {
		const setID = this.getChannelSetID(channel);

		channel.removeSet('addon.seventv_emotes', setID);
		this.emotes.unloadSet(setID);

		if (ffzEmotes && ffzEmotes.length > 0) {
			channel.addSet('addon.seventv_emotes', setID, {
				title: 'Channel Emotes',
				source: '7TV',
				icon: this.setIcon,
				emotes: ffzEmotes
			});
		}
	}

	addEmoteToChannelSet(channel, emote, force = false) {
		const emoteSet = this.getChannelSet(channel);

		const showUnlisted = this.settings.get('addon.seventv_emotes.unlisted_emotes');

		if (emoteSet) {
			if (showUnlisted || force || !this.isEmoteUnlisted(emote)) {
				const emotes = emoteSet.emotes || {};

				emotes[emote.id] = this.convertEmote(emote);

				this.setChannelSet(channel, Object.values(emotes));
				return true;
			}
		}

		return false;
	}

	removeEmoteFromChannelSet(channel, emoteID) {
		const emoteSet = this.getChannelSet(channel);

		if (emoteSet) {
			const emotes = emoteSet.emotes || {};

			if (!emotes[emoteID]) return false;

			delete emotes[emoteID];

			this.setChannelSet(channel, Object.values(emotes));
			return true;
		}

		return false;
	}

	getEmoteFromChannelSet(channel, emoteID) {
		const emoteSet = this.getChannelSet(channel);

		if (emoteSet && emoteSet.emotes) {
			const ffzEmote = emoteSet.emotes[emoteID];

			if (ffzEmote && ffzEmote.SEVENTV_emote){
				return ffzEmote.SEVENTV_emote;
			}
		}

		return null;
	}

	async updateChannelSet(channel) {
		if (this.settings.get('addon.seventv_emotes.channel_emotes')) {
			const channelEmotes = await this.api.emotes.fetchChannelEmotes(channel.id);
			const showUnlisted = this.settings.get('addon.seventv_emotes.unlisted_emotes');

			if (!channelEmotes.emote_set) return false;

			const ffzEmotes = [];
			if (channelEmotes.emote_set.emotes) {
				for (const emote of channelEmotes.emote_set.emotes) {
					if (showUnlisted || !this.isEmoteUnlisted(emote)) {
						ffzEmotes.push(this.convertEmote(emote));
					}
				}
			}

			this.setChannelSet(channel, ffzEmotes);
			return true;
		}
		else {
			this.setChannelSet(channel, null);
			return false;
		}
	}

	updateChannelSets() {
		for (const channel of this.chat.iterateRooms()) {
			this.updateChannelSet(channel);
		}
	}

	getBitFlag(byte, mask) {
		return (byte & mask) == mask;
	}

	convertEmote(emote) {
		const emoteHostUrl = emote.data.host.url;

		const emoteUrls = emote.data.host.files.filter((value => value.format === 'WEBP')).reduce((acc, value, key) => {
			acc[key + 1] = `${emoteHostUrl}/${value.name}`;
			return acc;
		}, {});

		const ffzEmote = {
			id: emote.id,
			name: emote.name,
			owner: {
				display_name: emote.data?.owner?.display_name,
				name: emote.data?.owner?.username
			},
			urls: emoteUrls,
			modifier: this.getBitFlag(emote.data.flags, 1 << 7),
			modifier_offset: '0',
			width: emote.data.host.files[0]?.width,
			height: emote.data.host.files[0]?.height,
			click_url: this.api.getEmoteAppURL(emote),
			SEVENTV_emote: emote
		};

		return ffzEmote;
	}

	isEmoteUnlisted(emote) {
		return !emote.data.listed;
	}
}