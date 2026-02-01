/**
 * Core Module
 *
 * Main orchestration for custom bot command auto-completion.
 * Coordinates between sources, fetching, and FFZ's tab-completion system.
 */

import { truncateDescription, sortBySourceOrder } from './utils';
import { fetchFromSource, fetchWithTimeout } from './fetcher';
import { getEnabledSources, filterApplicableSources } from './sources';

export class Core extends FrankerFaceZ.utilities.module.Module {
	constructor(...args) {
		super(...args);

		this.inject('chat');
		this.inject('settings');

		this.commandsByKey = {};
		this.lastFetchTime = null;
		this.currentChannel = null;
		this.currentRoom = null;
		this.isLoading = false;
		this.hasLoadedForChannel = false;
		this.loadingPromise = null;
		this.userPermissionLevel = 0;
	}

	onEnable() {
		this.on('chat:get-tab-commands', this.getTabCommands, this);
		this.on('chat:pre-send-message', this.handlePreSendMessage, this);

		this.settings.on('changed:addon.custom-commands.source-order', this.refreshCommands, this);
		this.settings.on('changed:addon.custom-commands.custom-sources', this.refreshCommands, this);
	}

	onDisable() {
		this.off('chat:get-tab-commands', this.getTabCommands, this);
		this.off('chat:pre-send-message', this.handlePreSendMessage, this);
		this.settings.off('changed:addon.custom-commands.source-order', this.refreshCommands, this);
		this.settings.off('changed:addon.custom-commands.custom-sources', this.refreshCommands, this);
		this.clearCommands();
	}

	handlePreSendMessage(e) {
		if (!this.settings.get('addon.custom-commands.enabled')) return;

		// Handle add-on built-in command to force refresh commands
		if (e.message.trim() === '/ccac-refresh') {
			e.preventDefault();
			this.refreshCommands();
			return;
		}

		// Handle prefix replacement for bot commands typed with /
		const mode = this.settings.get('addon.custom-commands.completion-mode');
		if (mode === 'slash' || mode === 'both') {
			const message = e.message.trim();
			if (message.startsWith('/')) {
				const parts = message.substring(1).split(' ');
				const commandName = parts[0];

				// Search through all commands to find if this is a bot command
				for (const commands of Object.values(this.commandsByKey)) {
					for (const cmd of commands) {
						if (cmd.name === commandName || (cmd.aliases && cmd.aliases.includes(commandName))) {
							// Found it! Replace / with the source prefix
							const sourcePrefix = cmd.sourcePrefix || '!';
							e.message = sourcePrefix + message.substring(1);
							return;
						}
					}
				}
			}
		}
	}

	/**
	 * Provide commands for FFZ's tab-completion.
	 * Triggers lazy loading on first keystroke if enabled.
	 *
	 * @param {Object} event - Tab-completion event object
	 */
	getTabCommands(event) {
		if (!this.settings.get('addon.custom-commands.enabled')) return;
		if (!this.currentChannel) return;

		const lazyLoad = this.settings.get('addon.custom-commands.lazy-loading');

		if (lazyLoad && !this.hasLoadedForChannel) {
			if (!this.isLoading) {
				this.isLoading = true;
				this.loadingPromise = this.loadCommandsForChannel(this.currentChannel)
					.then(() => this.triggerTabCompletionRefresh());
			}
			event.commands.push({
				name: 'loading',
				description: 'Loading commands...',
				permissionLevel: 0,
				ffz_group: 'Bot Commands'
			});
			return;
		}

		const commands = this.getAllCommands();
		if (commands.length > 0) {
			event.commands.push(...commands);
		}
	}

	triggerTabCompletionRefresh() {
		try {
			const chatInput = document.querySelector('[data-a-target="chat-input"]');
			if (chatInput) {
				chatInput.dispatchEvent(new Event('input', { bubbles: true }));
			}
		} catch (err) {
			this.log.debug('Could not trigger tab completion refresh:', err);
		}
	}

	/**
	 * Get all commands formatted for tab-completion.
	 *
	 * @returns {Array<Object>} Array of command objects for tab-completion
	 * each command object has:
	 *  - name: Command name
	 *   - description: Command description
	 *   - permissionLevel: Minimum permission level to see the command
	 *   - ffz_group: Group name for FFZ tab-completion
	 */
	getAllCommands() {
		const showAll = this.settings.get('addon.custom-commands.show-all-commands');
		const mode = this.settings.get('addon.custom-commands.completion-mode');
		const sourceOrder = this.settings.provider
			? (this.settings.provider.get('addon.custom-commands.source-order') || [])
			: [];

		const sourceKeys = sortBySourceOrder(Object.keys(this.commandsByKey), sourceOrder);
		const result = [];

		for (let i = 0; i < sourceKeys.length; i++) {
			const commands = this.commandsByKey[sourceKeys[i]];
			if (!commands?.length) continue;

			const groupName = `Bot Commands #${i + 1} (${commands[0]?.source || sourceKeys[i]})`;
			const sourcePrefix = commands[0]?.sourcePrefix || '!';

			this.addCommandsToResult(result, commands, {
				showAll,
				mode,
				groupName,
				sourcePrefix
			});
		}

		// Add control command
		result.push({
			name: 'ccac-refresh',
			description: 'Force refresh custom bot commands',
			permissionLevel: 0,
			ffz_group: 'Bot Commands (Control)'
		});

		return result;
	}

	/**
	 * Add commands from a source to the result array.
	 *
	 * @param {Array<Object>} result - Result array to push commands into
	 * @param {Array<Object>} commands - Array of command objects from the source
	 * @param {Object} options - Options for adding commands
	 * @param {boolean} options.showAll - Whether to show all commands regardless of permission
	 * @param {string} options.mode - Completion mode ('prefix', 'slash', 'both')
	 * @param {string} options.groupName - FFZ group name for the commands
	 * @param {string} options.sourcePrefix - Prefix used by the source (e.g., '!')
	 */
	addCommandsToResult(result, commands, { showAll, mode, groupName, sourcePrefix }) {
		for (const cmd of commands) {
			if (!showAll && cmd.permissionLevel > this.userPermissionLevel) {
				continue;
			}

			// Add main command
			this.addCommandVariants(result, cmd.name, {
				description: truncateDescription(cmd.description),
				mode,
				groupName,
				sourcePrefix
			});

			// Add aliases
			for (const alias of cmd.aliases || []) {
				this.addCommandVariants(result, alias, {
					description: `Alias for ${sourcePrefix}${cmd.name}`,
					mode,
					groupName,
					sourcePrefix
				});
			}
		}
	}

	/**
	 * Add slash and/or prefix variants of a command.
	 *
	 * @param {Array<Object>} result - Result array to push commands into
	 * @param {string} name - Command name
	 * @param {Object} options - Options for command variant
	 * @param {string} options.description - Command description
	 * @param {string} options.mode - Completion mode ('prefix', 'slash', 'both')
	 * @param {string} options.groupName - FFZ group name for the command
	 * @param {string} options.sourcePrefix - Prefix used by the source (e.g., '!')
	 */
	addCommandVariants(result, name, { description, mode, groupName, sourcePrefix }) {
		if (mode === 'slash' || mode === 'both') {
			result.push({
				name,
				description,
				permissionLevel: 0,
				ffz_group: groupName
			});
		}

		if (mode === 'prefix' || mode === 'both') {
			result.push({
				prefix: sourcePrefix,
				name,
				description,
				permissionLevel: 0,
				ffz_group: groupName
			});
		}
	}

	/**
	 * Load commands for a channel from all applicable sources.
	 *
	 * @param {string} channelLogin - Twitch channel login name
	 */
	async loadCommandsForChannel(channelLogin) {
		if (!this.settings.get('addon.custom-commands.enabled')) return;

		if (this.loadingPromise && this.isLoading) {
			return this.loadingPromise;
		}

		if (this.isCacheValid(channelLogin)) {
			return;
		}

		this.isLoading = true;
		this.clearCommands();
		this.currentChannel = channelLogin;

		const allSources = getEnabledSources(this.settings, this.log);
		const applicableSources = filterApplicableSources(allSources, channelLogin, this.currentRoom, this.log);

		if (applicableSources.length === 0) {
			this.log.debug(`No applicable command sources for #${channelLogin}`);
			this.isLoading = false;
			this.hasLoadedForChannel = true;
			return;
		}

		this.loadingPromise = this.fetchAllSources(applicableSources, channelLogin);
		await this.loadingPromise;
	}

	isCacheValid(channelLogin) {
		const cacheDuration = this.settings.get('addon.custom-commands.cache-duration') * 1000;
		const now = Date.now();

		return (
			this.currentChannel === channelLogin &&
			this.lastFetchTime &&
			cacheDuration > 0 &&
			(now - this.lastFetchTime) < cacheDuration
		);
	}

	async fetchAllSources(sources, channelLogin) {
		const results = await Promise.all(
			sources.map(source =>
				fetchWithTimeout(
					fetchFromSource(source, channelLogin, this.log),
					5000,
					source.name,
					this.log
				).catch(err => ({ source, commands: null, error: err }))
			)
		);

		for (const result of results) {
			if (result?.commands?.length > 0) {
				this.commandsByKey[result.source.key] = result.commands;
				this.log.debug(`${result.source.name}: Loaded ${result.commands.length} commands`);
			}
		}

		this.lastFetchTime = Date.now();
		this.isLoading = false;
		this.hasLoadedForChannel = true;
		this.loadingPromise = null;

		this.logLoadSummary(channelLogin);
	}

	logLoadSummary(channelLogin) {
		const entries = Object.entries(this.commandsByKey);
		const total = entries.reduce((sum, [, cmds]) => sum + cmds.length, 0);

		if (total > 0) {
			const summary = entries.map(([key, cmds]) => `${key}: ${cmds.length}`).join(', ');
			this.log.info(`Loaded ${total} commands for #${channelLogin} (${summary})`);
		} else {
			this.log.info(`No commands found for #${channelLogin}`);
		}
	}

	// ─────────────────────────────────────────────────────────────────────────────
	// State Management
	// ─────────────────────────────────────────────────────────────────────────────

	updateUserPermissionLevel() {
		try {
			const chatContainer = this.chat?.ChatContainer?.first;
			if (chatContainer?.props) {
				const level = chatContainer.props.commandPermissionLevel;
				this.userPermissionLevel = level === 3 ? 4 : level === 2 ? 3 : level === 1 ? 2 : 0;
			}
		} catch {
			this.userPermissionLevel = 0;
		}
	}

	setCurrentChannel(channelLogin, room = null) {
		if (this.currentChannel !== channelLogin) {
			this.clearCommands();
			this.currentChannel = channelLogin;
			this.currentRoom = room;
		}
	}

	clearCommands() {
		this.commandsByKey = {};
		this.lastFetchTime = null;
		this.hasLoadedForChannel = false;
	}

	async refreshCommands() {
		if (this.currentChannel) {
			this.log.info(`Refreshing commands for #${this.currentChannel}`);
			this.lastFetchTime = null;
			this.hasLoadedForChannel = false;
			this.isLoading = false;
			this.loadingPromise = null;
			await this.loadCommandsForChannel(this.currentChannel);
		}
	}
}
