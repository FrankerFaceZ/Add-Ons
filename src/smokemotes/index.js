
class SmokEmotes extends Addon {
	constructor(...args) {
		super(...args);

		this.loadedUsers = [];

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
				description: 'Enable to show global emoticons.',
				component: 'setting-check-box',
			},
		});

		this.settings.add('smokemotes.global_gifs', {
			default: true,

			ui: {
				path: 'Add-Ons > smokEmotes >> Global Emotes',
				title: 'Global GIFs',
				description: 'Enable to show global GIFs. (disable to save bandwidth)',
				component: 'setting-check-box',
			},
		});

		this.settings.add('smokemotes.channel_emoticons', {
			default: true,

			ui: {
				path: 'Add-Ons > smokEmotes >> Channel Emotes',
				title: 'Channel Emotes',
				description: 'Enable to show emoticons you\'ve uploaded.',
				component: 'setting-check-box',
			},
		});

		this.settings.add('smokemotes.personal_emotes', {
			default: true,

			ui: {
				path: 'Add-Ons > smokEmotes >> Personal Emotes',
				title: 'Personal Emotes',
				description: 'Enable to show others\' Personal emoticons.',
				component: 'setting-check-box',
			},
		});

		this.chat.context.on('changed:smokemotes.global_emoticons', this.updateGlobalEmotes, this);
		this.chat.context.on('changed:smokemotes.global_gifs', this.updateGlobalGIFs, this);
		this.chat.context.on('changed:smokemotes.channel_emoticons', this.updateChannels, this);
		this.chat.context.on('changed:smokemotes.personal_emotes', this.updatePersonalEmotes, this);
	}

	onEnable() {
		this.log.debug('smokEmotes module was enabled successfully.');

		this.on('chat:receive-message', this.onReceiveMessage);

		this.updateEmotes();

	}

	onReceiveMessage(msg) {
		if (!this.chat.context.get('smokemotes.personal_emotes')) {
			return;
		}
		const user = this.resolve('site').getUser();
		if (user) {
			const msg_user_id = msg.message.user.id;
			if (user.id != msg_user_id
				&& !this.loadedUsers.includes(msg_user_id)) {
				this.updateOtherPersonalEmotes(msg);
				// this.loadedUsers.push(msg_user_id);
				// this.loadedUsers = [...new Set(this.loadedUsers)];
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

		const response = await fetch('https://bot.smokey.gg/api/emotes/?channel_id=global&type=static');
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

	async updateGlobalGIFs(attempts = 0) {
		const realID = 'addon--smokemotes--emotes-global-gifs';
		this.emotes.removeDefaultSet('addon--smokemotes', realID);
		this.emotes.unloadSet(realID);

		if (!this.chat.context.get('smokemotes.global_gifs')) {
			return;
		}

		const response = await fetch('https://bot.smokey.gg/api/emotes/?channel_id=global&type=gif');
		if (response.ok) {
			const emotes = await response.json();

			const globalEmotes = [];

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

			const set = {
				emoticons: globalEmotes,
				title: 'Global GIFs',
				source: 'smokEmotes',
				icon: 'https://bot.smokey.gg/favicon.png',
				_type: 1,
			};

			this.emotes.addDefaultSet('addon--smokemotes', realID, set);
		} else {
			if (response.status === 404) return;

			const newAttempts = (attempts || 0) + 1;
			if (newAttempts < 12) {
				this.log.error('Failed to fetch global GIFs. Trying again in 5 seconds.');
				setTimeout(this.updateGlobalGIFs.bind(this, newAttempts), 5000);
			}
		}
	}

	async updateOtherPersonalEmotes(msg) {

		const _id_emotes = `addon--smokemotes--emotes-personal-${msg.message.user.id}`;
		this.emotes.unloadSet(_id_emotes);

		if (!this.chat.context.get('smokemotes.personal_emotes')) {
			return;
		}

		const response = await fetch(`https://bot.smokey.gg/api/emotes/?channel_id=${msg.message.user.id}`);
		if (response.ok) {
			const emotes = await response.json();

			const personalEmotes = [];

			if (emotes.length == 0) { return; }

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
					owner: {
						display_name: dataEmote.user.displayName || '',
						name: dataEmote.user.name || '',
					},
				};

				personalEmotes.push(emote);
			}

			const set = {
				emoticons: personalEmotes,
				title: 'Personal Emotes',
				source: 'smokEmotes',
				icon: 'https://bot.smokey.gg/favicon.png',
			};

			this.emotes.loadSetData(_id_emotes, set, false);
			this.chat.getUser(undefined, msg.message.user.login).addSet('addon--smokemotes', _id_emotes);

		}
	}

	async updatePersonalEmotes() {

		const user = this.resolve('site').getUser();

		const _id_emotes = `addon--smokemotes--emotes-personal-${user.id}`;
		this.emotes.unloadSet(_id_emotes);

		if (!this.chat.context.get('smokemotes.personal_emotes')) {
			return;
		}

		const response = await fetch(`https://bot.smokey.gg/api/emotes/?channel_id=${user.id}`);
		if (response.ok) {
			const emotes = await response.json();

			const personalEmotes = [];

			if (emotes.length == 0) { return; }

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
					owner: {
						display_name: dataEmote.user.displayName || '',
						name: dataEmote.user.name || '',
					},
				};

				personalEmotes.push(emote);
			}

			const set = {
				emoticons: personalEmotes,
				title: 'Personal Emotes',
				source: 'smokEmotes',
				icon: 'https://bot.smokey.gg/favicon.png',
			};

			this.emotes.loadSetData(_id_emotes, set, false);
			this.chat.getUser(undefined, user.login).addSet('addon--smokemotes', _id_emotes);

		}
	}

	async updateChannelEmotes(room) {
		const realID = `addon--smokemotes--channel-${room.id}`;
		room.removeSet('addon--smokemotes', realID);
		this.emotes.unloadSet(realID);

		if (!this.chat.context.get('smokemotes.channel_emoticons')) {
			return;
		}

		const response = await fetch(`https://bot.smokey.gg/api/emotes/?channel_id=${room.id}`);
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
					owner: {
						display_name: dataEmote.user.displayName || '',
						name: dataEmote.user.name || '',
					},
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
				title: 'Channel Emotes',
				source: 'smokEmotes',
				icon: 'https://bot.smokey.gg/favicon.png',
				_type: 1,
			};

			room.addSet('addon--smokemotes', realID, set);
		} else {
			this.log.error(`Failed to fetch channel (${room.id}) emotes.`);
		}
	}

	updateChannels(){
		for (const room of this.chat.iterateRooms()) {
			if (room) this.updateChannelEmotes(room);
		}
	}

	updateEmotes() {
		this.updateGlobalEmotes();
		this.updateGlobalGIFs();
		this.updatePersonalEmotes();
		this.updateChannels();
	}
}

SmokEmotes.register();
