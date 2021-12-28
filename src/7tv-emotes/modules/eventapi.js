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

	updateEventSource() {
		this.closeEventSource();

		if (this.settings.get('addon.seventv_emotes.emote_updates') && this.settings.get('addon.seventv_emotes.channel_emotes')) {
			const channelLogins = [];
			for (let channel of this.chat.iterateRooms()) channelLogins.push(channel.login);

			if (channelLogins.length > 0) {
				this.eventSource = new EventSource(this.api.getEmotesEventSourceURL(channelLogins));

				this.eventSource.addEventListener('open', () => this.eventSourceReconnectDelay = undefined);

				this.eventSource.addEventListener('update', event => this.handleChannelEmoteUpdate(event));

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
			if (room.login == data.channel) {
				channel = room;
				break;
			}
		}

		if (channel) {
			const oldEmote = this.emotes.getEmoteFromChannelSet(channel, data.emote_id);

			let completed = false;
			switch (data.action) {
				case 'UPDATE':
					if (!oldEmote) break;
				case 'ADD':
					completed = this.emotes.addEmoteToChannelSet(channel, {...data.emote, id: data.emote_id, name: data.name});
					break;
				case 'REMOVE':
					completed = this.emotes.removeEmoteFromChannelSet(channel, data.emote_id);
					break;
			}

			if (completed && this.settings.get('addon.seventv_emotes.update_messages')) {
				let message = `[7TV] ${data.actor} `;
				switch (data.action) {
					case 'ADD': {
						message += `added the emote '${data.name}'`;
						break;
					}
					case 'REMOVE': {
						message += `removed the emote '${data.name}'`;
						break;
					}
					case 'UPDATE': {
						if (oldEmote && oldEmote.name != data.name) {
							message += `renamed the emote '${oldEmote.name}' to '${data.name}'`;
						}
						else {
							message += `updated the emote '${data.name}'`;
						}
						break;
					}
				}
				this.siteChat.addNotice(channel.login, message);
			}
		}
	}
}