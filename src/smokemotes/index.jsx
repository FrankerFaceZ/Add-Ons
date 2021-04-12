const {createElement} = FrankerFaceZ.utilities.dom;

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
		this.injectAs('site_chat', 'site.chat');
		this.inject('site.fine');

		this.user = this.site.getUser();
		this.onKeyDown = this.onKeyDown.bind(this);
		this.ModCardData = {
			user: undefined,
			message_id: undefined,
		};

		this.settings.add('smokemotes.pinned_mentions', {
			default: true,

			ui: {
				sort: -1,
				path: "Add-Ons > Smokey's Utilities >> Pinned Mentions",
				title: 'Pinned Mentions',
				description: 'Enable to have mentions pinned to the top of chat.',
				component: 'setting-check-box',
			},
		});

		this.settings.add('smokemotes.pinned_messages_remove', {
			default: true,

			ui: {
				sort: 0,
				path: "Add-Ons > Smokey's Utilities >> Pinned Mentions",
				title: 'Remove Oldest Pinned Mention If At Max Number',
				description: 'Enable to remove the oldest pinned mention and add the latest mention, otherwise it will stop pinning messages if you have the maximum amount until there is more room.',
				component: 'setting-check-box',
			},
		});

		this.settings.add('smokemotes.pinned_messages_max', {
			default: 6,

			ui: {
				sort: 1,
				path: "Add-Ons > Smokey's Utilities >> Pinned Mentions",
				title: 'Maximum Pinned Messages',
				description:
          'Maximum amount of pinned messages allowed to be in the pinned mentions section.',
				component: 'setting-text-box',
				process(val) {
					val = parseFloat(val, 10);
					if (isNaN(val) || !isFinite(val) || val < 0) return 6;

					return val;
				},
			},
		});

		this.settings.add('smokemotes.pinned_timer', {
			default: 60,

			ui: {
				sort: 2,
				path: "Add-Ons > Smokey's Utilities >> Pinned Mentions",
				title: 'Auto Removal Timer',
				description:
          'Time in seconds to auto remove pinned messages. 0 To Disable.',
				component: 'setting-text-box',
				process(val) {
					val = parseFloat(val, 10);
					if (isNaN(val) || !isFinite(val) || val < 0) return 60;

					return val;
				},
			},
		});

		this.settings.add('smokemotes.pinned_border', {
			default: '#828282',

			ui: {
				sort: 3,
				path: "Add-Ons > Smokey's Utilities >> Pinned Mentions",
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
				sort: 4,
				path: "Add-Ons > Smokey's Utilities >> Pinned Mentions",
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
				sort: 5,
				path: "Add-Ons > Smokey's Utilities >> Pinned Mentions",
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
				path: "Add-Ons > Smokey's Utilities >> Channel",
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
				path: "Add-Ons > Smokey's Utilities >> Channel",
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
				path: "Add-Ons > Smokey's Utilities >> Following",
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
				path: "Add-Ons > Smokey's Utilities >> Mod Keybinds",
				title: 'Toggle Mod Keybinds',
				description: 'Enable to be able to use T/B/P for Timeout/Ban/Purge.',
				component: 'setting-check-box',
			},
		});

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
			(n) => n.trackViewerCardOpen && n.onWhisperButtonClick
		);

		this.style_link = null;

		const t = this;

		/**
		 * Pinned Mentions
		 */
		const Pinned_Mentions = {
			type: 'pinned_mentions',
			priority: 0,

			process(tokens, msg) {
				if ( ! msg.mentioned || msg.smokey_pinned || ! msg.highlights?.has?.('mention') )
					return tokens;

				msg.smokey_pinned = true;

				const pinned_border = this.settings.get(
					'smokemotes.pinned_border'
				);
				let chat_list;
				try {
					chat_list = t.site_chat.ChatContainer.first.state.chatListElement;
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
						const pinned_background = this.settings.get(
							'smokemotes.pinned_bg'
						);
						const pinned_font = this.settings.get(
							'smokemotes.pinned_font_color'
						);
						const pinned_log =
							document.getElementById('pinned_log') ||
							document.createElement('div');
						pinned_log.setAttribute(
							'style',
							`position: absolute; color: ${pinned_font}; background-color: ${pinned_background}; z-index: 1000; width: 100%;`
						);
						pinned_log.id = 'pinned_log';
						pinned_log.classList.add('pinned-highlight-log');
						chat_log.parentNode.prepend(pinned_log);
						if (
							pinned_log.childNodes.length >=
							this.settings.get('smokemotes.pinned_messages_max')
						) {
							if (
								this.settings.get('smokemotes.pinned_messages_remove')
							) {
								pinned_log.childNodes[0].remove();
							} else {
								return tokens;
							}
						}
						requestAnimationFrame(() => {
							const pin_id = Date.now() + Math.floor(Math.random() * 101),
								tokens = msg.ffz_tokens || null;
							let line;
							const close_fn = () => {
								line && line.remove();
								line = null;
							};
							line = (<div
								id={pin_id}
								class="chat-line__message"
								style={`border: 1px solid ${pinned_border} !important; border-top: none !important`}
							>
								<div
									style="width: 14px; cursor: pointer; top: 5px; right: 5px; position: absolute"
									onclick={close_fn}
								>
									<figure class="ffz-i-cancel" />
								</div>
								<span class="chat-line__timestamp">
									{ this.formatTime(msg.timestamp) }
								</span>
								<span class="chat-line__username notranslate" role="button">
									<span class="chat-author__display-name">
										<a rel="noopener noreferrer" target="_blank" href={`https://twitch.tv/${msg.user.login}`} style={{color: msg.user.color}}>
											{ msg.user.displayName || msg.user.login }
										</a>
									</span>
								</span>
								{': '}
								{tokens ? this.renderTokens(tokens) : msg.message}
							</div>);
							/*const cloned_chat_line = document.createElement('div');
							cloned_chat_line.classList.add('chat-line__message');
							cloned_chat_line.innerHTML = `<span class="chat-line__username notranslate" role="button"><span class="chat-author__display-name"><a data-tooltip-type="link" data-url="https://twitch.tv/${msg.user.login
							}" data-is-mail="false" rel="noopener noreferrer" style="color: ${msg.user.color
							};" target="_blank" href="https://twitch.tv/${msg.user.login
							}">${msg.user.displayName
							}</a></span></span>: <span class="text-fragment" style="color: ${pinned_font};" data-a-target="chat-message-text">${msg.message
							}</span>`;
							const ts = document.createElement('span');
							ts.classList.add('chat-line__timestamp');
							ts.textContent = new Date().toLocaleTimeString(
								window.navigator.userLanguage ||
								window.navigator.language,
								{
									hour: 'numeric',
									minute: '2-digit',
									second: '2-digit',
								}
							);
							cloned_chat_line.prepend(ts);
							cloned_chat_line.setAttribute(
								'style',
								`border: 1px solid ${pinned_border} !important; border-top: none !important;`
							);

							cloned_chat_line.setAttribute('id', pin_id);
							const close_button = document.createElement('div');
							close_button.setAttribute(
								'style',
								'width: 14px; cursor: pointer; top: 5px; right: 5px; position: absolute;'
							);
							close_button.innerHTML =
								'<svg xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:cc="http://creativecommons.org/ns#" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" style="enable-background:new 0 0 45 45;" xml:space="preserve" version="1.1" id="svg2"><metadata id="metadata8"><rdf:RDF><cc:Work rdf:about=""><dc:format>image/svg+xml</dc:format><dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage"/></cc:Work></rdf:RDF></metadata><defs id="defs6"><clipPath id="clipPath16" clipPathUnits="userSpaceOnUse"><path id="path18" d="M 0,36 36,36 36,0 0,0 0,36 Z"/></clipPath></defs><g transform="matrix(1.25,0,0,-1.25,0,45)" id="g10"><g id="g12"><g clip-path="url(#clipPath16)" id="g14"><g transform="translate(21.5332,17.9976)" id="g20"><path id="path22" style="fill:#dd2e44;fill-opacity:1;fill-rule:nonzero;stroke:none" d="m 0,0 12.234,12.234 c 0.977,0.976 0.977,2.559 0,3.535 -0.976,0.977 -2.558,0.977 -3.535,0 L -3.535,3.535 -15.77,15.769 c -0.975,0.977 -2.559,0.977 -3.535,0 -0.976,-0.976 -0.976,-2.559 0,-3.535 L -7.07,0 -19.332,-12.262 c -0.977,-0.977 -0.977,-2.559 0,-3.535 0.488,-0.489 1.128,-0.733 1.768,-0.733 0.639,0 1.279,0.244 1.767,0.733 L -3.535,-3.535 8.699,-15.769 c 0.489,-0.488 1.128,-0.733 1.768,-0.733 0.639,0 1.279,0.245 1.767,0.733 0.977,0.976 0.977,2.558 0,3.535 L 0,0 Z"/></g></g></g></g></svg>';
							close_button.addEventListener('click', (e) => {
								e.currentTarget.parentNode.remove();
								delete e.currentTarget.parentNode;
							});
							cloned_chat_line.appendChild(close_button);*/
							pinned_log.appendChild(line);
							if (document.hidden)
								document.querySelector(
									'link[rel="icon"]'
								).href = this.notify_icon;
							if (this.settings.get('smokemotes.pinned_timer') != 0) {
								setTimeout(close_fn, this.settings.get('smokemotes.pinned_timer') * 1000);
							}
						});
					}
				}

				return tokens;
			},
		};

		this.chat.addTokenizer(Pinned_Mentions);
	}

	onEnable() {
		this.log.debug("Smokey's Utilities module was enabled successfully.");

		this.keep_hd_video();
		this.auto_point_claimer();

		this.liveFollowing();

		this.mod_keybind_handler();

		this.ViewerCard.on('update', this.updateCard, this);
		this.ViewerCard.on('unmount', this.unmountCard, this);
	}

	/**
	 * Automatically Claim Channel Points Observer
	 */

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

	/**
	 * Actually does more than this now. Will keep video from falling behind as well as keep the video HD (in most cases).
	 */

	keep_hd_video() {
		if (this.chat.context.get('smokemotes.keep_hd_video')) {
			try {
				Object.defineProperty(document, 'hidden', {
					value: false,
					writable: false,
				});
				document.addEventListener(
					'visibilitychange',
					(e) => {
						e.stopImmediatePropagation();
					},
					true,
					true
				);
			} catch (err) {
				this.log.warn('Unable to install document visibility hook.', err);
			}
		}
	}

	liveFollowing() {
		if (
			window.location.href == 'https://www.twitch.tv/directory/following' &&
      this.chat.context.get('smokemotes.auto_live_follow_page')
		) {
			const find_liveChannelsButton = document.getElementsByClassName('tw-pd-x-1');

			let i = find_liveChannelsButton.length;

			while (i--) {
				if (
					find_liveChannelsButton[i].getAttribute('data-a-target') == 'following-live-tab'
				) {
					find_liveChannelsButton[i].click();
				}
			}
		}
	}

	onNotifyWindowFocus() {
		if (!document.hidden)
			document.querySelector(
				'link[rel="icon"]'
			).href = this.notify_icon_original;
	}

	/**
	 * Moderator Keybinds
	 */

	onKeyDown(e) {

		if (
			document.activeElement.matches('input') ||
			document.activeElement.matches('textarea') ||
			e.ctrlKey ||
			e.metaKey ||
			e.shiftKey ||
			!this.ModCardData.user
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

				this.resolve('site.chat').ChatService.first.sendMessage(
					`/timeout ${this.ModCardData.user} 600`
				);
				this.updateLogin();

				if (close_button) {
					close_button.click();
				}

				break;

				// delete message
			case 68:

				this.resolve('site.chat').ChatService.first.sendMessage(
					`/delete ${this.ModCardData.message_id}`
				);
				this.updateLogin();

				if (close_button) {
					close_button.click();
				}

				break;

				// ban
			case 66:

				this.resolve('site.chat').ChatService.first.sendMessage(
					`/ban ${this.ModCardData.user}`
				);
				this.updateLogin();

				if (close_button) {
					close_button.click();
				}

				break;

				// purge
			case 80:

				this.resolve('site.chat').ChatService.first.sendMessage(
					`/timeout ${this.ModCardData.user} 1`
				);
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
