export default class Emotes extends FrankerFaceZ.utilities.module.Module {
	constructor(...args) {
		super(...args);

		this.inject("..api");

		this.inject('settings');
		this.inject('chat');
		this.inject('chat.emotes');

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

		const emotes = await this.api.fetchGlobalEmotes();

		const ffzEmotes = [];
		for (const emote of emotes) {
			ffzEmotes.push(this.convertEmote(emote));
		}

		this.emotes.addDefaultSet('addon.seventv_emotes', 'addon.seventv_emotes.global', {
			title: "Global Emotes",
			source: "7TV",
			icon: "https://7tv.app/assets/favicon.png",
			emotes: ffzEmotes
		});
	}

	getChannelSetID(channel) {
		return `addon.seventv_emotes.channel-${channel.id}`;
	}

	getChannelSet(channel) {
		return this.emotes.emote_sets[this.getChannelSetID(channel)];
	}

	setChannelSet(channel, ffzEmotes) {
		const setID = this.getChannelSetID(channel);

		channel.removeSet('addon.seventv_emotes', setID);
		this.emotes.unloadSet(setID);

		if (ffzEmotes && ffzEmotes.length > 0) {
			channel.addSet('addon.seventv_emotes', setID, {
				title: "Channel Emotes",
				source: "7TV",
				icon: "https://7tv.app/assets/favicon.png",
				emotes: ffzEmotes
			});
		}
	}

	addEmoteToChannelSet(channel, emote, force = false) {
		const emoteSet = this.getChannelSet(channel);

		if (emoteSet) {
			if (force || this.shouldShowEmote(emote)) {
				const emotes = emoteSet.emotes || {};

				emotes[emote.id] = this.convertEmote(emote);

				this.setChannelSet(channel, Object.values(emotes));
				return true;
			}
		}

		return false;
	}

	removeEmoteFromChannelSet(channel, emote) {
		const emoteSet = this.getChannelSet(channel);

		if (emoteSet) {
			const emotes = emoteSet.emotes || {};

			if (emotes[emote.id] === undefined) return false;

			delete emotes[emote.id];

			this.setChannelSet(channel, Object.values(emotes));
			return true;
		}

		return false;
	}

	async updateChannelSet(channel) {
		if (this.settings.get('addon.seventv_emotes.channel_emotes')) {
			let emotes = await this.api.fetchChannelEmotes(channel.login);

			let ffzEmotes = [];
			for (let emote of emotes) {
				if (this.shouldShowEmote(emote)) {
					ffzEmotes.push(this.convertEmote(emote));
				}
			}

			this.setChannelSet(channel, ffzEmotes);
			return true;
		}

		this.setChannelSet(channel, null);
		return false;
	}

	async updateChannelSets() {
		for (const channel of this.chat.iterateRooms()) {
			await this.updateChannelSet(channel);
		}
	}

	getBitFlag(byte, mask) {
		return (byte & mask) == mask;
	}

	convertEmote(emote) {
		const ffzEmote = {
			id: emote.id,
			name: emote.name,
			urls: {
				1: emote.urls[0][1],
				2: emote.urls[1][1],
				3: emote.urls[2][1],
				4: emote.urls[3][1]
			},
			modifier: this.getBitFlag(emote.visibility, 1 << 7),
			modifier_offset: "0",
			width: emote.width[0],
			height: emote.height[0],
			click_url: `https://7tv.app/emotes/${emote.id}`
		};

		if (emote.owner) {
			ffzEmote.owner = {
				display_name: emote.owner.display_name,
				name: emote.owner.login
			};
		}

		return ffzEmote;
	}

	shouldShowEmote(emote) {
		const ShowUnlisted = this.settings.get('addon.seventv_emotes.unlisted_emotes');

		const Unlisted = this.getBitFlag(emote.visibility, 1 << 2);
		const PermanentlyUnlisted = this.getBitFlag(emote.visibility, 1 << 8);

		return ShowUnlisted || !(Unlisted || PermanentlyUnlisted);
	}
}