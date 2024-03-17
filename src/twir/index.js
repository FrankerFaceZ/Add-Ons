import { Api } from './api.js';

class Twir extends Addon {
	constructor(...args) {
		super(...args);

		this.inject(Api);

		this.inject('chat');
		this.inject('settings');

		this.roomCommands = new Map();

		this.settings.add('addon.twir.command_description', {
			default: true,
			ui: {
				path: 'Add-Ons > Twir >> Chat',
				title: 'Command description',
				description: 'Show command description or responses.',
				component: 'setting-check-box',
			}
		});
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
				const commands = this.getRoomCommands(room);
				if (commands) {
					event.commands.push(...commands);
				}
			}
		}
	}

	async registerRoomCommands(room) {
		const commandsResponse = await this.api.commands.getChannelCommands(room.id);
		if (!commandsResponse) return;
		this.roomCommands.set(room.id, commandsResponse.commands);
	}

	unregisterRoomCommands(room) {
		this.roomCommands.delete(room.id);
	}

	getRoomCommands(room) {
		const commands = this.roomCommands.get(room.id);
		if (!commands) return;

		const showCommandDescription = this.settings.get('addon.twir.command_description');

		return commands.map(command => {
			const description = command.description || command.responses.join(' | ');

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

Twir.register();
