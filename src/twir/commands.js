import { SETTING_KEYS } from './settings.js';

export class Commands extends FrankerFaceZ.utilities.module.Module {
	constructor(...args) {
		super(...args);

		this.inject('chat');
		this.inject('settings');

		this.roomCommands = new Map();
	}

	onEnable() {
		this.on('chat:room-add', this.registerRoomCommands, this);
		this.on('chat:room-remove', this.unregisterRoomCommands, this);

		for (const room of this.chat.iterateRooms()) {
			if (room) {
				this.registerRoomCommands(room);
			}
		}

		this.on('chat:get-tab-commands', this.getTabCommands, this);
	}

	onDisable() {
		this.off('chat:room-add', this.registerRoomCommands, this);
		this.off('chat:room-remove', this.unregisterRoomCommands, this);

		for (const roomId of this.roomCommands.keys()) {
			this.unregisterRoomCommands({ id: roomId });
		}

		this.off('chat:get-tab-commands', this.getTabCommands, this);
	}

	getTabCommands(event) {
		for (const room of this.chat.iterateRooms()) {
			if (room) {
				const commands = this.getRoomCommands(room);
				if (commands) {
					event.commands.push(...commands);
				}
			}
		}
	}

	async registerRoomCommands(room) {
		const commands = await this.parent.twir_api.commands.getChannelCommands(room.id);
		this.roomCommands.set(room.id, commands);
	}

	unregisterRoomCommands(room) {
		this.roomCommands.delete(room.id);
	}

	getRoomCommands(room) {
		const commands = this.roomCommands.get(room.id);
		if (!commands) return;

		const showCommandDescription = this.settings.get(SETTING_KEYS.commandDescription);

		return commands.map(command => {
			const description = command.description || command.responses?.map(response => response.text).join(' | ');

			return {
				prefix: '!',
				name: command.name,
				description: showCommandDescription ? description : '',
				permissionLevel: 0,
				ffz_group: `Twir (${command.group ?? command.module})`,
			}
		})
	}
}
