class FirstMessageHighlight extends Addon {

	known_users = new Map();

	constructor(...args) {
		super(...args);

		this.inject('chat');
		this.inject('site');

		this.settings.add('first_message_highlight.enabled', {
			default: true,
			ui: {
				path: 'Add-Ons > First Message Highlight >> Current Session >> Settings @{"sort": -1}',
				title: 'Highlight first messages',
				description: 'Highlight first messages from users for this session.',
				component: 'setting-check-box',
				sort: -1
			}
		});

		this.settings.add('first_message_highlight.only_moderated_channels', {
			default: false,
			ui: {
				path: 'Add-Ons > First Message Highlight >> Current Session >> Settings',
				title: 'Highlight only when moderating',
				description: 'Only highlight messages in chats where you are a moderator.',
				component: 'setting-check-box',
				sort: -1
			}
		});

		this.settings.add('first_message_highlight.forget_user_after', {
			default: 0,
			ui: {
				path: 'Add-Ons > First Message Highlight >> Current Session >> Settings',
				title: 'Forget User After',
				description: 'Forget a user after a specified amount of time so they can be highlighted again.',
				component: 'setting-select-box',
				data: [
					{ value: 0, title: 'Disabled' },
					{ value: 1000 * 60 * 5, title: '5 Minutes' },
					{ value: 1000 * 60 * 15, title: '15 Minutes' },
					{ value: 1000 * 60 * 30, title: '30 Minutes' },
					{ value: 1000 * 60 * 60, title: '60 Minutes' },
					{ value: 1000 * 60 * 60 * 2, title: '2 Hours' },
					{ value: 1000 * 60 * 60 * 3, title: '3 Hours' },
				],
			}
		});

		this.settings.add('first_message_highlight.highlight_color', {
			default: '#3C1A1A',
			ui: {
				path: 'Add-Ons > First Message Highlight >> Current Session >> Highlights',
				title: 'Highlight Color',
				description: 'Highlight color to add to the message',
				component: 'setting-color-box'
			}
		});

		this.settings.add('first_message_highlight.priority', {
			default: 0,
			ui: {
				path: 'Add-Ons > First Message Highlight >> Current Session >> Highlights',
				title: 'Highlight Priority',
				description: 'Priority of the highlight',
				component: 'setting-text-box',
				type: 'number',
				process: 'to_int'
			}
		});

		this.settings.add('first_message_highlight.highlight_historical', {
			default: true,
			ui: {
				path: 'Add-Ons > First Message Highlight >> Current Session >> Historical Messages',
				title: 'Highlight logged historical messages',
				description: 'Highlight messages from before you joined the chat.',
				component: 'setting-check-box'
			}
		});

		this.settings.add('first_message_highlight.remember_historical', {
			default: true,
			ui: {
				path: 'Add-Ons > First Message Highlight >> Current Session >> Historical Messages',
				title: 'Remember historical messages',
				description: 'Remember logged user messages from before you joined the chat.',
				component: 'setting-check-box'
			}
		});

		// First Time Chatter
		this.settings.add('first_message_highlight.first_time_chatter', {
			default: false,
			ui: {
				path: 'Add-Ons > First Message Highlight >> First Time Chatter @{"sort": 10}',
				title: 'Highlight first time chatters',
				description: 'Highlight messages from first time chatters.',
				component: 'setting-check-box',
				sort: -1
			}
		});

		this.settings.add('first_message_highlight.first_time_chatter_only_moderated_channels', {
			default: false,
			ui: {
				path: 'Add-Ons > First Message Highlight >> First Time Chatter',
				title: 'Highlight only when moderating',
				description: 'Only highlight messages in chats where you are a moderator.',
				component: 'setting-check-box',
				sort: -1
			}
		});

		this.settings.add('first_message_highlight.first_time_chatter_color', {
			default: '#C832C866',
			ui: {
				path: 'Add-Ons > First Message Highlight >> First Time Chatter',
				title: 'Highlight Color',
				component: 'setting-color-box'
			}
		});

		this.settings.add('first_message_highlight.first_time_chatter_priority', {
			default: 0,
			ui: {
				path: 'Add-Ons > First Message Highlight >> First Time Chatter',
				title: 'Highlight Priority',
				description: 'Priority of the highlight',
				component: 'setting-text-box',
				type: 'number',
				process: 'to_int'
			}
		});

		// Returning Chatter
		this.settings.add('first_message_highlight.returning_chatter', {
			default: false,
			ui: {
				path: 'Add-Ons > First Message Highlight >> Returning Chatter @{"sort": 11}',
				title: 'Highlight returning chatters',
				description: 'Highlight messages from returning chatters.',
				component: 'setting-check-box',
				sort: -1
			}
		});

		this.settings.add('first_message_highlight.returning_chatter_only_moderated_channels', {
			default: false,
			ui: {
				path: 'Add-Ons > First Message Highlight >> Returning Chatter',
				title: 'Highlight only when moderating',
				description: 'Only highlight messages in chats where you are a moderator.',
				component: 'setting-check-box',
				sort: -1
			}
		});

		this.settings.add('first_message_highlight.returning_chatter_color', {
			default: '#3296E666',
			ui: {
				path: 'Add-Ons > First Message Highlight >> Returning Chatter',
				title: 'Highlight Color',
				component: 'setting-color-box'
			}
		});

		this.settings.add('first_message_highlight.returning_chatter_priority', {
			default: 0,
			ui: {
				path: 'Add-Ons > First Message Highlight >> Returning Chatter',
				title: 'Highlight Priority',
				description: 'Priority of the highlight',
				component: 'setting-text-box',
				type: 'number',
				process: 'to_int'
			}
		});

		this.chat.addHighlightReason('first-message', 'First message from a user during this session');
		this.chat.addHighlightReason('first-time-chatter', 'First messages from a user new to the channel');
		this.chat.addHighlightReason('returning-chatter', 'First messages from a user returning to the channel');

		const outerThis = this;
		this.messageHighlighter = {
			type: 'message_highlighter',
			priority: 0,

			process(tokens, msg) {
				// First Time Chatter
				outerThis.highlightFirstTimeChatter(this, msg);

				// Returning Chatter
				outerThis.highlightReturningChatter(this, msg);

				// First Message
				outerThis.highlightMessage(this, msg);
			}
		}
	}

	onEnable() {
		this.on('settings:changed:first_message_highlight.forget_user_after', this.clearChatLines, this);

		this.chat.addTokenizer(this.messageHighlighter);
		this.emit('chat:update-lines');
	}

	onDisable() {
		this.chat.removeTokenizer(this.messageHighlighter);
		this.known_users.clear();
		this.emit('chat:update-lines');
	}

	clearChatLines() {
		for(const { message } of this.chat.iterateMessages()) {
			message.first_highlight = null;
		}

		this.known_users.clear();

		this.emit('chat:update-lines');
	}

	shouldHighlight(msg) {
		// If we have a cached value, return it.
		if (msg.first_highlight != null)
			return msg.first_highlight;

		// Don't highlight messages without a user, or with the local user
		if (!msg.user?.userID || msg.user.userID == this.site.getUser()?.id)
			return false;

		// Get the last timestamp for this user
		const last_ts = this.known_users.get(msg.user.userID) ?? 0;

		// If the last timestamp is in the past...
		if (last_ts < msg.timestamp) {
			// Save this timestamp as the new last timestamp
			this.known_users.set(msg.user.userID, msg.timestamp);

			// How long should we remember a user?
			const forget_user_after = this.settings.get('first_message_highlight.forget_user_after');

			// We highlight the message if one of the following is true:
			// 1. last_ts is unset (so zero)
			// 2. forgot_user_after is NOT zero and last_ts is more than that much time in the past
			if (last_ts === 0 || (forget_user_after !== 0 && msg.timestamp - last_ts >= forget_user_after)) {
				msg.first_highlight = true;
				return true;
			}
		}

		// If we got here, this is not a new message to highlight.
		msg.first_highlight = false;
		return false;
	}

	highlightMessage(ctx, msg) {
		if (!this.settings.get('first_message_highlight.enabled')) return;

		if (this.settings.get('first_message_highlight.only_moderated_channels')) {
			if (!this.chat.context.get('context.moderator'))
				return;
		}

		const shouldHighlight = this.shouldHighlight(msg);

		if (msg.isHistorical) {
			if (this.settings.get('first_message_highlight.remember_historical')
				&& !shouldHighlight) return;

			if (!this.settings.get('first_message_highlight.highlight_historical'))
				return;
		}

		if (!shouldHighlight) return;

		ctx.applyHighlight(
			msg,
			this.settings.get('first_message_highlight.priority'),
			this.settings.get('first_message_highlight.highlight_color'),
			'first-message'
		);
	}

	highlightFirstTimeChatter(ctx, msg) {
		if (!this.chat.context.get('first_message_highlight.first_time_chatter')) return;

		if (this.settings.get('first_message_highlight.first_time_chatter_only_moderated_channels')) {
			if (!this.chat.context.get('context.moderator'))
				return;
		}

		if (!msg.ffz_first_msg) return;

		ctx.applyHighlight(
			msg,
			this.settings.get('first_message_highlight.first_time_chatter_priority'),
			this.settings.get('first_message_highlight.first_time_chatter_color'),
			'first-time-chatter'
		);
	}

	highlightReturningChatter(ctx, msg) {
		if (!this.chat.context.get('first_message_highlight.returning_chatter')) return;

		if (this.settings.get('first_message_highlight.returning_chatter_only_moderated_channels')) {
			if (!this.chat.context.get('context.moderator'))
				return;
		}

		if (!msg.ffz_returning) return;

		ctx.applyHighlight(
			msg,
			this.settings.get('first_message_highlight.returning_chatter_priority'),
			this.settings.get('first_message_highlight.returning_chatter_color'),
			'returning-chatter'
		);
	}
}

FirstMessageHighlight.register();
