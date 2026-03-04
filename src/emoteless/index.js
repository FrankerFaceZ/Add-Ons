const NON_PRINTABLE = /^(\s|[^\x20-\x7E])+$/;

class EmoteLessChat extends Addon {

	constructor(...args) {
		super(...args);

		this.inject('chat');
		this.emoteTimestamps = {};

		this.settings.add('emote_less_chat.enabled', {
			default: true,
			ui: {
				sort: 0,
				path: 'Add-Ons > Emote-Spam Filter >> Settings',
				title: 'Enable filter',
				description: 'Hide chat messages that consist entirely of emotes',
				component: 'setting-check-box',
			},
		});

		this.settings.add('emote_less_chat.channel_mode', {
			default: 0,
			ui: {
				sort: 1,
				path: 'Add-Ons > Emote-Spam Filter >> Settings',
				title: 'Mode',
				component: 'setting-select-box',
				data: [
					{ value: 0, title: 'All channels' },
					{ value: 1, title: 'Only listed channels' },
					{ value: 2, title: 'All except listed channels' },
				],
			},
		});

		this.settings.add('emote_less_chat.channels', {
			default: '',
			ui: {
				sort: 2,
				path: 'Add-Ons > Emote-Spam Filter >> Settings',
				title: 'Channel list',
				description: 'Comma-separated channel names (e.g. channel1, channel2)',
				component: 'setting-text-box',
			},
		});

		this.settings.add('emote_less_chat.skip_emote_only_mode', {
			default: true,
			ui: {
				sort: 3,
				path: 'Add-Ons > Emote-Spam Filter >> Settings',
				title: 'Disable filter in emote-only mode',
				component: 'setting-check-box',
			},
		});

		this.settings.add('emote_less_chat.use_threshold', {
			default: true,
			ui: {
				sort: 0,
				path: 'Add-Ons > Emote-Spam Filter >> Spam Threshold',
				title: 'Enable threshold-based filter',
				description: 'Only hide emote-only messages when they exceed a rate limit. Allows occasional emote reactions through. Overrides "Disable filter in emote-only mode".',
				component: 'setting-check-box',
			},
		});

		this.settings.add('emote_less_chat.threshold_count', {
			default: 3,
			ui: {
				sort: 1,
				path: 'Add-Ons > Emote-Spam Filter >> Spam Threshold',
				title: 'Message count',
				description: 'Number of emote-only messages needed to trigger filtering',
				component: 'setting-text-box',
				process: 'to_int',
				bounds: [1, 1000],
			},
		});

		this.settings.add('emote_less_chat.threshold_window', {
			default: 30,
			ui: {
				sort: 2,
				path: 'Add-Ons > Emote-Spam Filter >> Spam Threshold',
				title: 'Time window (seconds)',
				description: 'Sliding window in which messages are counted',
				component: 'setting-text-box',
				process: 'to_int',
				bounds: [1, 600],
			},
		});

		const self = this;
		this.messageFilter = {
			type: 'emote_less_chat',
			priority: 9,

			process(tokens, msg) {
				if (!this.context.get('emote_less_chat.enabled') || !tokens.length)
					return tokens;

				const useThreshold = this.context.get('emote_less_chat.use_threshold');

				if (!useThreshold && this.context.get('emote_less_chat.skip_emote_only_mode')) {
					const chatState = self.chat.context.get('context.chat_state');
					if (chatState && chatState.emoteOnly) return tokens;
				}

				const room = self.getRoomName(msg);

				if (!self.shouldFilterChannel(this, room)) return tokens;
				if (!self.isEmoteOnly(tokens)) return tokens;
				if (useThreshold && !self.exceedsThreshold(this, room)) return tokens;

				msg.ffz_removed = true;
				return tokens;
			}
		}
	}

	getRoomName(msg) {
		return (msg.roomLogin || (msg.channel ? msg.channel.replace(/^#/, '') : '')).trim().toLowerCase();
	}

	isEmoteOnly(tokens) {
		for (const token of tokens) {
			if (token.type === 'emote') continue;
			if (token.type === 'text' && NON_PRINTABLE.test(token.text)) continue;
			return false;
		}
		return true;
	}

	shouldFilterChannel(ctx, room) {
		const mode = parseInt(ctx.context.get('emote_less_chat.channel_mode'), 10);
		if (mode === 0) return true;

		const channels = String(ctx.context.get('emote_less_chat.channels'))
			.trim().toLowerCase().split(',')
			.map(c => c.trim()).filter(c => c);

		if (mode === 1) return channels.includes(room);
		if (mode === 2) return !channels.includes(room);
		return true;
	}

	exceedsThreshold(ctx, room) {
		const now = Date.now();
		const windowMs = ctx.context.get('emote_less_chat.threshold_window') * 1000;
		const limit = ctx.context.get('emote_less_chat.threshold_count');

		if (!this.emoteTimestamps[room])
			this.emoteTimestamps[room] = [];

		const timestamps = this.emoteTimestamps[room];
		timestamps.push(now);

		while (timestamps.length && timestamps[0] <= now - windowMs)
			timestamps.shift();

		return timestamps.length >= limit;
	}

	onEnable() {
		this.chat.addTokenizer(this.messageFilter);
		this.emit('chat:update-lines');
	}

	onDisable() {
		this.emoteTimestamps = {};
		this.chat.removeTokenizer(this.messageFilter);
		this.emit('chat:update-lines');
	}
}

EmoteLessChat.register();
