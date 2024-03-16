// identify commands of Twir
const ZWE_SYMBOL = '​';

class Twir extends Addon {
	tabCommands = []

	constructor(...args) {
		super(...args);

		this.inject('site');
		this.inject('chat');
	}

	async fetchRoomCommands(room) {
		try {
			const response = await fetch(
				'https://twir.app/api/v1/api.UnProtected/GetChannelCommands',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ channelId: room.id }),
				}
			);

			const { commands } = await response.json();
			return commands;
		} catch (err) {
			this.log.error(err);
			return [];
		}
	}

	onEnable() {
		this.on('chat:room-add', this.registerRoomCommands);
		this.on('chat:room-remove', this.unregisterRoomCommands);

		for (const room of this.chat.iterateRooms()) {
			if (room) {
				this.registerRoomCommands(room);
			}
		}

		this.on('chat:pre-send-message', this.preSendMessage);

		this.on('chat:get-tab-commands', event => {
			event.commands.push(...this.tabCommands);
		})
	}

	onDisable() {
		this.unregisterRoomCommands();
	}

	async registerRoomCommands(room) {
		const roomCommands = await this.fetchRoomCommands(room);
		if (!roomCommands.length) return;

		this.tabCommands = roomCommands.map(command => {
			const description = command.description
				|| command.responses.length > 0
				? command.responses[0]
				: '';

			return {
				name: ZWE_SYMBOL + command.name,
				description,
				// parse `command.permisions`
				permissionLevel: 0,
				ffz_group: `Twir (${command.module})`,
			}
		})
	}

	unregisterRoomCommands() {
		this.tabCommands = [];
	}

	preSendMessage(event) {
		const message = event.message.trim();
		if (message.startsWith('!')) return;

		if (message.startsWith('/') && message.includes(ZWE_SYMBOL)) {
			const command = message.replace(ZWE_SYMBOL, '').slice(1);
			if (!command) return;
			event.message = `!${command}`;
		}
	}
}

Twir.register();
