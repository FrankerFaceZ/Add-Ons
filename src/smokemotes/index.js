
class SmokEmotes extends Addon {
	constructor(...args) {
		super(...args);

		this.inject('settings');
		this.inject('chat');
		this.inject('chat.emotes');
		this.inject('chat.badges');
		this.inject('site');

		this.settings.add('smokemotes.global_emoticons', {
			default: true,

			ui: {
				path: 'Add-Ons > smokEmotes >> Global Emotes',
				title: 'Global Emotes',
				description: 'Enable to show Smokey\'s global emoticons.',
				component: 'setting-check-box',
			},
		});

		this.settings.add('smokemotes.channel_emoticons', {
			default: true,

			ui: {
				path: 'Add-Ons > smokEmotes >> Channel Emotes',
				title: 'Channel Emotes',
				description: 'Enable to show channel emoticons.',
				component: 'setting-check-box',
			},
		});

		this.settings.add('smokemotes.personal_emotes', {
			default: true,

			ui: {
				path: 'Add-Ons > smokEmotes >> Personal Emotes',
				title: 'Personal Emotes',
				description: 'Enable to show Personal emoticons (anywhere).',
				component: 'setting-check-box',
			},
		});

		this.chat.context.on('changed:smokemotes.global_emoticons', this.updateEmotes, this);
		this.chat.context.on('changed:smokemotes.channel_emoticons', this.updateEmotes, this);
		this.chat.context.on('changed:smokemotes.personal_emotes', this.updateEmotes, this);
	}

	onEnable() {
		this.log.debug('smokEmotes module was enabled successfully.');

		//this.on('chat:receive-message', this.onReceiveMessage);

		this.updateEmotes();

	}

	onReceiveMessage(msg) {
		const user = this.resolve('site').getUser();
		if (user) {
			const msg_user_id = msg.message.user.id;
			if (user.id === msg_user_id) {
				// this.socket.broadcastMe(msg.channel);
			}
		}
	}

	async updateGlobalEmotes(attempts = 0) {
		const realID = 'addon--smokemotes--emotes-global';
		this.emotes.removeDefaultSet('addon--smokemotes', realID);
		this.emotes.unloadSet(realID);

		if (!this.chat.context.get('smokemotes.global_emoticons')) {
			return;
		}

		const response = await fetch('https://bot.smokey.gg/api/?emotes=1&channel_id=global');
		if (response.ok) {
			const emotes = await response.json();

			const globalEmotes = [];
			const arbitraryEmotes = [];

			let i = emotes.length;
			while (i--) {
				const dataEmote = emotes[i];

				const arbitraryEmote = /[^A-Za-z0-9]/.test(dataEmote.code);

				const emote = {
					id: dataEmote.id,
					urls: {
						1: dataEmote.images['1x'],
						2: dataEmote.images['2x'],
						4: dataEmote.images['3x']
					},
					name: dataEmote.code,
					width: dataEmote.width,
					height: dataEmote.height,
					require_spaces: arbitraryEmote,
				};

				globalEmotes.push(emote);
			}

			let setEmotes = [];
			setEmotes = setEmotes.concat(globalEmotes);

			if (this.chat.context.get('smokemotes.arbitrary_emoticons')) {
				setEmotes = setEmotes.concat(arbitraryEmotes);
			}

			if (setEmotes.length === 0) {
				return;
			}

			const set = {
				emoticons: setEmotes,
				title: 'Global Emotes',
				source: 'smokEmotes',
				icon: 'https://bot.smokey.gg/favicon.png',
				_type: 1,
			};

			this.emotes.addDefaultSet('addon--smokemotes', realID, set);
		} else {
			if (response.status === 404) return;

			const newAttempts = (attempts || 0) + 1;
			if (newAttempts < 12) {
				this.log.error('Failed to fetch global emotes. Trying again in 5 seconds.');
				setTimeout(this.updateGlobalEmotes.bind(this, newAttempts), 5000);
			}
		}
	}

	async updatePersonalEmotes(attempts = 0) {
		const realID = 'addon--smokemotes--emotes-personal';
		this.emotes.removeDefaultSet('addon--smokemotes', realID);
		this.emotes.unloadSet(realID);
		const user = this.resolve('site').getUser();

		if (!this.chat.context.get('smokemotes.personal_emotes')) {
			return;
		}

		const response = await fetch(`https://bot.smokey.gg/api/?emotes=1&channel_id=${user.id}`);
		if (response.ok) {
			const emotes = await response.json();

			const personalEmotes = [];

			let i = emotes.length;
			while (i--) {
				const dataEmote = emotes[i];

				const arbitraryEmote = /[^A-Za-z0-9]/.test(dataEmote.code);

				const emote = {
					id: dataEmote.id,
					urls: {
						1: dataEmote.images['1x'],
						2: dataEmote.images['2x'],
						4: dataEmote.images['3x']
					},
					name: dataEmote.code,
					width: dataEmote.width,
					height: dataEmote.height,
					require_spaces: arbitraryEmote,
				};

				personalEmotes.push(emote);
			}

			let setEmotes = [];
			setEmotes = setEmotes.concat(personalEmotes);

			if (setEmotes.length === 0) {
				return;
			}

			const set = {
				emoticons: setEmotes,
				title: 'Personal Emotes',
				source: 'smokEmotes',
				icon: 'https://bot.smokey.gg/favicon.png',
				_type: 1,
			};

			this.emotes.addDefaultSet('addon--smokemotes', realID, set);
		} else {
			if (response.status === 404) return;

			const newAttempts = (attempts || 0) + 1;
			if (newAttempts < 12) {
				this.log.error('Failed to fetch personal emotes. Trying again in 5 seconds.');
				setTimeout(this.updatePersonalEmotes.bind(this, newAttempts), 5000);
			}
		}
	}

	updateEmotes() {
		this.updateGlobalEmotes();
		this.updatePersonalEmotes();

		/*for (const room of this.chat.iterateRooms()) {
			if (room) this.updateChannel(room);
		}*/
	}
}

SmokEmotes.register();