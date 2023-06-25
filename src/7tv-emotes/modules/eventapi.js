export default class EventAPI extends FrankerFaceZ.utilities.module.Module {
	constructor(...args) {
		super(...args);

		this.inject('..api');
		this.inject('..emotes');

		this.inject('settings');
		this.inject('chat');
		this.injectAs('siteChat', 'site.chat');

		this.settings.add('addon.seventv_emotes.emote_updates', {
			default: true,
			ui: {
				path: 'Add-Ons > 7TV Emotes >> Emotes > Live Emote Updates',
				title: 'Enable emote updates',
				description: 'Enables live updates when a 7TV emote is added or removed in the current channel.',
				component: 'setting-check-box',
			}
		});

		this.settings.add('addon.seventv_emotes.update_messages', {
			default: true,
			ui: {
				path: 'Add-Ons > 7TV Emotes >> Emotes > Live Emote Updates',
				title: 'Show update messages',
				description: 'Show messages in chat when emotes are updated in the current channel.',
				component: 'setting-check-box',
			}
		});
	}

	onEnable() {
		this.on('settings:changed:addon.seventv_emotes.channel_emotes', () => this.updateEventSource());
		this.on('settings:changed:addon.seventv_emotes.emote_updates', () => this.updateEventSource());

		this.on('chat:room-add', () => this.updateEventSource());
		this.on('chat:room-remove', () => this.updateEventSource());

		this.updateEventSource();
	}

	async updateEventSource() {
		this.closeEventSource();

		if (this.settings.get('addon.seventv_emotes.emote_updates') && this.settings.get('addon.seventv_emotes.channel_emotes')) {
			const channelIds = [];
			for (let channel of this.chat.iterateRooms()) channelIds.push(channel.id);

			if (channelIds.length > 0) {
				const eventSourceUrl = await this.api.getEmotesEventSourceURL(channelIds);
				this.eventSource = new EventSource(eventSourceUrl);

				this.eventSource.addEventListener('open', () => this.eventSourceReconnectDelay = undefined);

				this.eventSource.addEventListener('dispatch', event => this.handleChannelEmoteUpdate(event));

				this.eventSource.addEventListener('error', () => {
					if (this.eventSource.readyState == EventSource.CLOSED) {
						this.closeEventSource();

						if (!this.eventSourceReconnectDelay) this.eventSourceReconnectDelay = 5000;

						this.eventSourceReconnectTimeout = setTimeout(() => {
							this.eventSourceReconnectTimeout = undefined;
							this.updateEventSource();
						}, this.eventSourceReconnectDelay);

						this.eventSourceReconnectDelay *= 2 + Math.random() * 0.2;
					}
				});
			}
		}
	}

	closeEventSource() {
		if (this.eventSource) this.eventSource.close();
		if (this.eventSourceReconnectTimeout) clearTimeout(this.eventSourceReconnectTimeout);
		this.eventSource = null;
		this.eventSourceReconnectTimeout = undefined;
	}

	handleChannelEmoteUpdate(event) {
		if (!this.settings.get('addon.seventv_emotes.channel_emotes')) return;

		let data = JSON.parse(event.data);

		let channel;
		for (const room of this.chat.iterateRooms()) {
			if (room) {
				channel = room;
				break;
			}
		}

		if (channel) {
			let action;
			let dataType;
			let completed = false;

			if (data.body.pushed) {
				dataType = 'pushed';
				action = 'ADD';
			} else if (data.body.pulled) {
				dataType = 'pulled';
				action = 'REMOVE';
			} else if (data.body.updated) {
				dataType = 'updated';
				action = 'UPDATE';
			}

			for (const emote of data.body[dataType]) {
				if (emote.key !== 'emotes') continue;

				const emoteId = emote.value?.id ?? emote.old_value.id;
				const oldEmote = this.emotes.getEmoteFromChannelSet(channel, emoteId);

				switch (action) {
					case 'UPDATE':
						if (!oldEmote) break;
					case 'ADD':
						completed = this.emotes.addEmoteToChannelSet(channel, emote.value);
						break;
					case 'REMOVE':
						completed = this.emotes.removeEmoteFromChannelSet(channel, emoteId);
						break;
				}

				if (completed && this.settings.get('addon.seventv_emotes.update_messages')) {
					let message = `[7TV] ${data.body.actor.display_name} `;
					switch (action) {
						case 'ADD': {
							message += `added the emote '${emote.value.name}'`;
							break;
						}
						case 'REMOVE': {
							message += `removed the emote '${emote.old_value.name}'`;
							break;
						}
						case 'UPDATE': {
							if (oldEmote?.name !== emote.value.name) {
								message += `renamed the emote '${oldEmote.name}' to '${emote.value.name}'`;
							} else {
								message += `updated the emote '${emote.value.name}'`;
							}
							break;
						}
					}
					this.siteChat.addNotice(channel.login, message);
				}
			}
		}
	}
}