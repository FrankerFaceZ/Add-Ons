'use strict';

const {generateUUID} = FrankerFaceZ.utilities.object;

const VALID_ROUTES = [
	'embed-chat',
	'popout'
];

class PollShim extends Addon {
	constructor(...args) {
		super(...args);

		this.inject('site');
		this.inject('site.router');
		this.inject('site.twitch_data');

		this.settings.addUI('addon.poll-shim.info', {
			path: 'Add-Ons > Poll-Shim >> Info @{"sort": -1000}',
			no_filter: true,
			component: () => import('./components/info.vue'),

			shouldBeActive: () => this.shouldBeActive,
			isActive: () => this.active,

			hasPubSub: () => this.pubsub_open,
			hasWS: () => this._socket != null && this._socket.readyState === WebSocket.OPEN,
			isAuthed: () => this.socket_auth,

			getChannel: () => this.getUser(),
			getSelf: () => this.getSelf(),

			getWS: () => this._socket,
			getPolls: () => this.polls,

			on: (...args) => this.on(...args),
			off: (...args) => this.off(...args)
		});

		this.settings.add('addon.poll-shim.enabled', {
			default: true,
			ui: {
				path: 'Add-Ons > Poll-Shim >> General @{"sort": -500}',
				title: 'Enable Poll-Shim.',
				component: 'setting-check-box'
			},
			changed: () => this.onNavigate()
		});

		this.settings.add('addon.poll-shim.user', {
			default: null,
			requires: ['context.channelID', 'context.session.user.id', 'context.route.name'],
			process: (ctx, val) => {
				if ( val == null || typeof val !== 'string' ) {
					const route = ctx.get('context.route.name');
					if ( typeof route === 'string' && route.startsWith('dash-') )
						return ctx.get('context.channelID');

					return ctx.get('context.session.user.id');
				}

				return val;
			},
			ui: {
				path: 'Add-Ons > Poll-Shim >> General',
				title: 'Channel',
				description: 'Set this to override the channel where polls should be run. Please note that you must be a moderator of the channel in question to run a poll.',
				component: () => import('./components/channel.vue')
			},
			changed: () => {
				if ( this.active ) {
					this.deactivate();
					if ( this.shouldBeActive )
						this.activate();
				} else
					this.onNavigate();
			}
		});

		this.settings.add('addon.poll-shim.address', {
			default: 'ws://localhost:31337',
			ui: {
				path: 'Add-Ons > Poll-Shim >> Connectivity',
				title: 'Address',
				description: 'Connect to this address for polls.',
				component: 'setting-text-box'
			},
			changed: () => {
				if ( this._socket )
					this._socket.reconnect();
			}
		});

		this.settings.add('addon.poll-shim.key', {
			default: generateUUID(),
			ui: {
				path: 'Add-Ons > Poll-Shim >> Authentication',
				title: 'Passphrase',
				description: 'The server you connect to must authenticate with this passphrase to be allowed to create polls.\n\n**Note:** This value changes every page load until you manually set it.',
				component: 'setting-text-box'
			},
			changed: () => {
				if ( this._socket )
					this._socket.reconnect();
			}
		});

		this.settings.add('addon.poll-shim.client-key', {
			default: '',
			ui: {
				path: 'Add-Ons > Poll-Shim >> Authentication',
				title: 'Client Passphrase',
				description: 'If this is set, the client will authenticate by sending this passphrase to the server once the server connects.',
				component: 'setting-text-box'
			},
			changed: () => {
				if ( this._socket )
					this._socket.reconnect();
			}
		});

		this.url_provider = () => this.settings.get('addon.poll-shim.address');
		this.active = false;
		this.polls = new Set;
		this.updating_polls = new Set;
		this.socket_auth = false;

		this.onWSClose = this.onWSClose.bind(this);
		this.onWSMessage = this.onWSMessage.bind(this);
		this.onWSOpen = this.onWSOpen.bind(this);
	}

	get shouldBeActive() {
		if ( ! this.enabled && ! this.enabling )
			return false;

		if ( this.errored )
			return false;

		if ( ! this.settings.get('addon.poll-shim.enabled') )
			return false;

		// Make sure this updates on navigation / whatever.
		this.settings.main_context.update('addon.poll-shim.user');

		const user_id = this.settings.get('addon.poll-shim.user'),
			core = this.site.getCore();
		if ( ! user_id || ! core || ! core.pubsub )
			return false;

		const route = this.router.current_name;
		if ( typeof route !== 'string' )
			return false;

		if ( ! VALID_ROUTES.includes(route) && ! route.startsWith('dash-') )
			return false;

		const current_id = this.settings.get('context.channelID');
		return current_id && current_id == user_id;
	}

	async onEnable() {
		this.ReconnectingWebSocket = (await import('reconnecting-websocket')).default;

		this.on('site.router:route', this.onNavigate, this);
		this.onNavigate();
	}

	onDisable() {
		this.off('site.router:route', this.onNavigate, this);
		if ( this.active )
			this.deactivate();
	}

	onNavigate() {
		const should = this.shouldBeActive;
		if ( should && ! this.active )
			this.activate();
		else if ( ! should && this.active )
			this.deactivate();
	}

	async activate() {
		if ( ! this.enabled && ! this.enabling )
			return;

		const user_id = this.settings.get('addon.poll-shim.user'),
			core = this.site.getCore();

		if ( ! user_id || ! core || ! core.pubsub )
			return;

		this.channel_id = user_id;
		const [user, self] = await Promise.all([
			this.getUser(),
			this.getSelf()
		]);
		if ( ! user ) {
			this.channel_id = null;
			return;
		}

		this.log.info('Activating shim.');

		this._unsub = core.pubsub.subscribe({
			topic: `polls.${user_id}`,
			success: () => {
				this.pubsub_open = true;
				this.emit(':update');
			},
			failure: e => {
				this.log.error('Failed to listen to pubsub', e);
				this.errored = true;
				this.pubsub_open = false;
				this.deactivate();
			},
			onMessage: e => this.onPubSub(e)
		});

		this._socket = new this.ReconnectingWebSocket(this.url_provider, [], {
			maxEnqueuedMessages: 0
		});
		this._socket.addEventListener('open', this.onWSOpen);
		this._socket.addEventListener('close', this.onWSClose);
		this._socket.addEventListener('message', this.onWSMessage);

		this.active = true;
		this.emit(':update');
	}

	deactivate() {
		this.log.info('Deactivating shim.');

		if ( this._unsub ) {
			this._unsub();
			this._unsub = null;
		}

		if ( this._socket ) {
			this._socket.close();
			this._socket.removeEventListener('open', this.onWSOpen);
			this._socket.removeEventListener('close', this.onWSClose);
			this._socket.removeEventListener('message', this.onWSMessage);
			this._socket = null;
		}

		if ( this._open_timer ) {
			clearTimeout(this._open_timer);
			this._open_timer = null;
		}

		this.updating_polls.clear();
		this.polls.clear();
		this.pubsub_open = false;
		this.socket_auth = false;
		this.channel_id = null;
		this._user = null;
		this._self = null;
		this.active = false;
		this.emit(':update');
	}

	onPubSub(event) {
		const type = event.type;
		if ( type === 'POLL_UPDATE' || type === 'POLL_COMPLETE' )
			this.handlePoll(event.data.poll);
	}

	send(type, msg = {}) {
		if ( ! this._socket )
			return;

		if ( typeof msg !== 'object' )
			msg = {data: msg};

		msg.type = type;
		this._socket.send(JSON.stringify(msg));
	}

	onWSOpen() {
		this.log.debug('WebSocket Connected');
		this.emit(':update');

		const key = this.settings.get('addon.poll-shim.client-key');
		if ( key && key.length )
			this.send('auth', {data: key});

		this._open_timer = setTimeout(() => {
			if ( this._open_timer ) {
				clearTimeout(this._open_timer);
				this._open_timer = null;
			}

			if ( this._socket )
				this._socket.reconnect();
		}, 1000);
	}

	onWSClose() {
		if ( this._open_timer ) {
			clearTimeout(this._open_timer);
			this._open_timer = null;
		}

		this.log.debug('WebSocket Closed');
		this.polls.clear();
		this.updating_polls.clear();
		this.socket_auth = false;
		this.emit(':update');
	}

	async getUser() {
		if ( this._user )
			return this._user;

		const user_id = this.channel_id;
		if ( ! user_id ) {
			this._user = null;
			return null;
		}

		this._user = await this.twitch_data.getUser(user_id);
		return this._user;
	}

	async getSelf() {
		if ( this._self )
			return this._self;

		const user_id = this.channel_id;
		if ( ! user_id ) {
			this._self = null;
			return null;
		}

		const current_user = this.site.getUser();
		if ( current_user && current_user.id == user_id ) {
			this._self = {
				isModerator: true,
				isEditor: true
			}
		} else
			this._self = await this.twitch_data.getUserSelf(user_id);

		return this._self;
	}

	onWSMessage(event) {
		let msg;
		try {
			msg = JSON.parse(event.data);
		} catch(err) {
			this.log.debug('Invalid WS Message', err);
			return;
		}

		if ( ! msg || ! msg.type )
			return;

		this.log.debug('WebSocket Message', msg);

		const type = msg.type;
		if ( type === 'auth' ) {
			if ( this.socket_auth || msg.data !== this.settings.get('addon.poll-shim.key') ) {
				this.log.debug('WebSocket Authentication Error. Reconnecting.');
				this.send('error', {id: 'bad_auth'});
				this._socket.close();
				setTimeout(() => {
					if ( this._socket )
						this._socket.reconnect();
				}, 1000);

				this.emit(':update');
				return;
			}

			this.socket_auth = true;
			this.send('auth_ok');
			this.log.info('WebSocket Connected and Authorized');

			Promise.all([
				this.getUser(),
				this.getSelf()
			]).then(([user, self]) => {
				if ( ! user )
					return this.send('error', {id: 'no_user'});

				const is_mod = (self && self.isModerator);
				const roles = user.roles || {};

				this.send('user', {
					id: user.id,
					login: user.login,
					display_name: user.displayName,
					can_create: is_mod && (roles.isAffiliate || roles.isPartner)
				});
			});

			if ( this._open_timer ) {
				clearTimeout(this._open_timer);
				this._open_timer = null;
			}

			this.emit(':update');
			return;

		} else if ( ! this.socket_auth )
			this.send('error', {id: 'no_auth'});

		if ( type === 'create' ) {
			if ( typeof msg.title !== 'string' )
				return this.send('error', {id: 'no_title'});

			const title = msg.title.trim();
			if ( ! title.length )
				return this.send('error', {id: 'no_title'});

			if ( ! Array.isArray(msg.choices) || msg.choices.some(x => typeof x !== 'string' && x.length > 50) )
				return this.send('error', {id: 'bad_choices'});

			if ( ! this.channel_id )
				return this.send('error', {id: 'no_channel'});

			const duration = msg.duration || 60;
			if ( typeof duration !== 'number' || duration < 15 || isNaN(duration) || duration > 180 )
				return this.send('error', {id: 'bad_duration'});

			const subscriberMultiplier = msg.subscriberMultiplier || false;
			const subscriberOnly = msg.subscriberOnly || false;

			const bits = msg.bits || 0;
			if ( typeof bits !== 'number' || bits > 10000 )
				return this.send('error', {id: 'bad_bits'});

			this.twitch_data.createPoll(
				this.channel_id,
				title,
				msg.choices,
				{
					duration,
					subscriberMultiplier,
					subscriberOnly,
					bits
				}
			).then(async poll => {
				if ( ! poll ) {
					const user = await this.getUser(),
						roles = user?.roles || {};
					if ( ! user )
						return this.send('error', {id: 'cannot_poll', err: 'Invalid channel ID or API error.'});
					if ( ! roles.isAffiliate && ! roles.isPartner )
						return this.send('error', {id: 'cannot_poll', err: 'Channel does not have access to Polls. Must be affiliate or partner.'});

					this.send('error', {id: 'cannot_poll', err: 'Unable to create poll.'})
				}

				this.polls.add(poll.id);
				this.send('created', {id: poll.id});

				poll.durationSeconds = duration;
				this.handlePoll(poll);
				this.emit(':update');

			}).catch(err => {
				this.send('error', {id: 'cannot_poll', err: String(err)});
			});

			return;
		}

		if ( type === 'listen' ) {
			if ( ! msg.id )
				this.send('error', {id: 'no_id'});

			this.polls.add(msg.id);
			this.updating_polls.add(msg.id);
			this.twitch_data.getPoll(msg.id).then(data => {
				if ( ! this.updating_polls.has(msg.id) )
					return;

				if ( ! data )
					data = {
						id: msg.id,
						status: 'COMPLETED',
						choices: []
					};

				this.handlePoll(data);
			});

			this.emit(':update');
			return;
		}

		if ( type === 'get' ) {
			if ( ! msg.id )
				this.send('error', {id: 'no_id'});

			this.updating_polls.add(msg.id);
			this.twitch_data.getPoll(msg.id).then(data => {
				if ( ! this.updating_polls.has(msg.id) )
					return;

				if ( ! data )
					data = {
						id: msg.id,
						status: 'COMPLETED',
						choices: []
					};

				this.handlePoll(data, true);
			});

			this.emit(':update');
			return;
		}

		if ( type === 'end' ) {
			if ( ! msg.id )
				this.send('error', {id: 'no_id'});

			this.twitch_data.terminatePoll(msg.id).then(() => {
				this.updating_polls.delete(msg.id);
				this.polls.delete(msg.id);
				this.send('ended', {id: msg.id})
			});

			this.emit(':update');
			return;
		}

		this.send('error', {id: 'unknown_command'});
	}

	handlePoll(data, override = false, type = 'update') {
		if ( ! this.active || ! this._socket )
			return;

		const poll = formatPoll(data);
		this.updating_polls.delete(poll.id);

		if ( ! this.polls.has(poll.id) && ! override )
			return;

		if ( poll.ended ) {
			this.polls.delete(poll.id);
			this.emit(':update');
		}

		this.send(type, {poll});
	}

}

PollShim.register();

function formatPoll(data, poll_id) {
	if ( ! data )
		return {
			id: poll_id,
			ended: true,
			choices: []
		};

	const ended = data.status !== 'ACTIVE';
	let duration = data.durationSeconds || data.duration_seconds,
		remaining = data.remaining_duration_milliseconds;

	if ( duration == null ) {
		const ended = data.endedAt || data.ended_at,
			started = data.startedAt || data.startedAt;

		if ( started && ended )
			duration = Math.floor((Date.parse(ended) - Date.parse(started)) / 1000);
		else
			duration = 0;
	}

	if ( remaining == null ) {
		if ( ended )
			remaining = 0;
		else {
			const started = data.startedAt || data.startedAt;
			if ( started )
				remaining = Math.max(0, (duration * 1000) - (Date.now() - Date.parse(started)));
			else
				remaining = duration * 1000;
		}
	}

	const choices = [],
		out = {
			id: data.id || data.poll_id,
			ended,
			duration,
			remaining,
			choices
		};

	for(const choice of data.choices)
		if ( choice )
			choices.push({
				text: choice.title,
				votes: choice.votes?.total || 0
			});

	return out;
}