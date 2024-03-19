import { Api } from './api.js';

class Twir extends Addon {
	constructor(...args) {
		super(...args);

		this.inject(Api);

		this.inject('chat');
		this.inject('chat.badges');
		this.inject('settings');

		this.roomCommands = new Map();

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
		this.on('chat:room-add', this.registerRoomCommands);
		this.on('chat:room-remove', this.unregisterRoomCommands);

		for (const room of this.chat.iterateRooms()) {
			if (room) {
				this.registerRoomCommands(room);
			}
		}

		this.on('chat:get-tab-commands', this.getTabCommands);
		this.settings.getChanges('addon.twir.user_badges', this.updateBadges, this);
	}

	onDisable() {
		this.off('chat:room-add', this.registerRoomCommands);
		this.off('chat:room-remove', this.unregisterRoomCommands);

		for (const roomId of this.roomCommands.keys()) {
			this.unregisterRoomCommands({ id: roomId });
		}

		this.unloadBadges();
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

	updateBadges(enabled) {
		if (enabled) {
			this.loadBadges();
		} else {
			this.unloadBadges();
		}
	}

	unloadBadges() {
		this.badges.removeBadge('addon.twir.badge_contributor');
		this.emit('chat:update-lines');
	}

	async loadBadges() {
		const showUserBadges = this.settings.get('addon.twir.user_badges');
		if (!showUserBadges) return;

		// twitchbot badge for TwirApp
		this.chat.getUser(870280719).addBadge('ffz', 2);

		this.badges.loadBadgeData('addon.twir.badge_contributor', {
			id: 'contributor',
			name: 'Twir Contributor',
			title: 'Twir Contributor',
			click_url: 'https://twir.app',
			image: 'https://raw.githubusercontent.com/twirapp/twir/main/libs/brand/src/logo.svg',
			slot: 100,
			svg: true,
		});

		try {
			const response = await fetch('https://raw.githubusercontent.com/twirapp/.github/main/contributors.json');
			if (!response.ok) return;

			const contributors = await response.json();
			for (const contributor of contributors) {
				const user = this.chat.getUser(contributor.id);
				user.addBadge('addon.twir', 'addon.twir.badge_contributor');
			}
		} catch (err) {
			this.log.error(err);
		}

		this.emit('chat:update-lines');
	}
}

Twir.register();
