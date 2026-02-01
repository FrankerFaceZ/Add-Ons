import { Core } from './core';
import { PRESETS } from './presets';

class CustomCommandsAutoComplete extends Addon {
	constructor(...args) {
		super(...args);

		this.inject('chat');
		this.inject('site');
		this.inject('settings');

		this.injectAs('core', Core);

		this.currentRoom = null;
		this.currentChannelLogin = null;

		this.registerSettings();

		this.on('chat:room-add', this.onRoomAdd, this);
		this.on('chat:room-remove', this.onRoomRemove, this);
	}

	registerSettings() {
		// Register Vue component
		this.settings.addUI('addon.custom-commands.bot-sources-editor', {
			path: 'Add-Ons > Custom Commands Auto Complete >> Source Ordering @{"sort": -1}',
			component: () => import(/* webpackChunkName: 'custom-commands' */ './bot-sources-editor.vue'),
			force_seen: true
		});

		// Hidden setting to store source order (default: all built-in presets enabled)
		this.settings.add('addon.custom-commands.source-order', {
			default: Object.keys(PRESETS)
			// Note: Don't reload on change - order change doesn't require re-fetch
		});

		// Hidden setting to track which sources are disabled (to preserve order)
		this.settings.add('addon.custom-commands.disabled-sources', {
			default: []
		});

		// General Settings
		this.settings.add('addon.custom-commands.enabled', {
			default: true,
			ui: {
				sort: 0,
				path: 'Add-Ons > Custom Commands Auto Complete >> General',
				title: 'Enable Custom Commands Auto Complete',
				description: 'Enable or disable the auto-completion of custom bot commands.',
				component: 'setting-check-box'
			},
			changed: enabled => {
				if (enabled && this.currentChannelLogin) {
					this.loadCurrentRoom();
				} else if (!enabled) {
					this.core.clearCommands();
				}
			}
		});

		this.settings.add('addon.custom-commands.completion-mode', {
			default: 'prefix',
			ui: {
				sort: 1,
				path: 'Add-Ons > Custom Commands Auto Complete >> General',
				title: 'Completion Mode',
				description: 'How commands appear in auto-completion.',
				component: 'setting-select-box',
				data: [
					{ value: 'prefix', title: 'Prefix (!ping or source-defined)' },
					{ value: 'slash', title: 'Slash (/ping)' },
					{ value: 'both', title: 'Both (prefix and /)' }
				]
			}
		});

		this.settings.add('addon.custom-commands.lazy-loading', {
			default: true,
			ui: {
				sort: 2,
				path: 'Add-Ons > Custom Commands Auto Complete >> General',
				title: 'Lazy Loading',
				description: 'Only fetch commands when you start typing. Reduces API calls.',
				component: 'setting-check-box'
			}
		});

		this.settings.add('addon.custom-commands.cache-duration', {
			default: 3600,
			ui: {
				sort: 3,
				path: 'Add-Ons > Custom Commands Auto Complete >> General',
				title: 'Cache Duration (seconds)',
				description: 'How long to cache commands. Set to 0 to disable.',
				component: 'setting-text-box',
				process: 'to_int'
			}
		});

		this.settings.add('addon.custom-commands.show-all-commands', {
			default: false,
			ui: {
				sort: 4,
				path: 'Add-Ons > Custom Commands Auto Complete >> General',
				title: 'Show All Commands',
				description: 'Show all commands regardless of permission level.',
				component: 'setting-check-box'
			}
		});

		// Custom Sources (managed via Source Ordering panel)
		this.settings.add('addon.custom-commands.custom-sources', {
			default: [],
			changed: () => this.reloadIfEnabled()
		});
	}

	onEnable() {
		this.log.info('Custom Commands Auto Complete enabled');
		this.loadExistingRooms();
	}

	onDisable() {
		this.core.clearCommands();
		this.currentRoom = null;
		this.currentChannelLogin = null;
		this.log.info('Custom Commands Auto Complete disabled');
	}

	loadExistingRooms() {
		for (const room of this.chat.iterateRooms()) {
			if (room) {
				this.onRoomAdd(room);
				break;
			}
		}
	}

	reloadIfEnabled() {
		if (this.settings.get('addon.custom-commands.enabled') && this.currentChannelLogin) {
			this.core.refreshCommands();
		}
	}

	loadCurrentRoom() {
		if (this.currentRoom) {
			this.core.loadCommandsForChannel(this.currentChannelLogin);
		}
	}

	async onRoomAdd(room) {
		if (!this.settings.get('addon.custom-commands.enabled')) return;

		this.currentRoom = room;
		this.currentChannelLogin = room.login;

		this.core.updateUserPermissionLevel();
		this.core.setCurrentChannel(room.login, room);

		if (!this.settings.get('addon.custom-commands.lazy-loading')) {
			await this.core.loadCommandsForChannel(room.login);
		}
	}

	onRoomRemove(room) {
		if (this.currentRoom === room) {
			this.core.clearCommands();
			this.currentRoom = null;
			this.currentChannelLogin = null;
		}
	}
}

CustomCommandsAutoComplete.register();
