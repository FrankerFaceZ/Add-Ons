class SmokeysUtils extends Addon {
	constructor(...args) {
		super(...args);

		this.notify_icon = document.querySelector('link[rel="icon"]')?.href;
		this.pinned_handler = undefined;

		this.inject('settings');
		this.inject('chat');
		this.inject('chat.emotes');
		this.inject('chat.badges');
		this.inject('site');
		this.inject('site.fine');

		this.user = this.site.getUser();
		this.onKeyDown = this.onKeyDown.bind(this);
		this.ModCardData = {
			user: undefined,
			message_id: undefined
		};

		this.settings.add('smokemotes.pinned_mentions', {
			default: true,

			ui: {
				sort: -1,
				path: 'Add-Ons > Smokey\'s Utilities >> Pinned Mentions',
				title: 'Pinned Mentions',
				description: 'Enable to have mentions pinned to the top of chat.',
				component: 'setting-check-box',
			},
		});

		this.settings.add('smokemotes.pinned_timer', {
			default: 60,

			ui: {
				sort: 0,
				path: 'Add-Ons > Smokey\'s Utilities >> Pinned Mentions',
				title: 'Auto Removal Timer',
				description:
          'Time in seconds to auto remove pinned messages. 0 To Disable.',
				component: 'setting-text-box',
				process(val) {
					val = parseFloat(val, 10);
					if (isNaN(val) || !isFinite(val) || val <= 0) return 60;

					return val;
				},
			},
		});

		this.settings.add('smokemotes.pinned_border', {
			default: '#828282',

			ui: {
				sort: 1,
				path: 'Add-Ons > Smokey\'s Utilities >> Pinned Mentions',
				title: 'Border Color',
				description: 'Color to use for the border of pinned mentions.',
				component: 'setting-color-box',
				alpha: false,
				openUp: true,
			},
		});

		this.settings.add('smokemotes.pinned_font_color', {
			default: '#dadada',

			ui: {
				sort: 2,
				path: 'Add-Ons > Smokey\'s Utilities >> Pinned Mentions',
				title: 'Font Color',
				description: 'Color to use for the font of pinned mentions.',
				component: 'setting-color-box',
				alpha: false,
				openUp: true,
			},
		});

		this.settings.add('smokemotes.pinned_bg', {
			default: '#3e0b0b',

			ui: {
				sort: 3,
				path: 'Add-Ons > Smokey\'s Utilities >> Pinned Mentions',
				title: 'Background Color',
				description: 'Color to use for the background of pinned mentions.',
				component: 'setting-color-box',
				alpha: false,
				openUp: true,
			},
		});

		this.settings.add('smokemotes.keep_hd_video', {
			default: true,

			ui: {
				sort: -1,
				path: 'Add-Ons > Smokey\'s Utilities >> Channel',
				title: 'Maintain HD Quality',
				description:
          'Enable to keep the video player from automatically decreasing video quality when out of focus.',
				component: 'setting-check-box',
			},
		});

		this.settings.add('smokemotes.auto_point_claimer', {
			default: false,

			ui: {
				sort: 0,
				path: 'Add-Ons > Smokey\'s Utilities >> Channel',
				title: 'Auto Point Claimer',
				description:
          'Enable to automatically obtain channel points. After disabling, you must refresh to completely disable.',
				component: 'setting-check-box',
			},
		});

		this.settings.add('smokemotes.auto_live_follow_page', {
			default: false,

			ui: {
				sort: 0,
				path: 'Add-Ons > Smokey\'s Utilities >> Following',
				title: 'Auto go to Live channels on your Following Directory',
				description:
          'Enable to automatically go to the Live channel section on a fresh load of the following directory.',
				component: 'setting-check-box',
			},
		});

		this.settings.add('smokemotes.mod_keybinds', {
			default: false,
			requires: ['context.moderator'],
			process(ctx, val) {
				return ctx.get('context.moderator') ? val : false;
			},
			ui: {
				sort: 1,
				path: 'Add-Ons > Smokey\'s Utilities >> Mod Keybinds',
				title: 'Toggle Mod Keybinds',
				description: 'Enable to be able to use T/B/P for Timeout/Ban/Purge.',
				component: 'setting-check-box',
			},
		});

		this.chat.context.on(
			'changed:smokemotes.pinned_mentions',
			this.pinnedMentions,
			this
		);
		this.chat.context.on(
			'changed:smokemotes.pinned_timer',
			this.pinnedMentions,
			this
		);
		this.chat.context.on(
			'changed:smokemotes.pinned_border',
			this.pinnedMentions,
			this
		);
		this.chat.context.on(
			'changed:smokemotes.pinned_font_color',
			this.pinnedMentions,
			this
		);
		this.chat.context.on(
			'changed:smokemotes.pinned_bg',
			this.pinnedMentions,
			this
		);

		this.chat.context.on(
			'changed:smokemotes.keep_hd_video',
			this.keep_hd_video,
			this
		);
		this.chat.context.on(
			'changed:smokemotes.auto_point_claimer',
			this.auto_point_claimer,
			this
		);

		this.chat.context.on(
			'changed:smokemotes.mod_keybinds',
			this.mod_keybind_handler,
			this
		);

		this.ViewerCard = this.fine.define(
			'chat-viewer-card',
			n => n.trackViewerCardOpen && n.onWhisperButtonClick
		);
	}

	onEnable() {
		this.log.debug('Smokey\'s Utilities module was enabled successfully.');

		this.pinnedMentions();
		this.keep_hd_video();
		this.auto_point_claimer();

		this.liveFollowing();

		this.mod_keybind_handler();

		this.ViewerCard.on('mount', this.updateCard, this);
		this.ViewerCard.on('update', this.updateCard, this);
		this.ViewerCard.on('unmount', this.unmountCard, this);
	}

	// automatically claim channel points

	auto_point_claimer() {
		if (this.chat.context.get('smokemotes.auto_point_claimer')) {
			const observer = new MutationObserver(() => {
				const bonus = document.querySelector('.claimable-bonus__icon');
				if (bonus) {
					bonus.click();
				}
			});
			observer.observe(document.body, { childList: true, subtree: true });
		}
	}

	// maintain high quality video even when tab isn't focused

	keep_hd_video() {
		if (this.chat.context.get('smokemotes.keep_hd_video')) {
			try {
				Object.defineProperty(document, 'hidden', {
					value: false,
					writable: false,
				});
				document.addEventListener('visibilitychange', e => {
					e.stopImmediatePropagation();
				}, true, true);
			} catch (err) {
				this.log.warn('Unable to install document visibility hook.', err);
			}
		}
	}

	liveFollowing(){

		if (window.location.href == 'https://www.twitch.tv/directory/following'
		&& this.chat.context.get('smokemotes.auto_live_follow_page')){

			window.location.href = 'https://www.twitch.tv/directory/following/live';

		}

	}

	onNotifyWindowFocus() {
		if (!document.hidden)
			document.querySelector(
				'link[rel="icon"]'
			).href = this.notify_icon_original;
	}

	// pin highlighted mentions to the top of chat

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
				chat_list = this.site.children.chat.ChatContainer.first.state
					.chatListElement;
			} catch {
				this.log.debug('error getting chat_list');
			}
			if (chat_list) {
				let chat_log;
				try {
					chat_log = chat_list.querySelector('[role="log"]');
				} catch {
					this.log.debug('error getting chat_log');
				}
				if (chat_log) {
					const pinned_log = document.createElement('div');
					pinned_log.setAttribute(
						'style',
						`position: absolute; color: ${pinned_font}; background-color: ${pinned_background}; z-index: 1000; width: 100%;`
					);
					chat_log.parentNode.prepend(pinned_log);
					this.pinned_handler = new MutationObserver(mutations => {
						mutations.forEach(mutation => {
							if (mutation.addedNodes.length > 0) {
								const chat_line = mutation.addedNodes[0];
								requestAnimationFrame(() => {
									if (chat_line.matches('.ffz-mentioned')) {
										const cloned_chat_line = chat_line.cloneNode(true);
										if (
											!cloned_chat_line.querySelector('.chat-line__timestamp')
										) {
											const ts = document.createElement('span');
											ts.classList.add('chat-line__timestamp');
											ts.textContent = new Date().toLocaleTimeString(
												window.navigator.userLanguage ||
                          window.navigator.language,
												{
													hour: 'numeric',
													minute: '2-digit',
												}
											);
											cloned_chat_line.prepend(ts);
										}
										cloned_chat_line.setAttribute(
											'style',
											`border: 1px solid ${pinned_border} !important; border-top: none !important;`
										);
										const pin_id = Date.now() + Math.floor(Math.random() * 101);
										cloned_chat_line.setAttribute('id', pin_id);
										const close_button = document.createElement('div');
										close_button.setAttribute(
											'style',
											'width: 14px; cursor: pointer; top: 5px; right: 5px; position: absolute;'
										);
										close_button.innerHTML =
                      '<svg xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:cc="http://creativecommons.org/ns#" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" style="enable-background:new 0 0 45 45;" xml:space="preserve" version="1.1" id="svg2"><metadata id="metadata8"><rdf:RDF><cc:Work rdf:about=""><dc:format>image/svg+xml</dc:format><dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage"/></cc:Work></rdf:RDF></metadata><defs id="defs6"><clipPath id="clipPath16" clipPathUnits="userSpaceOnUse"><path id="path18" d="M 0,36 36,36 36,0 0,0 0,36 Z"/></clipPath></defs><g transform="matrix(1.25,0,0,-1.25,0,45)" id="g10"><g id="g12"><g clip-path="url(#clipPath16)" id="g14"><g transform="translate(21.5332,17.9976)" id="g20"><path id="path22" style="fill:#dd2e44;fill-opacity:1;fill-rule:nonzero;stroke:none" d="m 0,0 12.234,12.234 c 0.977,0.976 0.977,2.559 0,3.535 -0.976,0.977 -2.558,0.977 -3.535,0 L -3.535,3.535 -15.77,15.769 c -0.975,0.977 -2.559,0.977 -3.535,0 -0.976,-0.976 -0.976,-2.559 0,-3.535 L -7.07,0 -19.332,-12.262 c -0.977,-0.977 -0.977,-2.559 0,-3.535 0.488,-0.489 1.128,-0.733 1.768,-0.733 0.639,0 1.279,0.244 1.767,0.733 L -3.535,-3.535 8.699,-15.769 c 0.489,-0.488 1.128,-0.733 1.768,-0.733 0.639,0 1.279,0.245 1.767,0.733 0.977,0.976 0.977,2.558 0,3.535 L 0,0 Z"/></g></g></g></g></svg>';
										close_button.addEventListener('click', e => {
											e.currentTarget.parentNode.remove();
											delete e.currentTarget.parentNode;
										});
										cloned_chat_line.appendChild(close_button);
										pinned_log.appendChild(cloned_chat_line);
										if (document.hidden)
											document.querySelector(
												'link[rel="icon"]'
											).href = this.notify_icon;
										if (this.settings.get('smokemotes.pinned_timer') != 0) {
											setTimeout(
												() => cloned_chat_line.remove(),
												this.settings.get('smokemotes.pinned_timer') * 1000
											);
										}
									}
								});
							}
						});
					});
					this.pinned_handler.observe(chat_log, {
						childList: true,
						subtree: false,
					});
				}
			}
		}
	}

	// mod keybind stuff

	onKeyDown(e) {

		if (e.ctrlKey || e.metaKey || e.shiftKey || !this.ModCardData.user) return;

		// find text area
		const text_area = document.getElementsByClassName('tw-textarea')[0];
		const mod_comment = document.getElementsByTagName('input')[4];

		if (!text_area) return; // shouldn't happen but just in case?

		if (
			document.activeElement === text_area ||
      document.activeElement === mod_comment
		)
			return;

		const find_close = document.getElementsByClassName('tw-button-icon');

		let close_button;

		let i = find_close.length;

		while (i--) {
			if (
				find_close[i].getAttribute('data-test-selector') == 'close-viewer-card'
			) {
				close_button = find_close[i];
			}
		}

		const keyCode = e.keyCode || e.which;

		switch (keyCode) {
			// timeout
			case 84:
				this.resolve('site.chat')
					.ChatService.first.sendMessage(`/timeout ${this.ModCardData.user} 600`);
				this.updateLogin();

				if (close_button) {
					close_button.click();
				}

				break;

				// delete message
			case 68:
				this.resolve('site.chat')
					.ChatService.first.sendMessage(`/delete ${this.ModCardData.message_id}`);
				this.updateLogin();

				if (close_button) {
					close_button.click();
				}

				break;

				// ban
			case 66:
				this.resolve('site.chat')
					.ChatService.first.sendMessage(`/ban ${this.ModCardData.user}`);
				this.updateLogin();

				if (close_button) {
					close_button.click();
				}

				break;

				// purge
			case 80:
				this.resolve('site.chat')
					.ChatService.first.sendMessage(`/timeout ${this.ModCardData.user} 1`);
				this.updateLogin();

				if (close_button) {
					close_button.click();
				}

				break;

				// Esc key to close viewer card
			case 27:
				if (close_button) {
					close_button.click();
				}

				break;
		}
	}

	updateLogin(login, msg_id) {
		if (login && msg_id) {
			login = login.toLowerCase();
			this.ModCardData.user = login;
			this.ModCardData.message_id = msg_id;
		} else {
			this.ModCardData.user = undefined;
			this.ModCardData.message_id = undefined;
		}
	}

	updateCard(inst) {
		this.updateLogin(inst.props.targetLogin, inst.props.sourceID);
	}

	unmountCard() {
		this.updateLogin();
	}

	mod_keybind_handler() {
		if (this.chat.context.get('smokemotes.mod_keybinds')) {
			window.addEventListener('keydown', this.onKeyDown);
		} else {
			window.removeEventListener('keydown', this.onKeyDown);
		}
	}
}

SmokeysUtils.register();
