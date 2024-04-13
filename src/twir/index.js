import { Api } from './api.js';
import { Badges } from './badges.js';
import { Commands } from './commands.js';

class Twir extends Addon {
	constructor(...args) {
		super(...args);

		this.inject(Api);
		this.inject(Badges);
		this.inject(Commands);

		this.inject('chat');
		this.inject('settings');

		this.settings.add('addon.twir.command_description', {
			default: true,
			ui: {
				path: 'Add-Ons > Twir >> Commands',
				title: 'Description',
				description: 'Show command description or responses.',
				component: 'setting-check-box',
			}
		});

		this.settings.add('addon.twir.user_badges', {
			default: true,
			ui: {
				path: 'Add-Ons > Twir >> User Cosmetics',
				title: 'Badges',
				description: 'Show user badges.\n\n(Per-badge visibilty can be set in [Chat >> Badges > Visibilty > Add-Ons](~chat.badges.tabs.visibility))',
				component: 'setting-check-box',
			}
		});
	}

	onEnable() {
		this.on('chat:room-add', this.commands.registerRoomCommands);
		this.on('chat:room-remove', this.commands.unregisterRoomCommands);

		for (const room of this.chat.iterateRooms()) {
			if (room) {
				this.commands.registerRoomCommands(room);
			}
		}

		this.on('chat:get-tab-commands', this.commands.getTabCommands);
		this.settings.getChanges('addon.twir.user_badges', this.badges.updateBadges);
	}

	onDisable() {
		this.off('chat:room-add', this.commands.registerRoomCommands);
		this.off('chat:room-remove', this.commands.unregisterRoomCommands);

		for (const roomId of this.roomCommands.keys()) {
			this.commands.unregisterRoomCommands({ id: roomId });
		}

		this.badges.unloadBadges();
	}
}

Twir.register();
