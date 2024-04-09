export class Commands extends FrankerFaceZ.utilities.module.Module {
	constructor(...args) {
		super(...args);

		this.inject('chat');
		this.inject('settings');

		this.roomCommands = new Map();

		this.registerRoomCommands = this.registerRoomCommands.bind(this);
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
		try {
			const { commands } = await this.parent.api.commands.getChannelCommands(room.id);
			this.roomCommands.set(room.id, commands);
		} catch (err) {
			this.log.error(err);
		}
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