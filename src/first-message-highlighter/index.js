class FirstMessageHighlight extends Addon {

	known_users = [];

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

		let outerThis = this;

		const MessageHighlighter = {
			type: 'message_highlighter',
			priority: 0,

			process(tokens, msg) {
				if (outerThis.known_users.includes(msg.user.userID)) return tokens;

				outerThis.known_users.push(msg.user.userID);

				this.applyHighlight(
					msg,
					this.settings.get('first_message_highlight.priority'),
					this.settings.get('first_message_highlight.highlight_color'),
					'first-message'
				);

				return tokens;
			}
		}

		this.chat.addTokenizer(MessageHighlighter);
	}

	onEnable() {
	}

	onDisable() {
		this.known_users = [];
	}
}

FirstMessageHighlight.register();
