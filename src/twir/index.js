import { Api } from './api.js';

class Twir extends Addon {
	roomCommands = new Map();

	constructor(...args) {
		super(...args);

		this.inject(Api);
		this.inject('chat');
	}

	onEnable() {
		this.on('chat:room-add', this.registerRoomCommands);
		this.on('chat:room-remove', this.unregisterRoomCommands);

		for (const room of this.chat.iterateRooms()) {
			if (room) {
				this.registerRoomCommands(room);
			}
		}

		this.on('chat:get-tab-commands', this.getTabCommands);
	}

	onDisable() {
		this.off('chat:room-add', this.registerRoomCommands);
		this.off('chat:room-remove', this.unregisterRoomCommands);

		for (const roomId of this.roomCommands.keys()) {
			this.unregisterRoomCommands({ id: roomId });
		}

		this.off('chat:get-tab-commands', this.getTabCommands);
	}

	getTabCommands(event) {
		for (const room of this.chat.iterateRooms()) {
			if (room) {
				const commands = this.roomCommands.get(room.id);
				if (commands) {
					event.commands.push(...commands);
				}
			}
		}
	}

	async registerRoomCommands(room) {
		const commandsResponse = await this.api.commands.getChannelCommands(room.id);
		if (!commandsResponse) return;

		const commands = commandsResponse.commands.map(command => {
			const description = command.description || command.responses.join(' | ');

			return {
				prefix: '!',
				name: command.name,
				description,
				permissionLevel: 0,
				ffz_group: `Twir (${command.group ?? command.module})`,
			}
		})

		this.roomCommands.set(room.id, commands);
	}

	unregisterRoomCommands(room) {
		this.roomCommands.delete(room.id);
	}
}

Twir.register();
