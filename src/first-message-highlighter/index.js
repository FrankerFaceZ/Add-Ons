class FirstMessageHighlight extends Addon {

	known_users = new Map();

	constructor(...args) {
		super(...args);

		this.inject('chat');
		this.inject('site');

		this.settings.add('first_message_highlight.priority', {
			default: 0,
			ui: {
				path: 'Add-Ons > First Message Highlight >> Highlights',
				title: 'Highlight Priority',
				description: 'Priority of the highlight',
				component: 'setting-text-box',
				type: 'number',
				process: 'to_int'
			}
		});

		this.settings.add('first_message_highlight.highlight_color', {
			default: '#3C1A1A',
			ui: {
				path: 'Add-Ons > First Message Highlight >> Highlights',
				title: 'Highlight Color',
				description: 'Highlight color to add to the message',
				component: 'setting-color-box'
			}
		});

		this.settings.add('first_message_highlight.remember_historical', {
			default: true,
			ui: {
				path: 'Add-Ons > First Message Highlight >> Historical Messages',
				title: 'Remember historical messages',
				description: 'Remember logged user messages from before you joined the chat.',
				component: 'setting-check-box'
			}
		});

		this.settings.add('first_message_highlight.highlight_historical', {
			default: true,
			ui: {
				path: 'Add-Ons > First Message Highlight >> Historical Messages',
				title: 'Highlight logged historical messages',
				description: 'Highlight messages from before you joined the chat.',
				component: 'setting-check-box'
			}
		});

		this.settings.add('first_message_highlight.only_moderated_channels', {
			default: false,
			ui: {
				path: 'Add-Ons > First Message Highlight >> Settings',
				title: 'Highlight only when moderating',
				description: 'Only highlight messages in chats where you are a moderator.',
				component: 'setting-check-box'
			}
		});

		this.settings.add('first_message_highlight.forget_user_after', {
			default: 0,
			ui: {
				path: 'Add-Ons > First Message Highlight >> Settings',
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

		this.chat.addHighlightReason('first-message', "User's first message during this session");

		const outerThis = this;
		this.messageHighlighter = {
			type: 'message_highlighter',
			priority: 0,

			process(tokens, msg) {
				if (!outerThis.chat.context.get('context.moderator') 
					&& this.settings.get('first_message_highlight.only_moderated_channels')) return;
				
				if (msg.isHistorical) {
					if (this.settings.get('first_message_highlight.remember_historical')
						&& !outerThis.shouldHighlight(msg)) return;

					if (this.settings.get('first_message_highlight.highlight_historical'))
						outerThis.highlightMessage(this, msg);
					return;
				}

				if(outerThis.shouldHighlight(msg))
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
		ctx.applyHighlight(
			msg,
			this.settings.get('first_message_highlight.priority'),
			this.settings.get('first_message_highlight.highlight_color'),
			'first-message'
		);
	}
}

FirstMessageHighlight.register();
