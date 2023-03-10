class FFZAP extends Addon {
	constructor(...args) {
		super(...args);

		this.inject('settings');
		this.inject('chat');
		this.inject('chat.emotes');
		this.inject('chat.badges');
		this.inject('site');

		this.helpers = {
			26964566: { // Lordmau5
				title: 'FFZ:AP Developer',
			},
			11819690: { // Jugachi
				title: 'FFZ:AP Helper',
			},
			36442149: { // mieDax
				title: 'FFZ:AP Helper',
			},
			29519423: { // Quanto
				title: 'FFZ:AP Helper',
			},
			22025290: { // trihex
				title: 'FFZ:AP Helper',
			},
			4867723: { // Wolsk
				title: 'FFZ:AP Helper',
			},
		};

		this.supporters = {};
		this.added_supporters = [];

		this.settings.add('ffzap.core.remove_spaces', {
			default: false,

			ui: {
				path: 'Add-Ons > FFZ:AP Core >> Emotes',
				title: 'Remove Spaces Between Emotes',
				description: 'Remove spaces inbetween emotes when they are right after one another. (e.g. combo emotes)',
				component: 'setting-check-box',
			},
		});

		this.settings.add('ffzap.core.message_deletion', {
			default: 0,

			ui: {
				path: 'Add-Ons > FFZ:AP Core >> Chat',
				title: 'Message User-Level Filtering',
				description: 'Messages will be removed from chat entirely if they aren\'t sent by a user of this level or higher.',
				component: 'setting-select-box',
				data: [
					{ value: 0, title: 'Display All Messages' },
					{ value: 1, title: 'Display Subscriber Messages' },
					{ value: 2, title: 'Display Moderator Messages' },
				],
			},
		});

		this.settings.add('ffzap.core.enable_highlight_sound', {
			default: false,
			requires: ['ffzap.core.highlight_sound_types'],
			process(ctx, val) {
				const types = ctx.get('ffzap.core.highlight_sound_types');
				if ( ! Array.isArray(types) || ! types.length )
					return false;
				return val;
			},

			ui: {
				sort: -10,
				path: 'Add-Ons > FFZ:AP Core >> Highlight Sounds',
				title: 'Enable Highlight Sound',
				description: 'Hear a sound every time a message is highlighted.',
				component: 'setting-check-box',
			},
		});

		this.settings.add('ffzap.core.highlight_sound', {
			default: 'https://cdn.ffzap.com/sounds/default_wet.mp3',

			ui: {
				sort: -5,
				path: 'Add-Ons > FFZ:AP Core >> Highlight Sounds',
				title: 'Sound',
				description: 'Change the sound that will play when a sound trigger is activated.',
				component: () => import('./components/highlight-sound.vue'),
				no_i18n: true,
				data: [
					// Default Sounds
					{ value: 'https://cdn.ffzap.com/sounds/default_wet.mp3', title: 'Default - Wet' },
					{ value: 'https://cdn.ffzap.com/sounds/default_graceful.mp3', title: 'Default - Graceful' },
					{ value: 'https://cdn.ffzap.com/sounds/default_blocker.mp3', title: 'Default - Blocker' },

					// Meme Sounds
					{ value: 'https://cdn.ffzap.com/sounds/coin.mp3', title: 'Mario - Coin Sound' },
					{ value: 'https://cdn.ffzap.com/sounds/recovery.mp3', title: 'Pokemon - Recovery' },
					{ value: 'https://cdn.ffzap.com/sounds/icq.mp3', title: 'ICQ - Notification' },
					{ value: 'https://cdn.ffzap.com/sounds/aol.mp3', title: 'AOL - You\'ve got mail!' },
					{ value: 'https://cdn.ffzap.com/sounds/mailmf.mp3', title: 'Euro Trip - Mail Motherf**ker!' },
					{ value: 'https://cdn.ffzap.com/sounds/zelda_secret.mp3', title: 'Zelda - Secret Sound' },
					{ value: 'https://cdn.ffzap.com/sounds/brainpower.mp3', title: 'O-oooooooooo AAAAE-A-A-I-A-U' },
					{ value: 'https://cdn.ffzap.com/sounds/the_best.mp3', title: 'THE BEST THE BEST' },
					{ value: 'https://cdn.ffzap.com/sounds/wow.mp3', title: 'WOW!' },
					{ value: 'https://cdn.ffzap.com/sounds/vsauce.mp3', title: 'Hey Vsauce, Michael here.' },
					{ value: 'https://cdn.ffzap.com/sounds/number_1.mp3', title: 'We are number one, HEY!' },
					{ value: 'https://cdn.ffzap.com/sounds/hello.mp3', title: 'Hello.webm' },
					{ value: 'https://cdn.ffzap.com/sounds/tuturu.mp3', title: 'Tuturu~~' },
					{ value: 'https://cdn.ffzap.com/sounds/omae_wa_mou_shindeiru.mp3', title: 'Omae wa mou shindeiru' },
					{ value: 'https://cdn.ffzap.com/sounds/never_asked_for_this.mp3', title: 'I never asked for this.' },
					{ value: 'https://cdn.ffzap.com/sounds/nani.mp3', title: 'N-NANI?!' },
					{ value: 'https://cdn.ffzap.com/sounds/oh_no.mp3', title: 'Knuckles - Oh no' },
					{ value: 'https://cdn.ffzap.com/sounds/whats_going_on.mp3', title: 'He-Man - What\'s going on?!' },
					{ value: 'https://cdn.ffzap.com/sounds/gnome.mp3', title: 'Gnome' },
					{ value: 'https://cdn.ffzap.com/sounds/oof.mp3', title: 'Roblox Death Sound (OOF)' },
				],
				onUIChange: (val, element) => val && this.playPreviewSound(element, val, null),
				buttons: () => import('./components/preview.vue')
			},
		});

		this.settings.add('ffzap.core.highlight_sound_volume', {
			default: 50,

			ui: {
				sort: -4,
				path: 'Add-Ons > FFZ:AP Core >> Highlight Sounds',
				title: 'Highlight Sound Volume',
				description: 'Change the volume at which the highlight sounds will be played at.',
				component: 'setting-select-box',
				data: [
					{ value: 5, title: '5%' },
					{ value: 10, title: '10%' },
					{ value: 20, title: '20%' },
					{ value: 30, title: '30%' },
					{ value: 40, title: '40%' },
					{ value: 50, title: '50%' },
					{ value: 60, title: '60%' },
					{ value: 70, title: '70%' },
					{ value: 80, title: '80%' },
					{ value: 90, title: '90%' },
					{ value: 100, title: '100%' },
				],
				onUIChange: (val, element) => this.playPreviewSound(element, null, val)
			},
		});

		// Sound trigger settings
		this.settings.add('ffzap.core.highlight_sound_prevent_own_channel', {
			default: false,

			ui: {
				path: 'Add-Ons > FFZ:AP Core >> Highlight Sounds >> Sound Trigger Settings',
				title: 'Prevent In Own Channel',
				description: 'Prevent the sound from playing in your own channel.',
				component: 'setting-check-box',
			},
		});

		this.settings.add('ffzap.core.highlight_sound_types', {
			default: ['badge', 'mention', 'term', 'user'],
			type: 'basic_array_merge',
			ui: {
				path: 'Add-Ons > FFZ:AP Core >> Highlight Sounds >> Sound Trigger Settings',
				title: 'Play When',
				description: 'Play a highlight sound when a chat line is highlighted for one of the selected reasons.',
				component: 'setting-select-box',
				multiple: true,
				data: () => this.chat.getHighlightReasons()
			}
		});

		this.chat.context.on('changed:ffzap.core.highlight_sound', async url => {
			this.highlight_sound.src = await this.getSoundURL(url);
		}, this);

		this.chat.context.on('changed:ffzap.core.highlight_sound_volume', volume => {
			this.highlight_sound.volume = volume / 100;
		}, this);

		this.setupHighlightSound();

		this.remove_spaces_tokenizer = {
			type: 'remove_spaces',
			priority: -100,
			process: tokens => {
				if (!tokens || !tokens.length) {
					return tokens;
				}

				if (!this.chat.context.get('ffzap.core.remove_spaces')) {
					return tokens;
				}

				const output = [];

				for (let i = 0, l = tokens.length; i < l; i++) {
					const currentToken = tokens[i];
					
					if (i + 1 === l) {
						output.push(currentToken);
						continue;
					}
					
					const lastToken = i - 1 >= 0 ? tokens[i - 1] : null;
					const nextToken = i + 1 < l ? tokens[i + 1] : null;
					
					if (currentToken.type === 'text' && currentToken.text === ' ') {
						if (lastToken?.type === 'emote' && nextToken?.type === 'emote') {
							lastToken.text += ' ';
							continue;
						}
					}
						
					output.push(currentToken);
				}
				return output;
			},
		};

		this.receive_event = false;
		this.buffer_event = false;
		this.updateEvents();
		this.chat.context.on('changed:ffzap.core.message_deletion', this.updateEvents, this);
		this.chat.context.on('changed:ffzap.core.enable_highlight_sound', this.updateEvents, this);

		this.chat.addTokenizer(this.remove_spaces_tokenizer);
	}

	onEnable() {
		this.log.debug('FFZ:AP\'s Core module was enabled successfully.');

		this.fetchSupporters();
	}

	updateEvents() {
		const buffer = this.chat.context.get('ffzap.core.enable_highlight_sound'),
			receive = this.chat.context.get('ffzap.core.message_deletion');

		if ( buffer && ! this.buffer_event )
			this.on('chat:buffer-message', this.onBufferMessage, this);
		else if ( ! buffer && this.buffer_event )
			this.off('chat:buffer-message', this.onBufferMessage, this);

		if ( receive && ! this.receive_event )
			this.on('chat:receive-message', this.onReceiveMessage, this);
		else if ( ! receive && this.receive_event )
			this.off('chat:receive-message', this.onReceiveMessage, this);

		this.buffer_event = buffer;
		this.receive_event = receive;
	}

	// eslint-disable-next-line class-methods-use-this
	isModeratorOrHigher (badges) {
		return 'broadcaster' in badges || 'staff' in badges || 'admin' in badges || 'global_mod' in badges || 'moderator' in badges;
	}

	handleMessageDeletion (msg) {
		const chatDeletion = this.chat.context.get('ffzap.core.message_deletion');
		const badges = msg.message.badges;

		if (chatDeletion == 1) {
			if (!('subscriber' in badges) && !this.isModeratorOrHigher(badges)) {
				msg.message.ffz_removed = true;
			}
		} else if (chatDeletion == 2 && !this.isModeratorOrHigher(badges)) {
			msg.message.ffz_removed = true;
		}
	}

	async setupHighlightSound() {
		this.highlight_sound = new Audio(await this.getSoundURL(this.chat.context.get('ffzap.core.highlight_sound')));
		this.highlight_sound.volume = this.chat.context.get('ffzap.core.highlight_sound_volume') / 100;
	}

	async getSoundURL(url) {
		if (url.startsWith('ffzap.sound-file:')) {
			const provider = this.settings.provider;

			const blob = await provider.getBlob(url);
			url = URL.createObjectURL(blob);
		}
		return url;
	}

	getElementSetting(element, setting) {
		if (!element) return this.chat.context.get(setting);

		return element.profile.get(setting) || this.chat.context.get(setting);
	}

	async playPreviewSound(element, val, vol) {
		if ( val == null )
			val = this.getElementSetting(element, 'ffzap.core.highlight_sound');

		val = await this.getSoundURL(val);

		let sound;
		if ( this._preview_sound ) {
			sound = this._preview_sound;
			sound.pause();
			sound.src = val;
			sound.currentTime = 0;
		} else
			sound = this._preview_sound = new Audio(val);

		sound.volume = (vol != null ? vol : this.getElementSetting(element, 'ffzap.core.highlight_sound_volume')) / 100;
		sound.play();
	}

	playHighlightSound () {
		if (!this.highlight_sound.paused) {
			this.highlight_sound.pause();
		}
		this.highlight_sound.play();
	}

	onReceiveMessage(event) {
		this.handleMessageDeletion(event);
	}

	onBufferMessage(msg) {
		if (this.chat.context.get('ffzap.core.enable_highlight_sound') && msg.message.mentioned) {
			// Prevent in own channel
			if (this.chat.context.get('ffzap.core.highlight_sound_prevent_own_channel')) {
				const user = this.resolve('site').getUser();
				if (user && msg.channel == user.login) {
					return;
				}
			}

			const highlights = msg.message.highlights;

			// No highlights? No sounds.
			if (!highlights || !highlights.size) {
				return;
			}

			const types = this.chat.context.get('ffzap.core.highlight_sound_types');
			for(const type of types)
				if ( highlights.has(type) ) {
					this.playHighlightSound();
					break;
				}
		}
	}

	// Helpful cache-busting method from FFZ
	getBuster(resolution = 5) {
		const now = Math.floor(Date.now() / 1000);
		return now - (now % resolution);
	}

	async fetchSupporters() {
		const host = `https://api.ffzap.com/v1/supporters?_=${this.getBuster(30)}`;

		const supporterBadge = {
			id: 'supporter',
			title: 'FFZ:AP Supporter',
			color: '#755000',
			slot: 6,
			image: 'https://api.ffzap.com/v1/user/badge/default/1',
			urls: {
				1: 'https://api.ffzap.com/v1/user/badge/default/1',
				2: 'https://api.ffzap.com/v1/user/badge/default/2',
				4: 'https://api.ffzap.com/v1/user/badge/default/3',
			},
			click_url: 'https://ffzap.com/',
		};

		const response = await fetch(host);
		if (response.ok) {
			const data = await response.json();

			this.badges.loadBadgeData('addon--ffzap.core--badges-supporter', supporterBadge);

			for (let i = 0; i < data.length; i++) {
				const user = data[i];
				if (user.id === 26964566) continue;

				if (!user.tier) continue;

				const ffzUser = this.chat.getUser(user.id);

				const badge = {
					title: (this.helpers[user.id] && this.helpers[user.id].title) || 'FFZ:AP Supporter',
					color: user.tier >= 2 && user.badge_color || supporterBadge.color,
					image: `https://api.ffzap.com/v1/user/badge/${user.id}/1`,
					urls: {
						1: `https://api.ffzap.com/v1/user/badge/${user.id}/1`,
						2: `https://api.ffzap.com/v1/user/badge/${user.id}/2`,
						4: `https://api.ffzap.com/v1/user/badge/${user.id}/3`,
					},
					click_url: 'https://ffzap.com/',
				};

				if (user.tier >= 3 && user.badge_is_colored) {
					badge.color = 'transparent';
					badge.no_invert = true;
				}

				ffzUser.addBadge('addon--ffzap.core', 'addon--ffzap.core--badges-supporter', badge);
				this.added_supporters.push(user.id);
			}
		}
	}
}

FFZAP.register();
