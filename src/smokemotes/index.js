class SmokEmotes extends Addon {
	constructor(...args) {
		super(...args);

		this.loadedUsers = [];
		this.notify_icon = document.querySelector('link[rel="icon"]') && document.querySelector('link[rel="icon"]').href;
		this.pinned_handler = undefined;

		this.inject('settings');
		this.inject('chat');
		this.inject('chat.emotes');
		this.inject('chat.badges');
		this.inject('site');

		this.settings.add('smokemotes.global_emoticons', {
			default: true,

			ui: {
				path: 'Add-Ons > smokEmotes >> Emotes',
				title: 'Global Emotes',
				description: 'Enable to show global emoticons.',
				component: 'setting-check-box',
			},
		});

		this.settings.add('smokemotes.global_gifs', {
			default: true,

			ui: {
				path: 'Add-Ons > smokEmotes >> Emotes',
				title: 'Global GIFs',
				description: 'Enable to show global GIFs. (disable to save bandwidth)',
				component: 'setting-check-box',
			},
		});

		this.settings.add('smokemotes.channel_emoticons', {
			default: true,

			ui: {
				path: 'Add-Ons > smokEmotes >> Emotes',
				title: 'Channel Emotes',
				description: 'Enable to show emoticons you\'ve uploaded.',
				component: 'setting-check-box',
			},
		});

		this.settings.add('smokemotes.personal_emotes', {
			default: true,

			ui: {
				path: 'Add-Ons > smokEmotes >> Emotes',
				title: 'Personal Emotes',
				description: 'Enable to show others\' Personal emoticons.',
				component: 'setting-check-box',
			},
		});

		this.settings.add('smokemotes.pinned_mentions', {
			default: true,

			ui: {
				sort: -1,
				path: 'Add-Ons > smokEmotes >> Pinned Mentions',
				title: 'Pinned Mentions',
				description: 'Enable to have mentions pinned to the top of chat.',
				component: 'setting-check-box',
			},
		});

		this.settings.add('smokemotes.pinned_timer', {
			default: 60,
			ui: {
				sort: 0,
				path: 'Add-Ons > smokEmotes >> Pinned Mentions',
				title: 'Auto Removal Timer',
				description: 'Time in seconds to auto remove pinned messages. 0 To Disable.',
				component: 'setting-text-box',
				process(val) {
					val = parseFloat(val, 10)
					if (isNaN(val) || !isFinite(val) || val <= 0)
						return 60;

					return val;
				}
			}
		});

		this.settings.add('smokemotes.pinned_border', {
			default: '#828282',
			ui: {
				sort: 1,
				path: 'Add-Ons > smokEmotes >> Pinned Mentions',
				title: 'Border Color',
				description: 'Color to use for the border of pinned mentions.',
				component: 'setting-text-box'
			}
		});

		this.settings.add('smokemotes.pinned_font_color', {
			default: '#dadada',
			ui: {
				sort: 2,
				path: 'Add-Ons > smokEmotes >> Pinned Mentions',
				title: 'Font Color',
				description: 'Color to use for the font of pinned mentions.',
				component: 'setting-text-box'
			}
		});

		this.settings.add('smokemotes.pinned_bg', {
			default: '#3e0b0b',
			ui: {
				sort: 3,
				path: 'Add-Ons > smokEmotes >> Pinned Mentions',
				title: 'Background Color',
				description: 'Color to use for the background of pinned mentions.',
				component: 'setting-text-box'
			}
		});

		this.settings.add('smokemotes.keep_hd_video', {
			default: true,

			ui: {
				sort: -1,
				path: 'Add-Ons > smokEmotes >> Extra Settings',
				title: 'Maintain HD Quality',
				description: 'Enable to keep the video player from automatically decreasing video quality when out of focus.',
				component: 'setting-check-box',
			},
		});

		this.settings.add('smokemotes.auto_point_claimer', {
			default: false,

			ui: {
				sort: 0,
				path: 'Add-Ons > smokEmotes >> Extra Settings',
				title: 'Auto Point Claimer',
				description: 'Enable to automatically obtain channel points. After disabling, you must refresh to completely disable.',
				component: 'setting-check-box',
			},
		});

		this.chat.context.on('changed:smokemotes.global_emoticons', this.updateGlobalEmotes, this);
		this.chat.context.on('changed:smokemotes.global_gifs', this.updateGlobalGIFs, this);
		this.chat.context.on('changed:smokemotes.channel_emoticons', this.updateChannels, this);
		this.chat.context.on('changed:smokemotes.personal_emotes', this.updatePersonalEmotes, this);

		this.chat.context.on('changed:smokemotes.pinned_mentions', this.pinnedMentions, this);
		this.chat.context.on('changed:smokemotes.pinned_timer', this.pinnedMentions, this);
		this.chat.context.on('changed:smokemotes.pinned_border', this.pinnedMentions, this);
		this.chat.context.on('changed:smokemotes.pinned_font_color', this.pinnedMentions, this);
		this.chat.context.on('changed:smokemotes.pinned_bg', this.pinnedMentions, this);

		this.chat.context.on('changed:smokemotes.keep_hd_video', this.keep_hd_video, this);
		this.chat.context.on('changed:smokemotes.auto_point_claimer', this.auto_point_claimer, this);
	}

	onEnable() {
		this.log.debug('smokEmotes module was enabled successfully.');

		this.on('chat:receive-message', this.onReceiveMessage);

		this.updateEmotes();
		this.pinnedMentions();
		this.keep_hd_video();
		this.auto_point_claimer();

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

	auto_point_claimer() {

		if (this.chat.context.get('smokemotes.auto_point_claimer')) {

			const MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;
			if (MutationObserver) console.log('Smokey\'s Auto point claimer is enabled.');
			const observer = new MutationObserver(e => {
				const bonus = document.querySelector('.claimable-bonus__icon');
				if (bonus) {
					bonus.click();
					setTimeout(() => {
						console.log('Claimed points! PogChamp');
					}, Math.random() * 1000 + 5000);
				}
			});
			observer.observe(document.body, { childList: true, subtree: true });

		}

	}

	keep_hd_video() {

		if (this.chat.context.get('smokemotes.keep_hd_video')) {

			Object.defineProperty(document, 'hidden', { value: false, writable: false });
			Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: false });
			Object.defineProperty(document, 'webkitVisibilityState', { value: 'visible', writable: false });
			document.dispatchEvent(new Event('visibilitychange'));
			document.hasFocus = function () { return true; };
			window.localStorage.setItem('video-quality', '{"default":"chunked"}');

		} else {

			Object.defineProperty(document, 'hidden', { value: false, writable: true });
			Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true });
			Object.defineProperty(document, 'webkitVisibilityState', { value: 'visible', writable: true });
			window.localStorage.setItem('video-quality', '{"default":"chunked"}');

		}

	}

	onNotifyWindowFocus() {
		if (!document.hidden) document.querySelector('link[rel="icon"]').href = this.notify_icon_original;
	}

	pinnedMentions() {

		const pinned_border = this.settings.get('smokemotes.pinned_border');
		const pinned_background = this.settings.get('smokemotes.pinned_bg');
		const pinned_font = this.settings.get('smokemotes.pinned_font_color');

		if (this.pinned_handler) {
			this.pinned_handler.disconnect();
			delete this.pinned_handler;
			window.removeEventListener('visibilitychange', this.onNotifyWindowFocus);
		}
		if (this.chat.context.get('smokemotes.pinned_mentions')) {
			window.addEventListener('visibilitychange', this.onNotifyWindowFocus);
			let chat_list;
			try {
				chat_list = this.site.children.chat.ChatContainer.first.state.chatListElement;
			} catch { console.log('error getting chat_list'); }
			if (chat_list) {
				let chat_log;
				try {
					chat_log = chat_list.querySelector('[role="log"]');
				} catch { console.log('error getting chat_log'); }
				if (chat_log) {
					const pinned_log = document.createElement('div');
					pinned_log.setAttribute('style', `position: absolute; color: ${pinned_font}; background-color: ${pinned_background}; z-index: 1000; width: 100%;`);
					chat_log.parentNode.prepend(pinned_log);
					this.pinned_handler = new MutationObserver(mutations => {
						mutations.forEach(mutation => {
							if (mutation.addedNodes.length > 0) {
								const chat_line = mutation.addedNodes[0];
								setTimeout(() => {
									if (chat_line.matches('.ffz-mentioned')) {
										const cloned_chat_line = chat_line.cloneNode(true);
										if (!cloned_chat_line.querySelector('.chat-line__timestamp')) {
											const ts = document.createElement('span');
											ts.classList.add('chat-line__timestamp');
											ts.textContent = (new Date()).toLocaleTimeString(window.navigator.userLanguage || window.navigator.language, {
												hour: 'numeric',
												minute: '2-digit'
											});
											cloned_chat_line.prepend(ts);
										}
										cloned_chat_line.setAttribute('style', `border: 1px solid ${pinned_border} !important; border-top: none !important;`);
										const pin_id = Date.now() + Math.floor(Math.random() * 101);
										cloned_chat_line.setAttribute('id', pin_id);
										const close_button = document.createElement('div');
										close_button.setAttribute('style', 'width: 14px; cursor: pointer; top: 5px; right: 5px; position: absolute;');
										close_button.innerHTML = '<svg xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:cc="http://creativecommons.org/ns#" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" style="enable-background:new 0 0 45 45;" xml:space="preserve" version="1.1" id="svg2"><metadata id="metadata8"><rdf:RDF><cc:Work rdf:about=""><dc:format>image/svg+xml</dc:format><dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage"/></cc:Work></rdf:RDF></metadata><defs id="defs6"><clipPath id="clipPath16" clipPathUnits="userSpaceOnUse"><path id="path18" d="M 0,36 36,36 36,0 0,0 0,36 Z"/></clipPath></defs><g transform="matrix(1.25,0,0,-1.25,0,45)" id="g10"><g id="g12"><g clip-path="url(#clipPath16)" id="g14"><g transform="translate(21.5332,17.9976)" id="g20"><path id="path22" style="fill:#dd2e44;fill-opacity:1;fill-rule:nonzero;stroke:none" d="m 0,0 12.234,12.234 c 0.977,0.976 0.977,2.559 0,3.535 -0.976,0.977 -2.558,0.977 -3.535,0 L -3.535,3.535 -15.77,15.769 c -0.975,0.977 -2.559,0.977 -3.535,0 -0.976,-0.976 -0.976,-2.559 0,-3.535 L -7.07,0 -19.332,-12.262 c -0.977,-0.977 -0.977,-2.559 0,-3.535 0.488,-0.489 1.128,-0.733 1.768,-0.733 0.639,0 1.279,0.244 1.767,0.733 L -3.535,-3.535 8.699,-15.769 c 0.489,-0.488 1.128,-0.733 1.768,-0.733 0.639,0 1.279,0.245 1.767,0.733 0.977,0.976 0.977,2.558 0,3.535 L 0,0 Z"/></g></g></g></g></svg>';
										close_button.addEventListener('click', e => {
											e.currentTarget.parentNode.remove();
											delete e.currentTarget.parentNode;
										});
										const chat_author__display_name__orig = chat_line.querySelector('.chat-author__display-name');
										if (chat_author__display_name__orig) {
											const chat_author__display_name__cloned = cloned_chat_line.querySelector('.chat-author__display-name');
											if (chat_author__display_name__cloned) {
												chat_author__display_name__cloned.onclick = () => chat_author__display_name__orig.click();
											}
										}
										const chat_line__message_mention__orig = chat_line.querySelector('.chat-line__message-mention');
										if (chat_line__message_mention__orig) {
											const chat_line__message_mention__cloned = cloned_chat_line.querySelector('.chat-line__message-mention');
											if (chat_line__message_mention__cloned) {
												chat_line__message_mention__cloned.onclick = () => chat_line__message_mention__orig.click();
											}
										}
										cloned_chat_line.appendChild(close_button);
										pinned_log.appendChild(cloned_chat_line);
										if (document.hidden) document.querySelector('link[rel="icon"]').href = this.notify_icon;
										if (this.settings.get('smokemotes.pinned_timer') != 0) {

											setTimeout(() => cloned_chat_line.remove(), this.settings.get('smokemotes.pinned_timer') * 1000);

										}
									}
								}, 250);
							}
						});
					});
					this.pinned_handler.observe(chat_log, {
						childList: true,
						subtree: false
					});
				}
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

	updateChannels() {
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
