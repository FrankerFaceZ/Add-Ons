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

		this.settings.add('smokemotes.pinned_reasons', {
			default: ['mention'],
			type: 'basic_array_merge',
			ui: {
				path: "Add-Ons > Smokey's Utilities >> Pinned Mentions",
				title: 'Pin Reasons',
				description: 'Pin messages when a chat line is highlighted for one of the selected reasons.',
				component: 'setting-select-box',
				multiple: true,
				data: () => this.chat.getHighlightReasons()
			}
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
				description: 'Maximum amount of pinned messages allowed to be in the pinned mentions section.',
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
				description: 'Time in seconds to auto remove pinned messages. 0 To Disable.',
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
				description: 'Enable to keep the video player from automatically decreasing video quality when out of focus.',
				component: 'setting-check-box',
			},
		});

		this.settings.add('smokemotes.auto_point_claimer', {
			default: false,

			ui: {
				sort: 0,
				path: "Add-Ons > Smokey's Utilities >> Channel",
				title: 'Auto Point Claimer',
				description: 'Enable to automatically obtain channel points. After disabling, you must refresh to completely disable.',
				component: 'setting-check-box',
			},
		});

		this.settings.add('smokemotes.auto_live_follow_page', {
			default: false,

			ui: {
				sort: 0,
				path: "Add-Ons > Smokey's Utilities >> Following",
				title: 'Auto go to Live channels on your Following Directory',
				description: 'Enable to automatically go to the Live channel section on a fresh load of the following directory.',
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
			n => n.trackViewerCardOpen && n.onWhisperButtonClick
		);

		this.style_link = null;

		this.event_listener = false;

		/*const t = this;

		/**
		 * Pinned Mentions
		 * /
		const Pinned_Mentions = {
			type: 'pinned_mentions',
			priority: -1000,

			process(tokens, msg) {
				if ( msg.smokey_pinned )
					return tokens;

				msg.smokey_pinned = true;
				if ( msg.deleted || msg.ffz_removed || ! msg.mentioned || msg.isHistorical || ! t.settings.get('smokemotes.pinned_mentions') )
					return tokens;

				try {
					t.handlePin(msg);
				} catch(err) {
					t.log.error('Error handling pin for message.', err);
				}

				return tokens;
			}
		};*/

		this.updateEventListener();
		this.settings.on(':changed:smokemotes.pinned_mentions', this.updateEventListener, this);

		/*if ( this.settings.get('smokemotes.pinned_mentions') ) {
			this.pinned_registered = true;
			this.chat.addTokenizer(Pinned_Mentions);
		} else {
			this.settings.on(':changed:smokemotes.pinned_mentions', () => {
				if ( ! this.pinned_registered && this.settings.get('smokemotes.pinned_mentions') ) {
					this.pinned_registered = true;
					this.chat.addTokenizer(Pinned_Mentions);
				}
			});
		}*/
	}

	onEnable() {
		this.log.debug("Smokey's Utilities module was enabled successfully.");

		this.keep_hd_video();
		this.auto_point_claimer();

		this.liveFollowing();

		this.mod_keybind_handler();

		this.ViewerCard.on('mount', this.updateCard, this);
		this.ViewerCard.on('unmount', this.unmountCard, this);
	}

	/**
	 * Handle new messages, see if they should be pinned and pin them.
	 */

	updateEventListener() {
		const setting = this.settings.get('smokemotes.pinned_mentions');
		if ( setting && ! this.event_listener )
			this.on('chat:buffer-message', this.handlePin, this);
		else if ( ! setting && this.event_listener )
			this.off('chat:buffer-message', this.handlePin, this);

		this.event_listener = setting;
	}

	handlePin(event) {
		const msg = event.message;
		if ( msg.smokey_pinned )
			return;

		msg.smokey_pinned = true;
		if ( msg.deleted || msg.ffz_removed || ! msg.mentioned || msg.isHistorical || ! this.settings.get('smokemotes.pinned_mentions') )
			return;

		const highlights = msg.highlights;
		if ( ! highlights?.size )
			return;

		const types = this.settings.get('smokemotes.pinned_reasons');
		let matched = false;
		for(const type of types)
			if ( highlights.has(type) ) {
				matched = true;
				break;
			}

		if ( ! matched )
			return;

		let pinned_log = document.querySelector('#smokey_pinned_log');
		if ( ! pinned_log ) {
			const container = this.site_chat.ChatContainer.first,
				el = container?.state?.chatListElement,
				log = el && el.querySelector('[role="log"]');

			if ( ! log )
				return;

			pinned_log = createElement('div', {
				id: 'smokey_pinned_log',
				class: 'pinned-highlight-log tw-absolute tw-top-0 tw-full-width tw-z-above tw-c-background-base'
			});

			log.parentNode.prepend(pinned_log);
		}

		pinned_log.style.color = this.settings.get('smokemotes.pinned_font_color');

		if ( pinned_log.childNodes.length >= this.settings.get('smokemotes.pinned_messages_max') ) {
			if ( this.settings.get('smokemotes.pinned_messages_remove') )
				pinned_log.childNodes[0].remove();
			else
				return;
		}

		let bg_color = msg.mention_color;
		if ( bg_color )
			bg_color = this.site_chat.inverse_colors.process(bg_color);
		if ( ! bg_color )
			bg_color = this.site_chat.inverse_colors.process(this.settings.get('smokemotes.pinned_bg'));

		let color = msg.user.color;
		if ( color )
			color = this.site_chat.colors.process(color);

		const msg_types = this.site_chat.message_types || {},
			is_action = msg.messageType === msg_types.Action,
			action_style = is_action ? this.chat.context.get('chat.me-style') : 0,
			action_italic = action_style >= 2,
			action_color = action_style === 1 || action_style === 3;

		requestAnimationFrame(() => {
			const pin_id = Date.now() + Math.floor(Math.random() * 101),
				tokens = msg.ffz_tokens || null,
				pinned_border = this.settings.get('smokemotes.pinned_border');

			let line, timer;
			const close_fn = () => {
				timer && clearTimeout(timer);
				line && line.remove();
				line = timer = null;
			};

			let room = msg.roomLogin ? msg.roomLogin : msg.channel ? msg.channel.slice(1) : undefined,
				room_id = msg.roomId;

			if ( ! room && room_id ) {
				const r = this.chat.getRoom(room_id, null, true);
				if ( r && r.login )
					room = msg.roomLogin = r.login;
			}

			if ( ! room_id && room ) {
				const r = this.chat.getRoom(null, room, true);
				if ( r && r.id )
					room_id = msg.roomId = r.id;
			}

			line = (<div
				id={pin_id}
				class={`chat-line__message${bg_color ? ' ffz-custom-color' : ''}`}
				style={`border: 1px solid ${pinned_border} !important; border-top: none !important;${bg_color ? `background-color:${bg_color};` : ''}`}
				data-room={room}
				data-room-id={room_id}
				data-user={msg.user.login}
				data-user-id={msg.user.id}
			>
				<div
					style="width: 14px; cursor: pointer; top: 5px; right: 5px; position: absolute"
					// eslint-disable-next-line react/jsx-no-bind
					onclick={close_fn}
				>
					<figure class="ffz-i-cancel" />
				</div>
				<span class="chat-line__timestamp">
					{ this.chat.formatTime(msg.timestamp) }
				</span>
				<span class="chat-line__message--badges">
					{ this.chat.badges.render(msg, createElement) }
				</span>
				<span class="chat-line__username notranslate" role="button">
					<span class="chat-author__display-name">
						<a rel="noopener noreferrer" target="_blank" href={`https://twitch.tv/${msg.user.login}`} style={{color}}>
							{ msg.user.displayName || msg.user.login }
						</a>
					</span>
				</span>
				{is_action ? ' ' : ': '}
				<span
					class={`message ${action_italic ? 'chat-line__message-body--italicized' : ''}`}
					style={{color: action_color ? color : null}}
				>
					{tokens ? this.chat.renderTokens(tokens) : msg.message}
				</span>
			</div>);

			pinned_log.appendChild(line);

			if (document.hidden)
				document.querySelector(
					'link[rel="icon"]'
				).href = this.notify_icon;

			const timeout = this.settings.get('smokemotes.pinned_timer');
			if ( timeout > 0 ) {
				timer = setTimeout(close_fn, timeout * 1000);
			}
		});
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
