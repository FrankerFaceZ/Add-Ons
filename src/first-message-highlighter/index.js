class FirstMessageHighlight extends Addon {

	known_users = new Set();

	constructor(...args) {
		super(...args);

		this.inject('chat');

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
						&& outerThis.remembersUser(msg)) return;

					if (this.settings.get('first_message_highlight.highlight_historical'))
						outerThis.highlightMessage(this, msg);
					return;
				}

				if(!outerThis.remembersUser(msg))
					outerThis.highlightMessage(this, msg);
			}
		}
	}

	onEnable() {
		if (ffz.site.getUser() !== null)
			this.known_users.add(ffz.site.getUser().id);
		this.chat.addTokenizer(this.messageHighlighter);
		this.emit('chat:update-lines');
	}

	onDisable() {
		this.chat.removeTokenizer(this.messageHighlighter);
		this.known_users.clear();
		this.emit('chat:update-lines');
	}

	remembersUser(msg) {
		if (msg.fh_known_user == null)
			msg.fh_known_user = this.known_users.has(msg.user.userID);

		if (msg.fh_known_user) return true;

		this.known_users.add(msg.user.userID);
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
