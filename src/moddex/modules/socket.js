export default class Socket extends FrankerFaceZ.utilities.module.Module {
	static plannedReconnect = 4012;
	static defaultHeartbeatSeconds = 30;
	static missedHeartbeats = 3;
	static backoffStepMs = 3000;
	static backoffCapMs = 60000;

	constructor(...args) {
		super(...args);

		this.inject('settings');
		this.injectAs('badges', '..badges');

		this.socket = null;
		this.wanted = false;
		this.hasConnected = false;
		this.attempts = 0;
		this.heartbeatSeconds = Socket.defaultHeartbeatSeconds;
		this.watchdog = null;
		this.retry = null;
	}

	onEnable() {
		this.settings.on(':changed:addon.moddex.live', this.sync, this);
		this.sync();
	}

	onDisable() {
		this.settings.off(':changed:addon.moddex.live', this.sync, this);
		this.stop();
	}

	get live() {
		return this.settings.get('addon.moddex.live');
	}

	sync() {
		if (this.live) this.start();
		else this.stop();
	}

	start() {
		this.wanted = true;

		if (this.socket) return;

		try {
			this.socket = new WebSocket('wss://ws.moddex.tv/');
		} catch (error) {
			this.log.error('could not open the socket', error);
			this.socket = null;
			this.attempts += 1;
			this.scheduleRetry();
			return;
		}

		this.socket.onopen = () => this.opened();
		this.socket.onmessage = event => this.receive(event.data);
		this.socket.onerror = () => this.log.warn('socket error');
		this.socket.onclose = event => this.closed(event);
	}

	stop() {
		this.wanted = false;
		this.attempts = 0;

		clearTimeout(this.retry);
		this.retry = null;

		this.detach();
	}

	opened() {
		this.attempts = 0;
		this.resetWatchdog();

		if (this.hasConnected) this.badges.reload();

		this.hasConnected = true;
	}

	closed(event) {
		this.drop();

		if (!this.wanted) return;

		const planned = event.code === Socket.plannedReconnect;

		if (!planned) this.attempts += 1;

		this.scheduleRetry(planned);
	}

	receive(raw) {
		this.resetWatchdog();

		let message;

		try {
			message = JSON.parse(raw);
		} catch (error) {
			this.log.warn('unparseable frame', error);
			return;
		}

		switch (message.op) {
			case 'HELLO':
				this.heartbeatSeconds = message.d?.heartbeatSeconds ?? Socket.defaultHeartbeatSeconds;
				this.resetWatchdog();
				this.send('SUBSCRIBE', {topic: 'chat_badges'});
				break;

			case 'DISPATCH':
				if (message.d?.type === 'chat_badge.changed') this.badges.apply(message.d);
				break;

			case 'RECONNECT':
				this.log.info(`server asked for a reconnect: ${message.d?.reason ?? 'no reason given'}`);
				break;

			case 'ERROR':
				this.log.warn(`server refused a frame: ${message.d?.message ?? 'no message'}`);
				break;

			case 'SUBSCRIBED':
			case 'HEARTBEAT':
				break;

			default:
				this.log.warn(`unknown op: ${message.op}`);
		}
	}

	send(op, data) {
		if (this.socket?.readyState !== WebSocket.OPEN) return;

		this.socket.send(JSON.stringify({op, d: data ?? null}));
	}

	resetWatchdog() {
		clearTimeout(this.watchdog);

		this.watchdog = setTimeout(() => {
			this.log.warn('no heartbeat, treating the socket as gone');
			this.attempts += 1;
			this.detach();
			this.scheduleRetry();
		}, this.heartbeatSeconds * Socket.missedHeartbeats * 1000);
	}

	scheduleRetry(immediate = false) {
		if (!this.wanted || this.retry) return;

		const ceiling = (2 ** this.attempts - 1) * Socket.backoffStepMs;
		const delay = immediate ? 0 : Math.min(Socket.backoffCapMs, Math.random() * ceiling);

		this.retry = setTimeout(() => {
			this.retry = null;
			this.start();
		}, delay);
	}

	detach() {
		if (this.socket) {
			this.socket.onopen = null;
			this.socket.onmessage = null;
			this.socket.onerror = null;
			this.socket.onclose = null;

			try {
				this.socket.close();
			} catch (error) {
				this.log.warn('closing the socket threw', error);
			}
		}

		this.drop();
	}

	drop() {
		clearTimeout(this.watchdog);
		this.watchdog = null;
		this.socket = null;
	}
}
