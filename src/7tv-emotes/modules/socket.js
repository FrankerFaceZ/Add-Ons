const OPCODES = {
	// -- Server -> Client
	DISPATCH: 0,
	HELLO: 1,
	HEARTBEAT: 2,
	RECONNECT: 4,
	ACK: 5,
	ERROR: 6,
	END_OF_STREAM: 7,

	// -- Client -> Server
	IDENTIFY: 33,
	RESUME: 34,
	SUBSCRIBE: 35,
	UNSUBSCRIBE: 36,
	SIGNAL: 37,
	BRIDGE: 38
}

export default class Socket extends FrankerFaceZ.utilities.module.Module {
	constructor(...args) {
		super(...args);

		this.inject('chat');
		this.inject('settings');
		this.inject('site');
		this.injectAs('siteChat', 'site.chat');
		this.injectAs('stv_api', '..api');
		this.injectAs('emotes', '..emotes');
		this.injectAs('personal_emotes', '..personal-emotes');
		this.injectAs('nametag_paints', '..nametag-paints');
		this.injectAs('badges', '..badges');
		this.injectAs('avatars', '..avatars');

		this.settings.add('addon.seventv_emotes.update_messages', {
			default: true,
			ui: {
				path: 'Add-Ons > 7TV Emotes >> Emotes > Live Emote Updates',
				title: 'Show update messages',
				description: 'Show messages in chat when emotes are updated in the current channel.',
				component: 'setting-check-box',
			}
		});

		this.OPCODES = OPCODES;

		this.socket = false;
		this._socket_buffer = [];
		this._connected = false;
		this._connecting = false;
		this._connect_attempts = 0;

		this._session_id = '';

		this._user_id = false;
		this._active_channel_set = false;
		this._subscriptions = {};
		this._rooms = {};
	}

	onEnable() {
		this.on('chat:room-add', this.roomAdd);
		this.on('chat:room-remove', this.roomRemove);
		this.on('chat:receive-message', this.onReceiveMessage);

		this.get7TVUserData();
	}

	iterateRooms() {
		for (const room of this.chat.iterateRooms()) {
			if (room) this.roomAdd(room);
		}
	}

	async get7TVUserData() {
		const user = this.site.getUser();
		if (!user) return;

		const resp = await this.stv_api.user.fetchUserData(user.id);

		this._user_id = resp?.user?.id || false;

		this.connect();
	}

	onReceiveMessage(msg) {
		if (!this._user_id) return;

		const user = this.site.getUser();
		if (!user) return;

		const msg_user_id = msg.message.user.id;
		if (user.id !== msg_user_id) return;

		this.sendPresences(false, msg.message.roomID);
	}

	sendPresences(self = false, room_id = undefined) {
		if (!this._user_id) return;

		if (room_id) {
			this.stv_api.user.updateUserPresences(this._user_id, room_id, self, this._session_id);
			return;
		}

		for (const room of this.chat.iterateRooms()) {
			if (room) {
				this.stv_api.user.updateUserPresences(this._user_id, room.id, self, this._session_id);
			}
		}
	}

	async roomAdd(room) {
		if (!room) return;

		this._rooms[room.id] = {};

		const stv_room = await this.stv_api.emotes.fetchChannelEmotes(room.id);
		if (stv_room?.emote_set?.id) {
			this._rooms[room.id] = stv_room;
	
			const set_id = stv_room.emote_set.id;
			this._active_channel_set = set_id;

			this.subscribe('emote_set.update', {
				object_id: set_id
			});

			this.subscribe('user.*', {
				object_id: stv_room.user.id
			});
		}

		this.subscribe('emote_set.*', {
			ctx: 'channel',
			id: room.id,
			platform: 'TWITCH'
		});

		this.subscribe('cosmetic.*', {
			ctx: 'channel',
			id: room.id,
			platform: 'TWITCH'
		});

		this.subscribe('entitlement.*', {
			ctx: 'channel',
			id: room.id,
			platform: 'TWITCH'
		});

		if (this._user_id) {
			this.sendPresences(true, room.id);
		}
	}

	roomRemove(room) {
		if (!room) return;

		const stv_room = this._rooms[room.id];
		if (!stv_room) return;

		if (stv_room?.emote_set?.id) {
			this.unsubscribe('emote_set.update', {
				object_id: stv_room.emote_set.id
			});

			this.unsubscribe('user.*', {
				object_id: stv_room.user.id
			});
		}

		this.unsubscribe('emote_set.*', {
			ctx: 'channel',
			id: room.id,
			platform: 'TWITCH'
		});

		this.unsubscribe('cosmetic.*', {
			ctx: 'channel',
			id: room.id,
			platform: 'TWITCH'
		});

		this.unsubscribe('entitlement.*', {
			ctx: 'channel',
			id: room.id,
			platform: 'TWITCH'
		});

		this.unsubscribe('user.*', {
			ctx: 'channel',
			id: room.id,
			platform: 'TWITCH'
		});

		delete this._rooms[room.id];
	}

	addChatNotice(channel, message) {
		if (!this.settings.get('addon.seventv_emotes.update_messages')) return;
		
		this.siteChat.addNotice(channel.login, message);
	}

	onMessage({ op: opcode, d: _data }) {
		if (opcode === OPCODES.HELLO) {
			this._session_id = _data.session_id;

			if (this._socket_buffer.length) {
				for (const data of this._socket_buffer) {
					this._emitSocket(data);
				}

				this._socket_buffer = [];
			}

			this.iterateRooms();
		}
		else if (opcode === OPCODES.DISPATCH) {
			const { type, body } = _data;
			if (type === 'emote_set.update') {
				if (body.id === this._active_channel_set) {
					this.emotes.handleChannelEmoteUpdate(body);
				}
				else {
					this.personal_emotes.updateSet(body);
				}
			}
			else if (type === 'emote_set.create') {
				const { id, name } = body.object;
				this.personal_emotes.createPersonalSet(id, name);
			}
			else if (type === 'cosmetic.create') {
				const { kind, data } = body.object;
				if (kind === 'PAINT') {
					this.nametag_paints.updatePaintStyle(data);
				}
				else if (kind === 'BADGE') {
					this.badges.addBadge(data);
				}
				else if (kind === 'AVATAR') {
					this.avatars.receiveAvatarData(data);
				}
			}
			else if (type === 'entitlement.create') {
				const object = body.object;
				if (object?.kind === 'PAINT') {
					this.nametag_paints.setUserPaint(object);
				}
				else if (object?.kind === 'BADGE') {
					this.badges.addUserBadge(object);
				}
				else if (object?.kind === 'EMOTE_SET') {
					this.personal_emotes.grantSetToUser(object);
				}
			}
			else if (type === 'entitlement.delete') {
				const object = body.object;
				if (object?.kind === 'PAINT') {
					this.nametag_paints.deleteUserPaint(object);
				}
				else if (object?.kind === 'BADGE') {
					this.badges.removeUserBadge(object);
				}
			}
			else if (type === 'user.update') {
				if (!body.updated?.length) return;

				for (const updates of body.updated) {
					for (const value of updates.value) {
						if (value.key === 'emote_set') {
							const oldSet = value.old_value;
							const newSet = value.value;
							
							const channel = this.emotes.getChannelBySetID(oldSet.id, newSet.id);
							if (!channel) continue;
	
							this.unsubscribe('emote_set.update', {
								object_id: oldSet.id
							});
	
							this.subscribe('emote_set.update', {
								object_id: newSet.id
							});
	
							this._active_channel_set = newSet.id;
	
							this.emotes.updateChannelSet(channel, newSet.id);
							this.addChatNotice(channel, `[7TV] ${body.actor.display_name} updated the active emote set to '${newSet.name}'`);
						}
						
						// TODO: Empty data / "updated" array when setting to "No Paint" or "No Badge"
						// if (value.key === 'badge') {
						// 	this.badges.addBadge(value.value);

						// 	const user = body.actor.connections.find(c => c.platform === 'TWITCH');

						// 	this.badges.removeUserBadgeByID(user.id, value.old_value.id);
						// 	this.badges.addUserBadgeByID(user.id, value.value.id);
						// }

						// if (value.key === 'paint') {
						// 	this.nametag_paints.updatePaintStyle(value.value);

						// 	const user = body.actor.connections.find(c => c.platform === 'TWITCH');

						// 	this.nametag_paints.setUserPaintByID(user.id, value.id);
						// }
					}
				}
			}
			else {
				this.log.debug(`Type '${type}' not implemented.`, body);
			}
		}
		else if (opcode === OPCODES.ACK) {
			const { command, data } = _data;
			if (command === 'SUBSCRIBE') {
				const sub = this.findSubscription(data.type, data.condition);
				if (!sub) return;

				sub._acked = true;
			}
		}
	}

	connect() {
		if (!this.site.getUser()) {
			return;
		}

		if (this._connected || this._connecting) {
			return;
		}
		this._connecting = true;

		this.log.info('Socket: Connecting to socket server...');

		this.socket = new WebSocket('wss://events.7tv.io/v3');

		this.socket.onopen = () => {
			this.log.info('Socket: Connected to socket server.');

			this._connected = true;
			this._connecting = false;
			this._connect_attempts = 0;
		};

		this.socket.onerror = () => {
			this.log.error('Socket: Error from socket server.');

			this.reconnect();
		};

		this.socket.onclose = evt => {
			if (!this._connected || !this.socket) {
				return;
			}

			this.log.info('Socket: Lost connection to socket server...', evt);

			if (evt.code !== 4012) {
				this._connect_attempts++;
			}

			this._subscriptions = {};
			this._rooms = {};

			this.reconnect();
		};

		this.socket.onmessage = message => {
			let evt;

			try {
				evt = JSON.parse(message.data);
			} catch (e) {
				this.log.error('Socket: Error parsing message', e);
			}

			this.onMessage(evt);
		};
	}

	reconnect() {
		this.disconnect();

		this.log.info('Socket: Trying to reconnect to socket server...');

		// Optimally this should always end up being 0 on a normal disconnect (End of Stream event)
		// meaning we'll pretty much immediately reconnect
		//
		// Just to be safe though, we will make sure the minimum is 0 seconds so we don't go into the negative.
		const delay = Math.max(0, Math.random() * (Math.pow(2, this._connect_attempts) - 1) * 3000);

		this._connect_attempts++;

		setTimeout(() => {
			this.connect();
		}, delay);
	}

	disconnect() {
		if (this.socket) {
			try {
				this.socket.close();
			} catch (e) {
				// Error
			}
		}

		delete this.socket;

		this._connected = false;
		this._connecting = false;
	}

	disconnectInternal() {
		this.disconnect();

		this.log.info('Socket: Disconnected from socket server.');
	}

	emitSocket(data) {
		if (!this._connected || !this.socket) {
			this._socket_buffer.push(data);
			return;
		}

		this._emitSocket(data);
	}

	_emitSocket(data) {
		this.socket?.send(JSON.stringify(data));
	}

	isSubscribed(type, condition) {
		const subs = this._subscriptions[type];
		if (!subs || !subs.length) return false;

		return subs.some(c => Object.entries(condition).every(([key, value]) => c.condition[key] === value));
	}

	findSubscription(type, condition) {
		const subs = this._subscriptions[type];
		if (!subs || !subs.length) return null;

		if (!condition) {
			return subs;
		}

		return subs.find(c => Object.entries(condition).every(([key, value]) => c.condition[key] === value)) ?? null;
	}	

	subscribe(type, condition) {
		const sub = this.findSubscription(type, condition);
		if (sub) return; 

		this.emitSocket({
			op: OPCODES.SUBSCRIBE,
			d: {
				type,
				condition
			}
		});

		if (!Array.isArray(this._subscriptions[type])) {
			this._subscriptions[type] = [];
		}

		this._subscriptions[type].push({
			condition
		});
	}

	unsubscribe(type, condition = undefined) {
		const sub = this.findSubscription(type, condition);
		if (!sub || !sub._acked) return;

		const data = {
			type,
			condition
		};

		this.emitSocket({
			op: OPCODES.UNSUBSCRIBE,
			d: data
		});

		if (!condition) {
			this._subscriptions[type] = [];
		}
		else {
			this._subscriptions[type] = this._subscriptions[type].filter(c => c !== sub);
		}
	}
}
