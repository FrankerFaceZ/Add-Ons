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

		this.settings.add('addon.seventv_emotes.emote_format', {
			default: 'WEBP',
			ui: {
				path: 'Add-Ons > 7TV Emotes >> Emotes',
				title: 'Emote Format',
				description: 'The file format of the emotes to be used.',
				component: 'setting-select-box',
				data: [
					{ value: 'WEBP', title: 'Webp' },
					{ value: 'AVIF', title: 'Avif' },
				],

			},
		});

		this.settings.add('addon.seventv_emotes.unlisted_emotes', {
			default: false,
			ui: {
				path: 'Add-Ons > 7TV Emotes >> Emotes > Emote Visibility',
				title: 'Show unlisted emotes',
				description: 'Show emotes which have not yet been approved or have been deemed non-TOS friendly by 7TV moderators.',
				component: 'setting-check-box',
			}
		});

		this.setToChannelMap = new Map();

		this.on('chat:reload-data', flags => {
			if (!flags || flags.emotes) {
				this.updateGlobalEmotes();
				this.updateChannelSets();
			}
		});
	}

	onEnable() {
		this.on('settings:changed:addon.seventv_emotes.global_emotes', () => this.updateGlobalEmotes());
		this.on('settings:changed:addon.seventv_emotes.emote_format', () => this.updateGlobalEmotes());
		this.on('settings:changed:addon.seventv_emotes.emote_format', () => this.updateChannelSets());
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

		const globalSet = await this.api.emotes.fetchGlobalEmotes();

		const ffzEmotes = [];
		for (const emote of globalSet.emotes) {
			const convertedEmote = this.convertEmote(emote);
			if (!convertedEmote) continue;

			ffzEmotes.push(convertedEmote);
		}

		this.emotes.addDefaultSet('addon.seventv_emotes', 'addon.seventv_emotes.global', {
			title: globalSet.name,
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

				const convertedEmote = this.convertEmote(emote);
				if (!convertedEmote) return false;

				emotes[emote.id] = convertedEmote;

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

	getChannelBySetID(oldSetID, newSetID) {
		let channelID = this.setToChannelMap.get(oldSetID);
		if (!channelID) {
			channelID = this.setToChannelMap.get(newSetID);
			if (!channelID) return null;
		}

		return this.chat.getRoom(channelID, null, true);
	}

	async updateChannelSet(channel, setID = false) {
		if (this.settings.get('addon.seventv_emotes.channel_emotes')) {
			let channelEmotes = {};
			if (setID) {
				channelEmotes.emote_set = await this.api.emotes.fetchEmoteSet(setID);
			}
			else {
				channelEmotes = await this.api.emotes.fetchChannelEmotes(channel.id);
			}

			const showUnlisted = this.settings.get('addon.seventv_emotes.unlisted_emotes');

			if (!channelEmotes.emote_set) return false;

			const ffzEmotes = [];
			if (channelEmotes.emote_set.emotes) {
				for (const emote of channelEmotes.emote_set.emotes) {
					if (showUnlisted || !this.isEmoteUnlisted(emote)) {
						const convertedEmote = this.convertEmote(emote);
						if (!convertedEmote) continue;

						ffzEmotes.push(convertedEmote);
					}
				}
			}

			this.setToChannelMap.set(channelEmotes.emote_set.id, channel.id);

			this.setChannelSet(channel, ffzEmotes);
			return true;
		}
		else {
			this.setChannelSet(channel, null);
			return false;
		}
	}

	handleChannelEmoteUpdate(body) {
		if (!this.settings.get('addon.seventv_emotes.channel_emotes')) return;

		let channel;
		for (const room of this.chat.iterateRooms()) {
			if (room) {
				channel = room;
				break;
			}
		}

		if (channel) {
			let action;
			let dataType;
			let completed = false;

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

			for (const emote of body[dataType]) {
				if (emote.key !== 'emotes') continue;

				const emoteId = emote.value?.id ?? emote.old_value.id;
				const oldEmote = this.getEmoteFromChannelSet(channel, emoteId);

				switch (action) {
					case 'UPDATE':
						if (!oldEmote) break;

						completed = this.addEmoteToChannelSet(channel, emote.value);
						break;
					case 'ADD':
						completed = this.addEmoteToChannelSet(channel, emote.value);
						break;
					case 'REMOVE':
						completed = this.removeEmoteFromChannelSet(channel, emoteId);
						break;
				}

				if (completed) {
					let message = `${body.actor.display_name} `;
					switch (action) {
						case 'ADD': {
							message += `added the emote ${emote.value.name} (${emote.value.name})`;
							break;
						}
						case 'REMOVE': {
							message += `removed the emote ${emote.old_value.name}`;
							break;
						}
						case 'UPDATE': {
							if (oldEmote?.name !== emote.value.name) {
								message += `renamed the emote ${oldEmote.name} to ${emote.value.name} (${emote.value.name})`;
							} else {
								message += `updated the emote ${emote.value.name} (${emote.value.name})`;
							}
							break;
						}
					}

					const socket = this.resolve('..socket');
					socket.addChatNotice(channel, message);
				}
			}
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

	isZeroWidthEmote(flags) {
		return flags === (1 << 0);
	}

	convertEmote(emote) {
		const emoteHostUrl = emote?.data?.host?.url;
		if (!emoteHostUrl) return null;

		const format = this.settings.get('addon.seventv_emotes.emote_format');
		const formatEmoteVersions = emote.data.host.files.filter((value => value.format === format));
		if (!formatEmoteVersions.length) return null;

		const emoteUrls = formatEmoteVersions.reduce((acc, value, key) => {
			acc[key + 1] = `${emoteHostUrl}/${value.name}`;
			return acc;
		}, {});

		let staticEmoteUrls;
		if (emote.data.animated) {
			staticEmoteUrls = formatEmoteVersions.reduce((acc, value, key) => {
				acc[key + 1] = `${emoteHostUrl}/${value.static_name}`;
				return acc;
			}, {});
		}

		const ffzEmote = {
			id: emote.id,
			name: emote.name,
			owner: {
				display_name: emote.data?.owner?.display_name,
				name: emote.data?.owner?.username
			},
			urls: emoteUrls,
			modifier: this.isZeroWidthEmote(emote.flags),
			modifier_offset: '0',
			width: formatEmoteVersions[0]?.width,
			height: formatEmoteVersions[0]?.height,
			click_url: this.api.getEmoteAppURL(emote),
			SEVENTV_emote: emote
		};

		if (staticEmoteUrls) {
			ffzEmote.animated = ffzEmote.urls;
			ffzEmote.urls = staticEmoteUrls;
		}

		return ffzEmote;
	}

	isEmoteUnlisted(emote) {
		return !emote.data.listed;
	}
}
