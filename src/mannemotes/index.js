import Socket from './socket';

const GIF_EMOTES_MODE = {
	DISABLED: 0,
	ANIMATED: 1,
};

class MannEmotes extends Addon {
  constructor(...args){
    super(...args)

    this.inject('settings');
		this.inject('chat');
		this.inject('chat.emotes');
    this.inject('chat.badges');
		this.inject('site');

    this.settings.add('mannemotes.gif_emotes_mode', {
			default: 0,

			ui: {
				path: 'Add-Ons > MannEmotes >> Emotes',
				title: 'GIF Emotes',
				description: 'Change the mode of how GIF emotes are showing up.',
				component: 'setting-select-box',
				data: [
					{ value: 0, title: 'Disabled' },
					{ value: 1, title: 'Enabled (Animated GIF Emotes)' },
				],
			},
		});

    this.chat.context.on('changed:mannemotes.gif_emotes_mode', this.updateEmotes, this);

		this.socket = false;
		this._last_emote_id = 0;
  }

  // ADDON ENABLED
	onEnable() {
		this.log.debug('MannEmotes was enabled successfully.');
		this.updateEmotes();
    this.initDeveloper();

    this.socket = new Socket(this);

    this.on('chat:room-add', this.roomAdd);
		this.on('chat:room-remove', this.roomRemove);

		for (const room of this.chat.iterateRooms()) {
			if (room) this.roomAdd(room);
		}
	}

  roomAdd(room) {
		this.socket.joinRoom(room.id);
	}

	roomRemove(room) {
		this.socket.leaveRoom(room.id);
	}

  updateGlobalEmotes(data) {
		const realID = 'addon--mannemotes--emotes-global';
		this.emotes.removeDefaultSet('addon--mannemotes', realID);
		this.emotes.unloadSet(realID);

		if (!this.chat.context.get('mannemotes.global_emoticons')) {
			return;
		}

		const emotes = [];

		const { global, gifs } = data;

		if (global) {
			for (const dataEmote of global) {
				const emote = {
					id: ++this._last_emote_id,
					name: dataEmote.code,
					width: dataEmote.width || 28,
					height: dataEmote.height || 28,
				};

				if (dataEmote.id) {
					emote.urls = {
						1: `https://static-cdn.jtvnw.net/emoticons/v1/${dataEmote.id}/1.0`,
						2: `https://static-cdn.jtvnw.net/emoticons/v1/${dataEmote.id}/2.0`,
						4: `https://static-cdn.jtvnw.net/emoticons/v1/${dataEmote.id}/3.0`,
					};
				} else {
					emote.urls = {
						1: `https://cdn.hurtwolf.com/manne/static/${emote.name}_1.png`,
						2: `https://cdn.hurtwolf.com/manne/static/${emote.name}_2.png`,
						4: `https://cdn.hurtwolf.com/manne/static/${emote.name}_4.png`,
					};
				}

				emotes.push(emote);
			}
		}

    if (gifs) {
			const gifMode = this.chat.context.get('mannemotes.gif_emotes_mode');
			if (gifMode !== GIF_EMOTES_MODE.DISABLED) { // eslint-disable-line
				for (const emoteName of gifs) {
					const emote = {
						id: ++this._last_emote_id,
						urls: {
							1: `https://cdn.hurtwolf.com/manne/gifs/${emoteName}_1.gif`,
							2: `https://cdn.hurtwolf.com/manne/gifs/${emoteName}_2.gif`,
							4: `https://cdn.hurtwolf.com/manne/gifs/${emoteName}_4.gif`,
						},
						name: emoteName,
						width: 28,
						height: 28
					};

					emotes.push(emote);
				}
			}
		}

		if (emotes.length === 0) {
			return;
		}

		const set = {
			emoticons: emotes,
			title: 'Extra Emotes',
			source: 'MannEmotes',
			icon: 'https://cdn.hurtwolf.com/manne/icon.png',
			sort: 51,
			force_global: (emote_set, channel) => channel && channel.login === 'itsmanne',
		};

		this.emotes.addDefaultSet('addon--mannemotes', realID, set);
	}

  async updateEmotes(attempts = 0) {
		this._last_emote_id = 0;

		if (!this.chat.context.get('mannemotes.global_emoticons')) {
			return;
		}

		const response = await fetch('https://cdn.hurtwolf.com/manne/emotes');
		if (response.ok) {
			const data = await response.json();

			this.updateGlobalEmotes(data);
		} else {
			if (response.status === 404) return;

			const newAttempts = (attempts || 0) + 1;
			if (newAttempts < 12) {
				this.log.error('Failed to fetch emotes. Trying again in 5 seconds.');
				setTimeout(this.updateEmotes.bind(this, newAttempts), 5000);
			}
		}
	}

  initDeveloper() {
		const developerBadge = {
			id: 'developer',
			title: 'Developer',
			color: '#E4107F',
			slot: 6,
			image: 'https://cdn.hurtwolf.com/manne/badge/devBadge_1.png',
			urls: {
				1: 'https://cdn.hurtwolf.com/manne/badge/devBadge_1.png',
				2: 'https://cdn.hurtwolf.com/manne/badge/devBadge_2.png',
				4: 'https://cdn.hurtwolf.com/manne/badge/devBadge_3.png',
			},
		};

		this.badges.loadBadgeData('addon--mannemotes--badges-developer', developerBadge);

		this.chat.getUser(111651633).addBadge('addon--mannemotes', 'addon--mannemotes--badges-developer');
	}

}

MannEmotes.register();