const {createElement} = FrankerFaceZ.utilities.dom;

class SmokeysUtils extends Addon {
	constructor(...args) {
		super(...args);

		this.notify_icon = document.querySelector('link[rel="icon"]')?.href;
		this.notify_icon_original = this.notify_icon;
		this.pinned_handler = undefined;
		this.hd_video_handler = null;
		this.creating_pinned_log = false;

		// Cache DOM elements
		this.cached_chat_input = null;
		this.cached_close_button = null;
		this.cached_icon_link = null;

		// Mod action confirmation tracking
		this.pending_mod_action = null;
		this.mod_action_timeout = null;

		this.inject('settings');
		this.inject('chat');
		this.inject('chat.emotes');
		this.inject('chat.badges');
		this.inject('site');
		this.injectAs('site_chat', 'site.chat');
		this.inject('site.fine');
		this.inject('site.router');

		this.user = this.site.getUser();
		this.onKeyDown = this.onKeyDown.bind(this);
		this.ModCardData = {
			user: undefined,
			message_id: undefined,
		};

		this.firstLoad = 0;

		this.site.router.on(':route', (route, match) => {
			if (match && match[0] == '/directory/following' && this.firstLoad === 0){
				this.liveFollowing();
				// do this just in case the user wants to go to Overview later for videos etc..
				this.firstLoad = 1;
			}
		});

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
				description: 'Enable to be able to use T/B/P/D for Timeout/Ban/Purge/Delete.',
				component: 'setting-check-box',
			},
		});

		this.settings.add('smokemotes.mod_timeout_duration', {
			default: 600,

			ui: {
				sort: 1.5,
				path: "Add-Ons > Smokey's Utilities >> Mod Keybinds",
				title: 'Timeout Duration',
				description: 'Duration for timeout keybind (T key).',
				component: 'setting-select-box',
				data: [
					{ value: 1, title: '1 second (Purge)' },
					{ value: 10, title: '10 seconds' },
					{ value: 60, title: '1 minute' },
					{ value: 300, title: '5 minutes' },
					{ value: 600, title: '10 minutes' },
					{ value: 1800, title: '30 minutes' },
					{ value: 3600, title: '1 hour' },
					{ value: 14400, title: '4 hours' },
					{ value: 86400, title: '1 day' },
					{ value: 604800, title: '1 week' },
					{ value: 1209600, title: '2 weeks' }
				]
			},
		});

		this.settings.add('smokemotes.mod_confirm_actions', {
			default: false,

			ui: {
				sort: 1.6,
				path: "Add-Ons > Smokey's Utilities >> Mod Keybinds",
				title: 'Confirm Mod Actions',
				description: 'Enable to require pressing the keybind twice to confirm timeout/ban/delete actions.',
				component: 'setting-check-box',
			},
		});

		this.settings.add('smokemotes.auto_exit_viewercard', {
			default: true,

			ui: {
				sort: 2,
				path: "Add-Ons > Smokey's Utilities >> Mod Keybinds",
				title: 'Auto Close Viewer Card After Keybind Action',
				component: 'setting-check-box',
			},
		});

		this.chat.context.on(
			'changed:smokemotes.keep_hd_video',
			this.keep_hd_video,
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

		this.updateEventListener();
		this.settings.on(':changed:smokemotes.pinned_mentions', this.updateEventListener, this);
	}

	onEnable() {
		if (document.readyState != "complete") {
			window.addEventListener('load', () => {
				this.keep_hd_video();
			  });
		} else {
			this.keep_hd_video();
		}

		this.mod_keybind_handler();

		this.ViewerCard.on('mount', this.updateCard, this);
		this.ViewerCard.on('unmount', this.unmountCard, this);

		// Restore pinned messages from localStorage
		this.restorePinnedMessages();

		this.log.debug("Smokey's Utilities module was enabled successfully.");
	}

	onDisable() {
		// Save pinned messages before cleanup
		this.savePinnedMessages();

		// Clean up event listeners
		if (this.hd_video_handler) {
			try {
				document.removeEventListener('visibilitychange', this.hd_video_handler, true);
			} catch (err) {
				// Ignore removal errors
			}
			this.hd_video_handler = null;
		}

		// Remove keybind listener
		window.removeEventListener('keydown', this.onKeyDown);

		// Remove ViewerCard listeners
		this.ViewerCard.off('mount', this.updateCard, this);
		this.ViewerCard.off('unmount', this.unmountCard, this);

		// Remove pinned message listener
		this.off('chat:buffer-message', this.handlePin, this);
		this.event_listener = false;

		// Remove pinned log element
		const pinned_log = document.querySelector('#smokey_pinned_log');
		if (pinned_log) {
			pinned_log.remove();
		}

		// Clear cached DOM elements
		this.cached_chat_input = null;
		this.cached_close_button = null;
		this.cached_icon_link = null;

		// Clear pending mod actions
		this.pending_mod_action = null;
		if (this.mod_action_timeout) {
			clearTimeout(this.mod_action_timeout);
			this.mod_action_timeout = null;
		}

		this.log.debug("Smokey's Utilities module was disabled successfully.");
	}

	savePinnedMessages() {
		try {
			const pinned_log = document.querySelector('#smokey_pinned_log');
			if (!pinned_log || !pinned_log.childNodes.length) {
				localStorage.removeItem('smokemotes_pinned_messages');
				return;
			}

			const messages = [];
			for (const child of pinned_log.childNodes) {
				messages.push({
					html: child.outerHTML,
					timestamp: Date.now()
				});
			}

			localStorage.setItem('smokemotes_pinned_messages', JSON.stringify(messages));
		} catch (err) {
			this.log.warn('Failed to save pinned messages to localStorage', err);
		}
	}

	restorePinnedMessages() {
		try {
			const saved = localStorage.getItem('smokemotes_pinned_messages');
			if (!saved) return;

			const messages = JSON.parse(saved);
			if (!messages || !messages.length) return;

			// Check if messages are too old (more than 1 hour)
			const now = Date.now();
			const oneHour = 60 * 60 * 1000;
			const validMessages = messages.filter(msg => (now - msg.timestamp) < oneHour);

			if (!validMessages.length) {
				localStorage.removeItem('smokemotes_pinned_messages');
				return;
			}

			// Wait for DOM to be ready
			requestAnimationFrame(() => {
				const container = this.site_chat.ChatContainer.first;
				const el = container?.state?.chatListElement;
				if (!el) return;

				let pinned_log = document.querySelector('#smokey_pinned_log');
				if (!pinned_log) {
					pinned_log = createElement('div', {
						id: 'smokey_pinned_log',
						class: 'pinned-highlight-log tw-absolute tw-top-0 tw-z-above tw-full-width tw-c-background-base',
						style: 'z-order:99 !important;'
					});
					el.parentNode.prepend(pinned_log);
				}

				// Restore messages
				for (const msg of validMessages) {
					const temp = createElement('div');
					temp.innerHTML = msg.html;
					const restoredMsg = temp.firstChild;
					if (restoredMsg) {
						pinned_log.appendChild(restoredMsg);
					}
				}

				pinned_log.style.color = this.settings.get('smokemotes.pinned_font_color');
			});
		} catch (err) {
			this.log.warn('Failed to restore pinned messages from localStorage', err);
			localStorage.removeItem('smokemotes_pinned_messages');
		}
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
			// Prevent race condition when multiple messages arrive simultaneously
			if (this.creating_pinned_log) {
				// Wait for the log to be created, then retry
				requestAnimationFrame(() => this.handlePin(event));
				return;
			}

			this.creating_pinned_log = true;
			const container = this.site_chat.ChatContainer.first,
				el = container?.state?.chatListElement;

			pinned_log = createElement('div', {
				id: 'smokey_pinned_log',
				class: 'pinned-highlight-log tw-absolute tw-top-0 tw-z-above tw-full-width tw-c-background-base',
				style: 'z-order:99 !important;'
			});

			el.parentNode.prepend(pinned_log);
			this.creating_pinned_log = false;
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

			if (document.hidden) {
				// Cache icon link element
				if (!this.cached_icon_link || !document.contains(this.cached_icon_link)) {
					this.cached_icon_link = document.querySelector('link[rel="icon"]');
				}
				if (this.cached_icon_link) {
					this.cached_icon_link.href = this.notify_icon;
				}
			}

			const timeout = this.settings.get('smokemotes.pinned_timer');
			if ( timeout > 0 ) {
				timer = setTimeout(close_fn, timeout * 1000);
			}
		});
	}

	/**
	 * Actually does more than this now. Will keep video from falling behind as well as keep the video HD (in most cases).
	 */

	keep_hd_video() {
		// Remove existing handler if present
		if (this.hd_video_handler) {
			try {
				document.removeEventListener('visibilitychange', this.hd_video_handler, true);
			} catch (err) {
				// Ignore removal errors
			}
			this.hd_video_handler = null;
		}

		if (this.chat.context.get('smokemotes.keep_hd_video')) {
			try {
				this.hd_video_handler = e => {
					e.stopImmediatePropagation();
				};
				document.addEventListener(
					'visibilitychange',
					this.hd_video_handler,
					true
				);
			} catch (err) {
				this.log.warn('Unable to install always HD document visibility hook.', err);
			}
		}
	}

	liveFollowing() {
		if (this.chat.context.get('smokemotes.auto_live_follow_page')) {
			try {
				document.querySelector('a[data-a-target="following-live-tab"]').click();
			} catch (error) {
				this.log.warn('Failed going to Live tab from Overview.', error);
			}
		}
	}

	onNotifyWindowFocus() {
		if (!document.hidden) {
			if (!this.cached_icon_link || !document.contains(this.cached_icon_link)) {
				this.cached_icon_link = document.querySelector('link[rel="icon"]');
			}
			if (this.cached_icon_link) {
				this.cached_icon_link.href = this.notify_icon_original;
			}
		}
	}

	checkExitViewerCard(close_button){
		if (close_button && this.settings.get('smokemotes.auto_exit_viewercard')) {
			close_button.click();
		}
	}

	/**
	 * Moderator Keybinds
	 */

	executeModAction(action, close_button) {
		const chatService = this.resolve('site.chat').ChatService.first;
		const duration = this.settings.get('smokemotes.mod_timeout_duration');

		switch (action) {
			case 'timeout':
				chatService.sendMessage(`/timeout ${this.ModCardData.user} ${duration}`);
				break;
			case 'delete':
				chatService.sendMessage(`/delete ${this.ModCardData.message_id}`);
				break;
			case 'ban':
				chatService.sendMessage(`/ban ${this.ModCardData.user}`);
				break;
			case 'purge':
				chatService.sendMessage(`/timeout ${this.ModCardData.user} 1`);
				break;
		}

		this.updateLogin();
		this.checkExitViewerCard(close_button);
		this.pending_mod_action = null;
		if (this.mod_action_timeout) {
			clearTimeout(this.mod_action_timeout);
			this.mod_action_timeout = null;
		}
	}

	onKeyDown(e) {
		// Cache chat input element
		if (!this.cached_chat_input || !document.contains(this.cached_chat_input)) {
			this.cached_chat_input = document.querySelector('div[data-a-target="chat-input"]');
		}

		if (
			document.activeElement == this.cached_chat_input ||
			e.ctrlKey ||
			e.metaKey ||
			e.shiftKey ||
			!this.ModCardData.user
		)
			return;

		// Cache close button
		if (!this.cached_close_button || !document.contains(this.cached_close_button)) {
			this.cached_close_button = document.querySelector('button[data-test-selector="close-viewer-card-button"]');
		}
		const close_button = this.cached_close_button;

		const keyCode = e.keyCode || e.which;
		const requireConfirm = this.settings.get('smokemotes.mod_confirm_actions');

		let action = null;
		switch (keyCode) {
			// timeout
			case 84:
				action = 'timeout';
				break;

			// delete message
			case 68:
				action = 'delete';
				break;

			// ban
			case 66:
				action = 'ban';
				break;

			// purge
			case 80:
				action = 'purge';
				break;

			// Esc key to close viewer card
			case 27:
				if (close_button) {
					close_button.click();
				}
				// Clear any pending action
				this.pending_mod_action = null;
				if (this.mod_action_timeout) {
					clearTimeout(this.mod_action_timeout);
					this.mod_action_timeout = null;
				}
				return;
		}

		if (!action) return;

		// If confirmation is disabled, execute immediately
		if (!requireConfirm) {
			this.executeModAction(action, close_button);
			return;
		}

		// If confirmation is enabled, check if this is a repeat press
		if (this.pending_mod_action === action) {
			// Second press - execute the action
			this.executeModAction(action, close_button);
		} else {
			// First press - set pending action and wait for confirmation
			this.pending_mod_action = action;

			// Clear previous timeout if exists
			if (this.mod_action_timeout) {
				clearTimeout(this.mod_action_timeout);
			}

			// Reset pending action after 2 seconds
			this.mod_action_timeout = setTimeout(() => {
				this.pending_mod_action = null;
				this.mod_action_timeout = null;
			}, 2000);
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
