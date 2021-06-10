import Socket from './socket';

import { PREFIX, ICON, ARBITRARY_TEST, hydrateEmote } from './shared';

const API_SERVER = 'https://api.betterttv.net/3/cached',
	BADGE_NAME = /\/badge-(\w+)\.svg/,

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
				for(const name of this.pro_users)
					this.removeProUser(name);

				for(const name of this.night_subs) {
					const user = this.chat.getUser(null, name, true);
					if ( user )
						user.removeSet(PREFIX, NIGHT_SET_ID);
				}

				this.night_subs.clear();
				this.pro_users.clear();
				this.socket.disconnectInternal();
			}

		}, this);

		this.pro_users = new Set;
		this.night_subs = new Set;
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

		if ( room.login && this.chat.context.get('ffzap.betterttv.pro_emoticons') )
			this.socket.joinChannel(room.login);
	}

	roomRemove(room) {
		if ( room.login && this.chat.context.get('ffzap.betterttv.pro_emoticons') )
			this.socket.partChannel(room.login);
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
			lookup_user: sub => {
				if ( ! sub.pro || ! this.chat.context.get('ffzap.betterttv.pro_emoticons') )
					return;

				const name = sub.name;
				if ( sub.emotes )
					this.addProUser(name, sub.emotes);

				if ( sub.subscribed && ! this.night_subs.includes(name) ) {
					// Night's subs
					this.night_subs.add(name);
					this.chat.getUser(null, name).addSet(PREFIX, NIGHT_SET_ID);
				}
			},
		};
	}

	addProUser(name, data) {
		const has_emotes = Array.isArray(data) && data.length;
		if ( ! has_emotes )
			return this.removeProUser(name);

		const user = this.chat.getUser(null, name);
		if ( ! user )
			return;

		const emotes = [];
		for(const raw_emote of data)
			emotes.push(hydrateEmote(raw_emote));

		const set_id = `${PREFIX}--emotes-pro-${name}`;
		this.emotes.loadSetData(set_id, {
			title: 'Personal Emotes',
			source: 'BetterTTV',
			icon: ICON,
			emotes
		});

		user.addSet(PREFIX, set_id);
		this.pro_users.add(name);
	}

	removeProUser(name) {
		const user = this.chat.getUser(null, name, true);
		if ( user )
			user.removeSet(PREFIX, `${PREFIX}--emotes-pro-${name}`);

		this.pro_users.delete(name);
	}

	async addBadges(attempts = 0) {
		const response = await fetch(`${API_SERVER}/badges`);
		if (response.ok) {
			const data = await response.json(),
				types = new Set;

			for(const raw_badge of data) {
				const match = BADGE_NAME.exec(raw_badge.badge.svg),
					name = match?.[1];

				if ( ! name )
					continue;

				const badge_id = `${PREFIX}--badges-bttv-${name}`;

				if ( ! types.has(name) ) {
					types.add(name);
					this.badges.loadBadgeData(badge_id, {
						id: `bttv-${name}`,
						slot: 21,
						image: raw_badge.badge.svg,
						svg: true,
						title: raw_badge.badge.description,
						no_invert: true
					});
				}

				this.chat.getUser(raw_badge.providerId).addBadge(PREFIX, badge_id);
			}

		} else {
			if ( response.status === 404 )
				return;

			attempts = (attempts || 0) + 1;
			if (attempts < 12) {
				this.log.error('Failed to fetch badges. Trying again in 5 seconds.');
				setTimeout(() => this.addBadges(attempts), 5000);
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
			const data = await response.json();
			const wants_arbitrary = this.chat.context.get('ffzap.betterttv.arbitrary_emoticons');

			const globals = [],
				night_subs = [];

			for(const raw_emote of data) {
				const is_night = raw_emote.channel === 'night',
					is_arbitrary = ! is_night && ARBITRARY_TEST.test(raw_emote.code);

				if ( is_arbitrary && ! wants_arbitrary )
					continue;

				const emote = hydrateEmote(raw_emote, null, OVERLAY_EMOTES);
				if ( is_night )
					night_subs.push(emote);
				else
					globals.push(emote);
			}

			if ( night_subs.length )
				this.emotes.loadSetData(NIGHT_SET_ID, {
					title: 'Night (Legacy)',
					source: 'BetterTTV',
					icon: ICON,
					sort: 50,
					emotes: night_subs
				});

			if ( globals.length )
				this.emotes.addDefaultSet(PREFIX, GLOBAL_ID, {
					title: 'Global Emotes',
					source: 'BetterTTV',
					icon: ICON,
					_type: 1,
					emotes: globals
				});
			else
				this.emotes.removeDefaultSet(PREFIX, GLOBAL_ID);

		} else {
			if ( response.status === 404 )
				return;

			attempts = (attempts || 0) + 1;
			if (attempts < 12) {
				this.log.error('Failed to fetch global emotes. Trying again in 5 seconds.');
				setTimeout(() => this.updateChannelEmotes(attempts), 5000);
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
			const data = await response.json(),
				emotes = [];

			if ( Array.isArray(data.bots) )
				for(const name of data.bots)
					room.getUser(null, name).addBadge(PREFIX, 2);

			if ( Array.isArray(data.channelEmotes) )
				for(const raw_emote of data.channelEmotes)
					emotes.push(hydrateEmote(raw_emote, room.data));

			if ( Array.isArray(data.sharedEmotes) )
				for(const raw_emote of data.sharedEmotes)
					emotes.push(hydrateEmote(raw_emote, room.data));

			if ( emotes.length )
				room.addSet(PREFIX, set_id, {
					title: 'Channel Emotes',
					source: 'BetterTTV',
					icon: ICON,
					_type: 1,
					emotes
				});
			else
				room.removeSet(PREFIX, set_id);

		} else {
			if (response.status === 404)
				return;

			attempts = (attempts || 0) + 1;
			if (attempts < 12) {
				this.log.error('Failed to fetch channel emotes. Trying again in 5 seconds.');
				setTimeout(() => this.updateChannel(room, attempts), 5000);
			}
		}
	}

	updateChannelEmotes() {
		for (const room of this.chat.iterateRooms())
			if (room)
				this.updateChannel(room);
	}
}

BetterTTV.register();
