import Socket from './socket';
import ProUser from './pro_user';

import { PREFIX, ICON, generateEmoteBlock, generateClickURL } from './shared';

const { has } = FrankerFaceZ.utilities.object;

const API_SERVER = 'https://api.betterttv.net/3/cached',
	BADGE_NAME = /\/badge-(\w+)\.svg/,
	ARBITRARY_TEST = /[^A-Z0-9]/i,

	OVERLAY_EMOTES = {
		'cvMask': '3px 0 0 0',
		'cvHazmat': '3px 0 0 0',

		// Christmas emotes
		'SoSnowy': '2px 0 0 0',
		'IceCold': '2px 0 0 0',
		'TopHat': null,
		'SantaHat': null,
	},

	GLOBAL_ID = `${PREFIX}--emotes-global`,
	NIGHT_SET_ID = `${PREFIX}--emotes-special-night`;


class BetterTTV extends Addon {
	constructor(...args) {
		super(...args);

		this.inject('settings');
		this.inject('chat');
		this.inject('chat.emotes');
		this.inject('chat.badges');
		this.inject('site');

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

		this.settings.add('ffzap.betterttv.pro_emoticons', {
			default: true,

			ui: {
				path: 'Add-Ons > BetterTTV Emotes >> Emotes',
				title: 'Pro Emotes',
				description: 'Enable to show BetterTTV Pro emoticons.',
				component: 'setting-check-box',
			},
		});

		this.chat.context.on('changed:ffzap.betterttv.global_emoticons', this.updateGlobalEmotes, this);
		this.chat.context.on('changed:ffzap.betterttv.arbitrary_emoticons', this.updateGlobalEmotes, this);
		this.chat.context.on('changed:ffzap.betterttv.channel_emoticons', this.updateChannelEmotes, this);
		this.chat.context.on('changed:ffzap.betterttv.pro_emoticons', val => {
			if ( val ) {
				this.socket.connect();

				for (const room of this.chat.iterateRooms())
					if ( room?.login )
						this.socket.joinChannel(room.login);

			} else {
				for (const key in this.ProUsers) {
					if ( has(this.ProUsers, key) )
						this.ProUsers[key].destroy();
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

		if (this.chat.context.get('ffzap.betterttv.pro_emoticons')) {
			this.socket.connect();
		}

		this.updateGlobalEmotes();
		for ( const room of this.chat.iterateRooms() )
			if ( room )
				this.roomAdd(room);
	}

	roomAdd(room) {
		this.updateChannel(room);

		if ( this.chat.context.get('ffzap.betterttv.pro_emoticons') )
			this.socket.joinChannel(room.login);
	}

	roomRemove(room) {
		if ( this.chat.context.get('ffzap.betterttv.pro_emoticons') )
			this.socket.partChannel(room.id);
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
						this.chat.getUser(undefined, subscription.name).addSet(PREFIX, NIGHT_SET_ID);
					}
				}
			},
		};
	}

	async addBadges(attempts = 0) {
		const response = await fetch(`${API_SERVER}/badges`);
		if (response.ok) {
			const data = await response.json(),
				types = [];

			let i = data.length;
			while (i--) {
				const _badge = data[i],
					match = BADGE_NAME.exec(_badge.badge.svg),
					name = match?.[1];

				if ( ! name )
					continue;

				const badge_id = `${PREFIX}--badges-bttv-${name}`;

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

					this.badges.loadBadgeData(badge_id, badgeData);
				}

				this.chat.getUser(_badge.providerId).addBadge(PREFIX, badge_id);
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
		if ( ! this.chat.context.get('ffzap.betterttv.global_emoticons') ) {
			this.emotes.removeDefaultSet(PREFIX, GLOBAL_ID);
			return;
		}

		const response = await fetch(`${API_SERVER}/emotes/global`);
		if (response.ok) {
			const emotes = await response.json();
			const wants_arbitrary = this.chat.context.get('ffzap.betterttv.arbitrary_emoticons');

			const globalBttv = [];
			const nightSubEmotes = [];

			let i = emotes.length;
			while (i--) {
				const dataEmote = emotes[i];
				const id = dataEmote.id,
					is_night = dataEmote.channel === 'night',
					is_arbitrary = ! is_night && ARBITRARY_TEST.test(dataEmote.code),
					is_animated = dataEmote.imageType === 'gif';

				if ( is_arbitrary && ! wants_arbitrary ) {
					console.log('Skipping arbitrary', dataEmote);
					continue;
				}

				const emote = {
					id: dataEmote.id,
					urls: generateEmoteBlock(id, is_animated),
					animated: is_animated ? generateEmoteBlock(id) : null,
					name: dataEmote.code,
					width: dataEmote.width,
					height: dataEmote.height,
					require_spaces: is_arbitrary,
					modifier: has(OVERLAY_EMOTES, dataEmote.code),
					modifier_offset: OVERLAY_EMOTES[dataEmote.code],
					click_url: generateClickURL(id)
				};

				if ( is_night )
					nightSubEmotes.push(emote);
				else
					globalBttv.push(emote);
			}

			if ( nightSubEmotes.length )
				this.emotes.loadSetData(NIGHT_SET_ID, {
					title: 'Night (Legacy)',
					source: 'BetterTTV',
					icon: ICON,
					sort: 50,
					emotes: nightSubEmotes
				});

			if ( globalBttv.length )
				this.emotes.addDefaultSet(PREFIX, GLOBAL_ID, {
					title: 'Global Emotes',
					source: 'BetterTTV',
					icon: ICON,
					_type: 1,
					emotes: globalBttv
				});
			else
				this.emotes.removeDefaultSet(PREFIX, GLOBAL_ID);

		} else {
			if ( response.status === 404 )
				return;

			const newAttempts = (attempts || 0) + 1;
			if (newAttempts < 12) {
				this.log.error('Failed to fetch global emotes. Trying again in 5 seconds.');
				setTimeout(this.updateGlobalEmotes.bind(this, newAttempts), 5000);
			}
		}
	}

	async updateChannel(room, attempts = 0) {
		const set_id = `${PREFIX}--channel-${room.id}`;

		if ( ! this.chat.context.get('ffzap.betterttv.channel_emoticons') ) {
			room.removeSet(PREFIX, set_id);
			return;
		}

		const response = await fetch(`${API_SERVER}/users/twitch/${room.id}`);
		if (response.ok) {
			const channelBttv = [];
			const { channelEmotes, sharedEmotes, bots } = await response.json();

			const emotes = channelEmotes.concat(sharedEmotes);

			for (const bot of bots) {
				const botUser = room.getUser(null, bot);
				if (botUser) {
					botUser.addBadge(PREFIX, 2);
				}
			}

			let i = emotes.length;
			while (i--) {
				const data = emotes[i],
					is_animated = data.imageType === 'gif',
					require_spaces = ARBITRARY_TEST.test(data.code),

					id = data.id,
					user = data.user;

				channelBttv.push({
					id,
					name: data.code,
					width: 28,
					height: 28,
					owner: user ? {
						display_name: user.displayName || user.name,
						name: user.name
					} : room.data ? {
						display_name: room.data.display_name || room.data.login,
						name: room.data.login
					} : null,
					require_spaces,
					click_url: generateClickURL(id),
					urls: generateEmoteBlock(id, is_animated),
					animated: is_animated ? generateEmoteBlock(id) : null
				});
			}

			if ( channelBttv.length )
				room.addSet(PREFIX, set_id, {
					title: 'Channel Emotes',
					source: 'BetterTTV',
					icon: ICON,
					_type: 1,
					emotes: channelBttv
				});
			else
				room.removeSet(PREFIX, set_id);

		} else {
			if (response.status === 404)
				return;

			const newAttempts = (attempts || 0) + 1;
			if (newAttempts < 12) {
				this.log.error('Failed to fetch channel emotes. Trying again in 5 seconds.');
				setTimeout(this.updateChannel.bind(this, room, newAttempts), 5000);
			}
		}
	}

	updateChannelEmotes() {
		for (const room of this.chat.iterateRooms()) {
			if (room) this.updateChannel(room);
		}
	}
}

BetterTTV.register();
