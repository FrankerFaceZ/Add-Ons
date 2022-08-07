class EmoteLessChat extends Addon {

	constructor(...args) {
		super(...args);

		this.inject('chat');

		this.settings.add('emote_less_chat.enabled', {
			default: true,

			ui: {
				path: 'Add-Ons > Emote Less Chat >> Enabled',
				title: 'Enable filter',
				description: 'Removes every chat message, that only contains emotes',
				component: 'setting-check-box',
			},
		});

		this.messageFilter = {
			type: 'emote_less_chat',
			priority: 9,

			process(tokens, msg) {
				if (!this.context.get('emote_less_chat.enabled')) return tokens;

				let emoteOnly = true;
				for(const token of tokens) {
					if (token.type === 'emote') continue;
					if (token.type === 'text' && /^(\s|[^\x20-\x7E])+$/g.test(token.text)) {
						if (!/^\s+$/g.test(token.text)) this.log.debug(token.text);
						continue;
					}
					emoteOnly = false;
					break;
				}

				if(emoteOnly == false) return tokens;

				msg.ffz_removed = true;

				return tokens;
			}
		}
	}

	onEnable() {
		this.chat.addTokenizer(this.messageFilter);
		this.emit('chat:update-lines');
	}

	onDisable() {
		this.chat.removeTokenizer(this.messageFilter);
		this.emit('chat:update-lines');
	}
}

EmoteLessChat.register();
