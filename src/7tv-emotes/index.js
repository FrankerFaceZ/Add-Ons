class SevenTVEmotes extends Addon {
	constructor(...args) {
		super(...args);

		this.inject('settings');
		this.inject('chat');
		this.inject('chat.emotes');
		this.inject('chat.badges');
		this.inject('site');
		this.injectAs('siteChat', 'site.chat');

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

		this.settings.add('addon.seventv_emotes.socket', {
			default: true,
			ui: {
				path: 'Add-Ons > 7TV Emotes >> Socket',
				title: 'Web Socket',
				description: 'Enables live 7TV emote updates via Web Socket.',
				component: 'setting-check-box',
			}
		});

		this.settings.add('addon.seventv_emotes.update_messages', {
			default: true,
			ui: {
				path: 'Add-Ons > 7TV Emotes >> Socket',
				title: 'Emote update messages',
				description: 'Show messages in chat when emotes are updated in the current channel.',
				component: 'setting-check-box',
			}
		});
	}

	async onEnable() {
		this.chat.context.on('changed:addon.seventv_emotes.global_emotes', () => this.updateGlobalEmotes());
		this.chat.context.on('changed:addon.seventv_emotes.channel_emotes', async () => {
			await this.updateChannelSets();
			this.subscribeActiveChannels();
		});
		this.chat.context.on('changed:addon.seventv_emotes.socket', async () => {
			try {
				await this.setupSocket();
			}
			catch (e) {
				return;
			}
		});

		this.on('chat:room-add', this.addChannel, this);
		this.on('chat:room-remove', this.removeChannel, this);

		this.addBadges();

		this.updateGlobalEmotes();
		this.updateChannelSets();

		this.setupSocket();
	}

	async addChannel(channel) {
		await this.addChannelSet(channel);
		this.subscribeChannel(channel);
	}

	removeChannel(channel) {
		this.removeChannelSet(channel);
	}

	async updateGlobalEmotes() {
		this.emotes.removeDefaultSet('addon.seventv_emotes', 'addon.seventv_emotes.global');
		this.emotes.unloadSet('addon.seventv_emotes.global');

		if (!this.chat.context.get('addon.seventv_emotes.global_emotes')) return;

		const response = await fetch("https://api.7tv.app/v2/emotes/global");
		if (response.ok) {
			const json = await response.json();

			const emotes = [];
			for (const emote of json) {
				emotes.push(this.convertEmote(emote));
			}

			this.emotes.addDefaultSet('addon.seventv_emotes', 'addon.seventv_emotes.global', {
				title: "Global Emotes",
				source: "7TV",
				icon: "https://7tv.app/assets/favicon.png",
				emotes: emotes
			});
		}
	}

	async fetchChannelEmotes(channelLogin) {
		const response = await fetch(`https://api.7tv.app/v2/users/${channelLogin}/emotes`);
		if (response.ok) {
			const json = await response.json();

			const emotes = [];
			for (const emote of json) {
				emotes.push(this.convertEmote(emote));
			}

			return emotes;
		}
	}

	getChannelSetID(channel) {
		return `addon.seventv_emotes.channel-${channel.login}`;
	}

	async addChannelSet(channel, emotes) {
		this.removeChannelSet(channel);

		if (emotes === undefined) {
			emotes = await this.fetchChannelEmotes(channel.login);
		}

		if (emotes && emotes.length > 0) {
			channel.addSet('addon.seventv_emotes', this.getChannelSetID(channel), {
				title: "Channel Emotes",
				source: "7TV",
				icon: "https://7tv.app/assets/favicon.png",
				emotes: emotes
			});
		}
	}

	removeChannelSet(channel) {
		const setID = this.getChannelSetID(channel);
		channel.removeSet('addon.seventv_emotes', setID);
		this.emotes.unloadSet(setID);
	}

	getChannelSet(channel) {
		return this.emotes.emote_sets[this.getChannelSetID(channel)];
	}

	async updateChannelSets() {
		const enabled = this.chat.context.get('addon.seventv_emotes.channel_emotes');
		for (const channel of this.chat.iterateRooms()) {
			if (enabled) {
				await this.addChannelSet(channel);
			}
			else {
				this.removeChannelSet(channel);
			}
		}
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

	async addBadges() {
		const response = await fetch(`https://api.7tv.app/v2/badges?user_identifier=twitch_id`);
		if (response.ok) {
			const json = await response.json();
			if (typeof json == "object" && json != null && json.badges) {
				for (const badge of json.badges) {
					const id = `addon.seventv_emotes.badge-${badge.id}`;
					this.badges.loadBadgeData(id, {
						id: badge.id,
						title: badge.tooltip,
						slot: 69,
						image: badge.urls[1][1],
						urls: {
							1: badge.urls[2][1]
						},
						svg: false
					});

					for (const userID of badge.users) {
						this.chat.getUser(String(userID)).addBadge('addon.seventv_emotes', id);
					}
				}
			}
		}
	}

	setupSocket() {
		return new Promise((resolve, reject) => {
			this.closeSocket();

			if (this.root.flavor == "main" && this.chat.context.get('addon.seventv_emotes.socket')) {
				this.socket = new WebSocket("wss://api.7tv.app/v2/ws");

				this.socket.addEventListener("message", (event) => {
					this.onSocketMessage(event.data);
				});

				this.socket.addEventListener("close", () => {
					this.closeSocket();

					this.socketReconnectTimeout = setTimeout(() => {
						this.socketReconnectTimeout = undefined;
						this.setupSocket();
					}, 500);
				});

				this.socket.addEventListener("open", () => {
					this.subscribeActiveChannels();
					resolve();
				});

				this.socket.addEventListener("error", () => {
					this.closeSocket();
					reject();
				});
			}
			else {
				resolve();
			}
		});
	}

	closeSocket() {
		if (this.socket) this.socket.close();
		if (this.socketHeartbeat) clearInterval(this.socketHeartbeat);
		if (this.socketReconnectTimeout) clearTimeout(this.socketReconnectTimeout);
		this.socket = undefined;
		this.socketHeartbeat = undefined;
		this.socketReconnectTimeout = undefined;
	}

	sendSocketHeartbeat() {
		if (this.socket) {
			this.socket.send(JSON.stringify({
				op: 2
			}));
		}
	}

	subscribeChannel(channel) {
		if (this.socket) {
			this.socket.send(JSON.stringify({
				op: 6,
				d: {
					type: 1,
					params: {
						channel: channel.login
					}
				}
			}));
		}
	}

	subscribeActiveChannels() {
		const enabled = this.chat.context.get('addon.seventv_emotes.channel_emotes');
		for (const channel of this.chat.iterateRooms()) {
			if (enabled) {
				this.subscribeChannel(channel);
			}
		}
	}

	handleChannelEmoteUpdate(data) {
		if (!this.chat.context.get('addon.seventv_emotes.channel_emotes')) return;

		for (const channel of this.chat.iterateRooms()) {
			if (channel.login == data.channel) {
				const emoteSet = this.getChannelSet(channel);
				if (emoteSet) {
					const emotes = emoteSet.emotes || {};
					if (data.removed) {
						delete emotes[data.emote.id];
					}
					else {
						emotes[data.emote.id] = this.convertEmote(data.emote);
					}
					this.addChannelSet(channel, Object.values(emotes));
				}

				if (this.chat.context.get('addon.seventv_emotes.update_messages')) {
					this.siteChat.addNotice(channel.login, `[7TV] ${data.actor} ${data.removed ? 'removed' : 'added'} the emote "${data.emote.name}"`);
				}
			}
		}
	}

	onSocketMessage(messageString) {
		const message = JSON.parse(messageString);
		
		const data = message.d;

		switch(message.op) {
			case 0: {
				switch (message.t) {
					case "CHANNEL_EMOTES_UPDATE": {
						this.handleChannelEmoteUpdate(data);
						break;
					}
				}
				break;
			}
			case 1: {
				if (this.socketHeartbeat) clearInterval(this.socketHeartbeat);
				this.socketHeartbeat = setInterval(this.sendSocketHeartbeat.bind(this), data.heartbeat_interval);
				break;
			}
		}
	}
}

SevenTVEmotes.register();