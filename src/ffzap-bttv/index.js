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

		this.GIF_EMOTES_MODE = {
			DISABLED: 0,
			STATIC: 1,
			ANIMATED: 2,
		};

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

		this.settings.add('ffzap.betterttv.gif_emoticons_mode', {
			default: 1,

			ui: {
				path: 'Add-Ons > BetterTTV Emotes >> Emotes',
				title: 'GIF Emotes',
				description: 'Change the mode of how GIF emoticons are showing up.',
				component: 'setting-select-box',
				data: [
					{ value: 0, title: 'Disabled' },
					{ value: 1, title: 'Enabled (Static GIF Emotes)' },
					{ value: 2, title: 'Enabled (Animated GIF Emotes)' },
				],
			},
		});

		this.settings.add('ffzap.betterttv.pro_emoticons', {
			default: true,

			ui: {
				path: 'Add-Ons > BetterTTV Emotes >> Emotes',
				title: 'Pro Emotes',
				description: 'Enable to show BetterTTV Pro emoticons.',
				component: 'setting-check-box',
			},
		});

		this.chat.context.on('changed:ffzap.betterttv.global_emoticons', this.updateEmotes, this);
		this.chat.context.on('changed:ffzap.betterttv.arbitrary_emoticons', this.updateEmotes, this);
		this.chat.context.on('changed:ffzap.betterttv.channel_emoticons', this.updateEmotes, this);
		this.chat.context.on('changed:ffzap.betterttv.gif_emoticons_mode', this.updateEmotes, this);
		this.chat.context.on('changed:ffzap.betterttv.pro_emoticons', () => {
			if (this.chat.context.get('ffzap.betterttv.pro_emoticons')) {
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
		}, this);

		this.pro_users = {};
		this.night_subs = {};
		this.socket = false;
	}

	onEnable() {
		this.log.debug('FFZ:AP\'s BetterTTV Emotes module was enabled successfully.');

		this.on('chat:room-add', this.roomAdd);
		this.on('chat:room-remove', this.roomRemove);
		this.on('chat:receive-message', this.onReceiveMessage);

		this.addBadges();

		this.socket = new Socket(this, this.getSocketEvents());
		this.updateGlobalEmotes();

		if (this.chat.context.get('ffzap.betterttv.pro_emoticons')) {
			this.socket.connect();
		}

		for (const room of this.chat.iterateRooms()) {
			if (room) this.updateChannel(room);
		}

		this.hookBTTVSettingChange();
	}

	roomAdd(room) {
		this.updateChannel(room);
	}

	roomRemove(room) {
		this.updateChannel(room);

		if (this.chat.context.get('ffzap.betterttv.pro_emoticons')) {
			this.socket.partChannel(room.id);
		}
	}

	onReceiveMessage(msg) {
		const user = this.resolve('site').getUser();
		if (user) {
			const msg_user_id = msg.message.user.id;
			if (user.id === msg_user_id) {
				this.socket.broadcastMe(msg.channel);
			}
		}
	}

	getSocketEvents() {
		return {
			lookup_user: subscription => {
				if (!subscription.pro || !this.chat.context.get('ffzap.betterttv.pro_emoticons')) {
					return;
				}

				if (subscription.pro && subscription.emotes) {
					if (this.pro_users[subscription.name]) {
						this.pro_users[subscription.name].emotes_array = subscription.emotes;
						this.pro_users[subscription.name].loadEmotes();
					} else {
						this.pro_users[subscription.name] = new ProUser(this, subscription.name, subscription.emotes);
					}
				}

				if (subscription.subscribed) { // Night's subs
					if (!(this.night_subs[subscription.name])) {
						this.night_subs[subscription.name] = true;
						this.chat.getUser(undefined, subscription.name).addSet('addon--ffzap.betterttv', 'addon--ffzap.betterttv--emotes-special-night');
					}
				}
			},
		};
	}

	hookBTTVSettingChange(newAttempts = 0) {
		if (window.BetterTTV) {
			window.BetterTTV.settings.on('changed.bttvGIFEmotes', () => this.updateEmotes());
		}
		else {
			setTimeout(this.hookBTTVSettingChange.bind(this, newAttempts), 1000);
		}
	}

	getAnimatedEmoteMode() {
		let emoteMode = this.chat.context.get('ffzap.betterttv.gif_emoticons_mode');
		if (window.BetterTTV && window.BetterTTV.settings.get('bttvGIFEmotes') && emoteMode !== this.GIF_EMOTES_MODE.DISABLED) {
			emoteMode = this.GIF_EMOTES_MODE.ANIMATED;
		}

		return emoteMode;
	}

	async addBadges(attempts = 0) {
		const response = await fetch('https://api.betterttv.net/3/cached/badges');
		if (response.ok) {
			const data = await response.json();

			const types = [];

			const reg = new RegExp(/\/badge-(\w+)\.svg/);

			let i = data.length;
			while (i--) {
				const _badge = data[i];

				if (!reg.test(_badge.badge.svg)) {
					continue;
				}

				const name = reg.exec(_badge.badge.svg)[1];

				if (!types[name]) {
					const badgeData = {
						id: `bttv-${name}`,
						slot: 21,
						image: _badge.badge.svg,
						svg: true,
						title: _badge.badge.description,
						no_invert: true,
					};

					types[name] = true;

					this.badges.loadBadgeData(`addon--ffzap.betterttv--badges-bttv-${name}`, badgeData);
				}

				this.chat.getUser(_badge.providerId).addBadge('addon--ffzap.betterttv', `addon--ffzap.betterttv--badges-bttv-${name}`);
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
		const realID = 'addon--ffzap.betterttv--emotes-global';
		this.emotes.removeDefaultSet('addon--ffzap.betterttv', realID);
		this.emotes.unloadSet(realID);

		if (!this.chat.context.get('ffzap.betterttv.global_emoticons')) {
			return;
		}

		const response = await fetch('https://api.betterttv.net/3/cached/emotes/global');
		if (response.ok) {
			const emotes = await response.json();

			const globalBttv = [];
			const arbitraryEmotes = [];
			const nightSubEmotes = [];

			// const overlayEmotes = {
			//     'SoSnowy': '2px 0 0 0',
			//     'CandyCane': null,
			//     'ReinDeer': null,
			//     'IceCold': '2px 0 0 0',
			//     'TopHat': null,
			//     'SantaHat': null,
			// };

			let i = emotes.length;
			while (i--) {
				const dataEmote = emotes[i];

				const arbitraryEmote = /[^A-Za-z0-9]/.test(dataEmote.code);

				const emote = {
					id: dataEmote.id,
					urls: {
						1: dataEmote.url,
					},
					name: dataEmote.code,
					width: dataEmote.width,
					height: dataEmote.height,
					require_spaces: arbitraryEmote,
					// modifier: overlayEmotes.hasOwnProperty(dataEmote.code),
					// modifier_offset: overlayEmotes[dataEmote.code],
				};

				emote.urls = {
					1: `https://cdn.betterttv.net/emote/${emote.id}/1x`,
					2: `https://cdn.betterttv.net/emote/${emote.id}/2x`,
					4: `https://cdn.betterttv.net/emote/${emote.id}/3x`,
				};

				if (dataEmote.imageType === 'gif') { // If the emote is a GIF
					if (this.getAnimatedEmoteMode() === this.GIF_EMOTES_MODE.DISABLED) {
						// If the GIF setting is set to "Disabled", ignore it.
						continue;
					} else if (this.getAnimatedEmoteMode() === this.GIF_EMOTES_MODE.STATIC) {
						// If the GIF setting is set to "Static", route them through the cache.
						emote.urls[1] = `https://cache.ffzap.com/${emote.urls[1]}`;
						emote.urls[2] = `https://cache.ffzap.com/${emote.urls[2]}`;
						emote.urls[4] = `https://cache.ffzap.com/${emote.urls[4]}`;
					}
				}

				if (dataEmote.channel && dataEmote.channel === 'night') {
					nightSubEmotes.push(emote);
				} else {
					if (arbitraryEmote) {
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
					emoticons: nightSubEmotes,
					title: 'Night (Legacy)',
					source: 'BetterTTV',
					icon: 'https://cdn.betterttv.net/tags/developer.png',
					sort: 50,
				};

				this.emotes.loadSetData('addon--ffzap.betterttv--emotes-special-night', set);
			}

			let setEmotes = [];
			setEmotes = setEmotes.concat(globalBttv);

			if (this.chat.context.get('ffzap.betterttv.arbitrary_emoticons')) {
				setEmotes = setEmotes.concat(arbitraryEmotes);
			}

			if (setEmotes.length === 0) {
				return;
			}

			set = {
				emoticons: setEmotes,
				title: 'Global Emotes',
				source: 'BetterTTV',
				icon: 'https://cdn.betterttv.net/tags/developer.png',
				_type: 1,
			};

			this.emotes.addDefaultSet('addon--ffzap.betterttv', realID, set);
		} else {
			if (response.status === 404) return;

			const newAttempts = (attempts || 0) + 1;
			if (newAttempts < 12) {
				this.log.error('Failed to fetch global emotes. Trying again in 5 seconds.');
				setTimeout(this.updateGlobalEmotes.bind(this, newAttempts), 5000);
			}
		}
	}

	async updateChannel(room, attempts = 0) {
		const realID = `addon--ffzap.betterttv--channel-${room.id}`;
		room.removeSet('addon--ffzap.betterttv', realID);
		this.emotes.unloadSet(realID);

		if (this.chat.context.get('ffzap.betterttv.pro_emoticons')) {
			this.socket.joinChannel(room.login);
		}

		if (!this.chat.context.get('ffzap.betterttv.channel_emoticons')) {
			return;
		}

		const response = await fetch(`https://api.betterttv.net/3/cached/users/twitch/${room.id}`);
		if (response.ok) {
			const channelBttv = [];
			const { channelEmotes, sharedEmotes, bots } = await response.json();

			const emotes = channelEmotes.concat(sharedEmotes);

			for (const bot of bots) {
				const botUser = room.getUser(null, bot);
				if (botUser) {
					botUser.addBadge('ffz', 2);
				}
			}

			let i = emotes.length;
			while (i--) {
				const requireSpaces = /[^A-Za-z0-9]/.test(emotes[i].code);

				const emoteFromArray = emotes[i];
				const { id, code, user } = emoteFromArray;

				const emote = {
					urls: {
						1: `https://cdn.betterttv.net/emote/${id}/1x`,
						2: `https://cdn.betterttv.net/emote/${id}/2x`,
						4: `https://cdn.betterttv.net/emote/${id}/3x`,
					},
					id,
					name: code,
					width: 28,
					height: 28,
					owner: {
						display_name: (user && user.displayName) || (room && room.data && room.data.display_name) || room.login,
						name: (user && user.name) || room.login,
					},
					require_spaces: requireSpaces,
				};

				if (emoteFromArray.imageType === 'gif') {
					switch (this.getAnimatedEmoteMode()) {
						case this.GIF_EMOTES_MODE.DISABLED:
							break;

						case this.GIF_EMOTES_MODE.STATIC:
							emote.urls[1] = `https://cache.ffzap.com/${emote.urls[1]}`;
							emote.urls[2] = `https://cache.ffzap.com/${emote.urls[2]}`;
							emote.urls[4] = `https://cache.ffzap.com/${emote.urls[4]}`;

							channelBttv.push(emote);
							break;

						case this.GIF_EMOTES_MODE.ANIMATED:
							channelBttv.push(emote);
							break;

						default:
							channelBttv.push(emote);
							break;
					}
				} else {
					channelBttv.push(emote);
				}
			}

			if (!channelBttv.length) {
				return;
			}

			const set = {
				emoticons: channelBttv,
				title: 'Channel Emotes',
				source: 'BetterTTV',
				icon: 'https://cdn.betterttv.net/tags/developer.png',
				_type: 1,
			};

			if (channelBttv.length) {
				room.addSet('addon--ffzap.betterttv', realID, set);
			}
		} else {
			if (response.status === 404) return;

			const newAttempts = (attempts || 0) + 1;
			if (newAttempts < 12) {
				this.log.error('Failed to fetch channel emotes. Trying again in 5 seconds.');
				setTimeout(this.updateChannel.bind(this, room, newAttempts), 5000);
			}
		}
	}

	updateEmotes() {
		this.updateGlobalEmotes();

		for (const room of this.chat.iterateRooms()) {
			if (room) this.updateChannel(room);
		}
	}
}

BetterTTV.register();
