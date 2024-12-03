import Socket from './socket';
import ProUser from './pro_user';

class BetterTTV extends Addon {
	constructor(...args) {
		super(...args);

		this.inject('settings');
		this.inject('chat');
		this.inject('chat.emotes');
		this.inject('chat.badges');
		this.inject('site');
		this.inject('i18n');
		this.inject('load_tracker');

		this.settings.add('ffzap.betterttv.global_emoticons', {
			default: true,

			ui: {
				path: 'Add-Ons > BetterTTV Emotes >> Emotes',
				title: 'Global Emotes',
				description: 'Enable to show global BetterTTV emoticons.',
				component: 'setting-check-box',
			},
		});

		this.settings.add('ffzap.betterttv.arbitrary_emoticons', {
			default: true,

			ui: {
				path: 'Add-Ons > BetterTTV Emotes >> Emotes',
				title: 'Arbitrary Emotes',
				description: 'Enable to show arbitrary emoticons (like D:, :tf: and similar).',
				component: 'setting-check-box',
			},
		});

		this.settings.add('ffzap.betterttv.channel_emoticons', {
			default: true,

			ui: {
				path: 'Add-Ons > BetterTTV Emotes >> Emotes',
				title: 'Channel Emotes',
				description: 'Enable to show per-channel BetterTTV emoticons.',
				component: 'setting-check-box',
			},
		});

		this.settings.add('ffzap.betterttv.update_messages', {
			default: true,
			ui: {
				path: 'Add-Ons > BetterTTV Emotes >> Emotes > Live Emote Updates',
				title: 'Show update messages',
				description: 'Show messages in chat when emotes are updated in the current channel.',
				component: 'setting-check-box',
			}
		});

		this.settings.add('ffzap.betterttv.pro_badges', {
			default: true,

			ui: {
				path: 'Add-Ons > BetterTTV Emotes >> Pro',
				title: 'Pro Badges',
				description: 'Enable to show BetterTTV Pro badges.',
				component: 'setting-check-box',
			},
		});

		this.settings.add('ffzap.betterttv.pro_emoticons', {
			default: true,

			ui: {
				path: 'Add-Ons > BetterTTV Emotes >> Pro',
				title: 'Pro Emoticons',
				description: 'Enable to show BetterTTV Pro emoticons.',
				component: 'setting-check-box',
			},
		});
		
		this.chat.context.on('changed:ffzap.betterttv.global_emoticons', this.updateEmotes, this);
		this.chat.context.on('changed:ffzap.betterttv.arbitrary_emoticons', this.updateEmotes, this);
		this.chat.context.on('changed:ffzap.betterttv.channel_emoticons', this.updateEmotes, this);
		this.chat.context.on('changed:ffzap.betterttv.pro_badges', () => {
			this.addProBadge();
			this.updateProStatus();
			this.emit('chat:update-lines');
		}, this);
		this.chat.context.on('changed:ffzap.betterttv.pro_emoticons', this.updateProStatus, this);

		this.pro_users = {};
		this.night_subs = {};
		this.socket = false;

		this.room_emotes = {};

		this.on('chat:reload-data', flags => {
			if (!flags || flags.badges) {
				this.addBadges();
			}

			if (!flags || flags.emotes) {
				this.updateGlobalEmotes();

				for (const room of this.chat.iterateRooms()) {
					if (room) this.updateChannel(room);
				}
			}
		});
	}

	onEnable() {
		this.log.debug('FFZ:AP\'s BetterTTV Emotes module was enabled successfully.');

		this.emotes.setProvider('addon--ffzap.betterttv', {
			name: this.addon_manifest.name,
			icon: this.addon_manifest.icon,
		});

		this.on('chat:room-add', this.roomAdd);
		this.on('chat:room-remove', this.roomRemove);
		this.on('chat:receive-message', this.onReceiveMessage);

		this.addBadges();

		this.socket = new Socket(this, this.getSocketEvents());
		this.updateGlobalEmotes();

		if (this.shouldSocketBeConnected()) {
			this.socket.connect();
		}

		for (const room of this.chat.iterateRooms()) {
			if (room) this.updateChannel(room);
		}

		this.addProBadge();
	}

	roomAdd(room) {
		this.updateChannel(room);
	}

	roomRemove(room) {
		this.updateChannel(room);

		if (this.shouldSocketBeConnected()) {
			this.socket.partChannel(room.id);
		}
	}

	onReceiveMessage(msg) {
		const user = this.resolve('site').getUser();
		if (user) {
			const msg_user_id = msg.message.user.id;
			if (user.id === msg_user_id) {
				this.socket.broadcastMe(`twitch:${msg.channelID}`);
			}
		}
	}

	addEmoteUpdateMessage(bttvChannel, message) {
		const channelId = bttvChannel.replace('twitch:', '');
		const channel = this.chat.getRoom(channelId);

		this.addChatNotice(channel, message);
	}

	addChatNotice(channel, message, tokenize = true) {
		if (!channel.login) return;

		if (!this.settings.get('ffzap.betterttv.update_messages')) return;
		
		this.resolve('site.chat').addNotice(channel.login, {
			message,
			icon: new URL('https://betterttv.com/favicon.png'),
			tokenize
		});
	}

	getSocketEvents() {
		return {
			lookup_user: data => {
				let emotesChanged = false;
				let badgesChanged = false;

				if (data.subscribed) { // Night's subs
					if (!this.night_subs[data.providerId]) {
						this.night_subs[data.providerId] = true;
						this.chat.getUser(data.providerId).addSet('addon--ffzap.betterttv', 'addon--ffzap.betterttv--emotes-special-night');

						emotesChanged = true;
					}
				}

				if (data.pro) {
					let pro_user = this.pro_users[data.providerId];
					if (!pro_user) {
						pro_user = this.pro_users[data.providerId] = new ProUser(this, data.providerId, data.badge, data.emotes);

						emotesChanged = true;
						badgesChanged = true;
					}

					// BetterTTV Personal Emotes
					if (this.chat.context.get('ffzap.betterttv.pro_emoticons') && pro_user.loadEmotes(data.emotes)) {
						emotesChanged = true;
					}
					
					// BetterTTV Pro Badge
					if (pro_user.loadBadge(data.badge)) {
						badgesChanged = true;
					}
				}

				if (emotesChanged || badgesChanged) {
					this.emit('chat:update-lines-by-user', data.providerId, data.name, emotesChanged, badgesChanged);
				}
			},
			emote_create: ({ channel, emote: createdEmote }) => {
				this.log.info(channel, createdEmote);
				const emotes = this.room_emotes[channel];
				if (!emotes) return;

				const emoteExists = emotes.some(e => e.id === createdEmote.id);
				if (emoteExists) return;

				const emote = this.convertBTTVEmote(createdEmote);
				emotes.push(emote);

				this.emotes.addEmoteToSet(this.getChannelSetID(channel, false), emote);

				this.addEmoteUpdateMessage(channel, `Added the emote ${emote.name} (${emote.name})`);
			},
			emote_delete: ({ channel, emoteId }) => {
				const emotes = this.room_emotes[channel];
				if (!emotes) return;

				const existingEmote = emotes.find(e => e.id === emoteId);
				if (!existingEmote) return;

				this.room_emotes[channel] = emotes.filter(e => e.id !== emoteId);

				this.emotes.removeEmoteFromSet(this.getChannelSetID(channel, false), emoteId);

				this.addEmoteUpdateMessage(channel, `Removed the emote ${existingEmote.name}`);
			},
			emote_update: ({ channel, ...payload }) => {
				const updatedEmote = payload.emote;

				const emotes = this.room_emotes[channel];
				if (!emotes) return;

				const emote = emotes.find(e => e.id === updatedEmote.id);
				if (!emote) return;

				const oldName = emote.name;
				emote.name = updatedEmote.code;

				this.emotes.addEmoteToSet(this.getChannelSetID(channel, false), emote);

				this.addEmoteUpdateMessage(channel, `Renamed the emote ${oldName} to ${emote.name} (${emote.name})`);
			}
		};
	}

	getProBadgeID() {
		return 'addon--ffzap.betterttv--badges-bttv-pro';
	}

	addProBadge() {
		const wanted = this.chat.context.get('ffzap.betterttv.pro_badges') && ! window.BetterTTV;

		this.removeProBadge(!wanted);
		if (!wanted)
			return;

		const badgeData = {
			id: `bttv-pro`,
			slot: 21,
			title: 'BetterTTV Pro',
			no_invert: true,
			image: 'https://cdn.betterttv.net/badges/pro/0b58eba8-e49c-4ed7-ae7d-be0b524502e6.png'
		};

		this.badges.loadBadgeData(this.getProBadgeID(), badgeData);
	}

	removeProBadge(generate_css = true) {
		this.badges.deleteBulk('addon.ffzap-bttv', this.getProBadgeID());
		this.badges.removeBadge(this.getProBadgeID(), generate_css);
	}

	async addBadges(attempts = 0) {
		if (window.BetterTTV) {
			this.log.info('Not adding BTTV badges because BTTV is present.');
			return;
		}

		const response = await fetch('https://api.betterttv.net/3/cached/badges');
		if (response.ok) {
			const data = await response.json();

			const types = [];

			const reg = new RegExp(/\/badges\/(\w+)\.svg/);

			let i = data.length;
			while (i--) {
				const bData = data[i];

				if (!reg.test(bData.badge.svg)) {
					continue;
				}

				const name = reg.exec(bData.badge.svg)[1];

				if (!types[name]) {
					const badgeData = {
						id: `bttv-${name}`,
						slot: 21,
						image: bData.badge.svg,
						svg: true,
						title: bData.badge.description,
						no_invert: true,
					};

					types[name] = true;

					this.badges.loadBadgeData(`addon--ffzap.betterttv--badges-bttv-${name}`, badgeData);
				}

				this.chat.getUser(bData.providerId).addBadge('addon--ffzap.betterttv', `addon--ffzap.betterttv--badges-bttv-${name}`);
			}
		} else {
			if (response.status === 404) return;

			const newAttempts = (attempts || 0) + 1;
			if (newAttempts < 12) {
				this.log.error('Failed to fetch badges. Trying again in 5 seconds.');
				setTimeout(this.addBadges.bind(this, newAttempts), 5000);
			}
		}
	}

	async updateGlobalEmotes(attempts = 0) {
		this.load_tracker.schedule('chat-data', 'ffzap-bttv-global');

		const realID = 'addon--ffzap.betterttv--emotes-global';
		this.emotes.removeDefaultSet('addon--ffzap.betterttv', realID);
		this.emotes.unloadSet(realID);

		const effectsID = 'addon--ffzap.betterttv--global-effects';
		this.emotes.removeDefaultSet('addon--ffzap.betterttv', effectsID);
		this.emotes.unloadSet(effectsID);

		if (!this.chat.context.get('ffzap.betterttv.global_emoticons')) {
			this.load_tracker.notify('chat-data', 'ffzap-bttv-global', false);
			return;
		}

		const response = await fetch('https://api.betterttv.net/3/cached/emotes/global');
		if (response.ok) {
			const emotes = await response.json();

			const globalBttv = [];
			const arbitraryEmotes = [];
			const nightSubEmotes = [];
			const effectEmotes = [];

			let knownEffects = {};

			if ( this.emotes?.ModifierFlags?.Hidden ) {
				const Flags = this.emotes.ModifierFlags;
				knownEffects = {
					'c!': Flags.Hidden | Flags.Cursed,
					'w!': Flags.Hidden | Flags.GrowX,
					'z!': Flags.Hidden | Flags.NoSpace,
					'v!': Flags.Hidden | Flags.FlipY,
					'h!': Flags.Hidden | Flags.FlipX,
					'l!': Flags.Hidden | (Flags.Rotate90 ?? 0),
					'r!': Flags.Hidden | (Flags.Rotate270 ?? 0)
				};
			}

			const overlayEmotes = {
				'cvMask': '3px 0 0 0',
				'cvHazmat': '3px 0 0 0',

				// Christmas emotes
				'SoSnowy': '2px 0 0 0',
				'IceCold': '2px 0 0 0',
				'TopHat': null,
				'SantaHat': null,
				'ReinDeer': null,
				'CandyCane': null,
			};

			let i = emotes.length;
			while (i--) {
				let emote = emotes[i];

				if ( knownEffects[emote.code] ) {
					emote.modifier = true;
					emote.modifier_flags = knownEffects[emote.code];
					emote.modifier_prefix = true;
				}

				emote = this.convertBTTVEmote(emote);

				emote.modifier |= Object.prototype.hasOwnProperty.call(overlayEmotes, emote.name);
				emote.modifier_offset = overlayEmotes[emote.name];

				const arbitraryEmote = /[^A-Za-z0-9]/.test(emote.name);

				if (emote.channel && emote.channel === 'night') {
					nightSubEmotes.push(emote);
				} else {
					if (emote.modifier_flags) {
						effectEmotes.push(emote);
					}
					else if (arbitraryEmote) {
						arbitraryEmotes.push(emote);
					}
					else {
						globalBttv.push(emote);
					}
				}
			}

			let set;
			if (nightSubEmotes.length > 0) {
				set = {
					emotes: nightSubEmotes,
					title: 'Night (Legacy)',
					source: 'BetterTTV',
					icon: 'https://betterttv.com/favicon.png',
					sort: 50,
				};

				this.emotes.loadSetData('addon--ffzap.betterttv--emotes-special-night', set);
			}

			let setEmotes = [];
			setEmotes = setEmotes.concat(globalBttv);

			if (this.chat.context.get('ffzap.betterttv.arbitrary_emoticons')) {
				setEmotes = setEmotes.concat(arbitraryEmotes);
			}

			if (setEmotes.length === 0 && effectEmotes.length === 0) {
				this.load_tracker.notify('chat-data', 'ffzap-bttv-global', false);
				return;
			}

			set = {
				emotes: setEmotes,
				title: 'Global Emotes',
				source: 'BetterTTV',
				icon: 'https://betterttv.com/favicon.png',
				_type: 1,
			};

			this.emotes.addDefaultSet('addon--ffzap.betterttv', realID, set);

			set = {
				emotes: effectEmotes,
				title: 'Global Effects',
				source: 'BetterTTV',
				icon: 'https://betterttv.com/favicon.png',
				_type: 1,
			};

			this.emotes.addDefaultSet('addon--ffzap.betterttv', effectsID, set);

			this.load_tracker.notify('chat-data', 'ffzap-bttv-global', true);
		} else {
			if (response.status === 404) return;

			const newAttempts = (attempts || 0) + 1;
			if (newAttempts < 12) {
				this.log.error('Failed to fetch global emotes. Trying again in 5 seconds.');
				setTimeout(this.updateGlobalEmotes.bind(this, newAttempts), 5000);
			}
		}
	}

	getChannelSetID(roomID, appendTwitch = true) {
		return `addon--ffzap.betterttv--channel-${appendTwitch ? this.getBTTVRoomID(roomID) : roomID}`
	}

	getBTTVRoomID(roomID) {
		return `twitch:${roomID}`;
	}

	convertBTTVEmote({id, code, user, animated, width, height, modifier, modifier_flags, modifier_prefix}) {
		const require_spaces = /[^A-Za-z0-9]/.test(code);

		const emote = {
			urls: {
				1: `https://cdn.betterttv.net/emote/${id}/1x.webp`,
				2: `https://cdn.betterttv.net/emote/${id}/2x.webp`,
				4: `https://cdn.betterttv.net/emote/${id}/3x.webp`,
			},
			id,
			name: code,
			width: width || 28,
			height: height || 28,
			modifier,
			modifier_flags,
			modifier_prefix,
			owner: {
				display_name: (user && user.displayName),
				name: (user && user.name),
			},
			require_spaces,
			click_url: `https://betterttv.com/emotes/${id}`
		};

		if (animated) {
			emote.animated = emote.urls;
			emote.urls = {
				1: `https://cdn.betterttv.net/emote/${id}/static/1x.webp`,
				2: `https://cdn.betterttv.net/emote/${id}/static/2x.webp`,
				4: `https://cdn.betterttv.net/emote/${id}/static/3x.webp`,
			};
		}

		return emote;
	}

	async updateChannel(room, attempts = 0) {
		this.load_tracker.schedule('chat-data', `ffzap-bttv-channel-${room.id}`);

		const realID = this.getChannelSetID(room.id);
		room.removeSet('addon--ffzap.betterttv', realID);

		const bttvRoomID = this.getBTTVRoomID(room.id);

		if (this.shouldSocketBeConnected()) {
			this.socket.joinChannel(bttvRoomID);
		}

		if (!this.chat.context.get('ffzap.betterttv.channel_emoticons')) {
			this.load_tracker.notify('chat-data', `ffzap-bttv-channel-${room.id}`, false);
			return;
		}

		const response = await fetch(`https://api.betterttv.net/3/cached/users/twitch/${room.id}`);
		if (response.ok) {
			const emotes = this.room_emotes[bttvRoomID] = [];
			const { channelEmotes, sharedEmotes, bots } = await response.json();

			const _emotes = channelEmotes.concat(sharedEmotes);

			for (const bot of bots) {
				const botUser = room.getUser(null, bot);
				if (botUser) {
					botUser.addBadge('ffz', 2);
				}
			}

			let i = _emotes.length;
			while (i--) {
				_emotes[i].user = _emotes[i].user || room && { displayName: room.login, name: room.login };

				emotes.push(this.convertBTTVEmote(_emotes[i]));
			}

			if (!emotes.length) {
				this.load_tracker.notify('chat-data', `ffzap-bttv-channel-${room.id}`, false);
				return;
			}
			
			const set = {
				emotes,
				title: 'Channel Emotes',
				title_is_channel: true,
				source: 'BetterTTV',
				icon: 'https://betterttv.com/favicon.png',
				_type: 1,
			};

			if (emotes.length) {
				this.emotes.loadSetData(realID, set, false);
				room.addSet('addon--ffzap.betterttv', realID);
			}
			else {
				room.removeSet('addon--ffzap.betterttv', realID);
			}

			this.load_tracker.notify('chat-data', `ffzap-bttv-channel-${room.id}`, true);
		} else {
			if (response.status === 404) {
				this.load_tracker.notify('chat-data', `ffzap-bttv-channel-${room.id}`, false);
				return;
			}

			const newAttempts = (attempts || 0) + 1;
			if (newAttempts < 12) {
				this.log.error('Failed to fetch channel emotes. Trying again in 5 seconds.');
				setTimeout(this.updateChannel.bind(this, room, newAttempts), 5000);
			}
			else {
				this.log.error('Failed to fetch channel emotes.');
				this.load_tracker.notify('chat-data', `ffzap-bttv-channel-${room.id}`, false);
			}
		}
	}

	updateEmotes() {
		this.updateGlobalEmotes();

		for (const room of this.chat.iterateRooms()) {
			if (room) this.updateChannel(room);
		}
	}

	shouldSocketBeConnected() {
		return this.chat.context.get('ffzap.betterttv.pro_badges')
			|| this.chat.context.get('ffzap.betterttv.pro_emoticons');
	}

	updateProStatus() {
		if (this.shouldSocketBeConnected()) {
			this.socket.connect();
			
			for (const room of this.chat.iterateRooms()) {
				if (room) this.updateChannel(room);
			}
		} else {
			for (const key in this.ProUsers) {
				if ({}.hasOwnProperty.call(this.ProUsers, key)) {
					this.ProUsers[key].unload();
				}
			}
			this.ProUsers = {};
			
			this.socket.disconnectInternal();
		}
	}
}

BetterTTV.register();