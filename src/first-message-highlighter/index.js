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

		this.settings.add('first_message_highlight.ignore_historical', {
			default: false,
			ui: {
				path: 'Add-Ons > First Message Highlight >> Settings',
				title: 'Ignore historical messages',
				description: 'Do not highlight messages from before you joined the chat, but still remember the users.',
				component: 'setting-check-box'
			}
		});

		this.chat.addHighlightReason('first-message', "User's first message during this session");

		const outerThis = this;

		this.messageHighlighter = {
			type: 'message_highlighter',
			priority: 0,

			process(tokens, msg) {
				if (msg.fh_known_user == null)
					msg.fh_known_user = outerThis.known_users.has(msg.user.userID);

				if (msg.fh_known_user) return;

				outerThis.known_users.add(msg.user.userID);

				if (msg.isHistorical
					&& this.settings.get('first_message_highlight.ignore_historical')) return;

				this.applyHighlight(
					msg,
					this.settings.get('first_message_highlight.priority'),
					this.settings.get('first_message_highlight.highlight_color'),
					'first-message'
				);

				return;
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
}

FirstMessageHighlight.register();
