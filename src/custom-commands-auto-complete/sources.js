/**
 * Source Management
 *
 * Handles source discovery, validation, and filtering.
 */

import { PRESETS, validateSource } from './presets';

/**
 * Get all enabled sources (presets + custom).
 * Validates sources and sorts by user-defined order.
 *
 * @param {Object} settings - FFZ settings instance
 * @param {Object} log - Logger instance
 * @returns {Array<Object>} Array of valid, sorted source definitions
 */
export function getEnabledSources(settings, log) {
	const sources = [];

	// Read source order and disabled list from provider (where Vue component writes)
	const sourceOrder = settings.provider
		? (settings.provider.get('addon.custom-commands.source-order') || [])
		: [];
	const disabledSources = settings.provider
		? (settings.provider.get('addon.custom-commands.disabled-sources') || [])
		: [];

	// Add presets that are in source order AND not disabled
	const presetKeys = ['streamelements', 'fossabot', 'nightbot', 'moobot'];
	for (const key of presetKeys) {
		if (sourceOrder.includes(key) && !disabledSources.includes(key)) {
			sources.push({ ...PRESETS[key], enabled: true, key });
		}
	}

	// Add custom sources
	const customSources = settings.get('addon.custom-commands.custom-sources') || [];
	log.debug(`Custom sources from settings: ${JSON.stringify(customSources)}`);

	for (let i = 0; i < customSources.length; i++) {
		const source = customSources[i];
		if (source.enabled !== false) {
			sources.push({ ...source, key: `custom-${i}`, customIndex: i });
			log.debug(`Added custom source: ${source.name}`);
		}
	}

	// Validate and filter sources
	const validSources = sources.filter(source => {
		const validation = validateSource(source);
		if (!validation.valid) {
			log.warn(validation.error);
			return false;
		}
		return true;
	});

	// Sort by user-defined order
	validSources.sort((a, b) => {
		const aIndex = sourceOrder.indexOf(a.key);
		const bIndex = sourceOrder.indexOf(b.key);

		if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
		if (aIndex !== -1) return -1;
		if (bIndex !== -1) return 1;
		return 0;
	});

	log.debug(`Total valid sources: ${validSources.length}`);
	return validSources;
}

/**
 * Filter sources to only those applicable for the current channel.
 * Checks botNames (if bots are in chat) and channelNames (if channel matches).
 *
 * @param {Array<Object>} sources - All enabled sources
 * @param {string} channelLogin - The channel login name
 * @param {Object} room - FFZ room reference for bot detection
 * @param {Object} log - Logger instance
 * @returns {Array<Object>} Sources applicable to this channel
 */
export function filterApplicableSources(sources, channelLogin, room, log) {
	const applicable = [];
	const lowerChannelLogin = channelLogin.toLowerCase();

	if (!room) {
		log.warn('No room reference available - bot detection will not work');
	}

	for (const source of sources) {
		const reason = checkSourceApplicability(source, lowerChannelLogin, room, log);
		if (reason) {
			log.debug(`${source.name}: applicable (${reason})`);
			applicable.push(source);
		}
	}

	log.debug(`${applicable.length}/${sources.length} sources applicable for #${channelLogin}`);
	return applicable;
}

/**
 * Check if a source is applicable for a channel.
 *
 * @param {Object} source - Source definition
 * @param {string} lowerChannelLogin - Lowercase channel login
 * @param {Object} room - FFZ room reference
 * @param {Object} log - Logger instance
 * @returns {string|null} Reason string if applicable, null if not
 */
function checkSourceApplicability(source, lowerChannelLogin, room, log) {
	let reason = '';

	// Check if any of the source's bots are present in the channel
	if (source.botNames?.length > 0) {
		const detectedBot = detectBotInChannel(source.botNames, room, log);
		if (detectedBot) {
			reason = `bot "${detectedBot}" detected`;
		}
	}

	// Check if this is a channel-specific source
	if (source.channelNames?.length > 0) {
		const isForThisChannel = source.channelNames.some(
			channel => channel.toLowerCase() === lowerChannelLogin
		);
		if (isForThisChannel) {
			reason = reason ? `${reason} + channel match` : 'channel match';
		}
	}

	return reason || null;
}

/**
 * Check if any of the specified bot names are present in the current channel.
 *
 * @param {Array<string>} botNames - Array of bot usernames to check
 * @param {Object} room - FFZ room reference
 * @param {Object} log - Logger instance
 * @returns {string|null} The detected bot name, or null if none found
 */
export function detectBotInChannel(botNames, room, log) {
	if (!room) {
		log.debug('No current room available for bot detection');
		return null;
	}

	log.debug(`Checking for bots: ${botNames.join(', ')} in room: ${room.login}`);

	for (const botName of botNames) {
		try {
			const lowerBotName = botName.toLowerCase();

			// Use getUser() - pass false to avoid creating the user if it doesn't exist
			const botUser = room.getUser(null, lowerBotName, false);
			if (botUser) {
				log.debug(`Bot "${botName}" found in channel`);
				return botName;
			}

			log.debug(`Bot "${botName}" not found`);
		} catch (err) {
			log.warn(`Error checking for bot ${botName}: ${err.message || err}`);
		}
	}

	return null;
}
