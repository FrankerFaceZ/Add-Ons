/**
 * Bot API Presets
 *
 * Pre-configured source definitions for common bots.
 * These use the same code path as custom sources.
 *
 * Detection: Presets must define either botNames or channelNames (or both):
 * - botNames: Array of bot account names to detect in chat (e.g., ['streamelements'])
 * - channelNames: Array of specific channels this source applies to (for custom sources)
 *
 * API Options:
 * - channelMethod/commandsMethod: 'GET' (default) or 'POST'
 * - channelHeaders/commandsHeaders: Custom headers object, supports {channel} and {channelId} placeholders
 * - channelFormData/commandsFormData: Form data for POST requests, supports placeholders
 * - prefixInName: If true, extract prefix from command name (e.g., "!ping" -> prefix="!", name="ping")
 *
 * These can be used as a reference for creating custom sources as well.
 *
 * Are you missing a common bot, or you got a custom one? Feel free to reachout, or contribute as needed!
 *
 * Notes:
 * - Streamlabs API is not public from 'https://www.twitch.tv', which results in CORS (will not be added unless streamlabs open CORS against twitch web app).
 */

export const PRESETS = {
	streamelements: {
		name: 'StreamElements',
		botNames: ['streamelements'],
		prefix: '!',
		channelUrl: 'https://api.streamelements.com/kappa/v2/channels/{channel}',
		channelIdPath: ['_id'],
		commandsUrl: 'https://api.streamelements.com/kappa/v2/bot/commands/{channelId}/default',
		namePath: ['command'],
		descriptionPath: ['reply'],
		enabledPath: ['enabled'],
		aliasesPath: ['aliases'],
		permissionPath: ['accessLevel'],
		// SE uses numeric ranges for permission levels
		permissionMapping: [
			[[100, 299], 0],   // 100-299=Everyone
			[[300, 399], 1],   // 300-399=Subscriber
			[[400, 499], 2],   // 400-499=VIP
			[[500, 1499], 3],  // 500-1499=Moderator (including SE Mods)
			[[1500, Infinity], 4]  // 1500+=Broadcaster
		]
	},

	fossabot: {
		name: 'Fossabot',
		botNames: ['fossabot'],
		prefix: '!',
		channelUrl: 'https://fossabot.com/api/v2/cached/channels/by-slug/{channel}',
		channelIdPath: ['channel', 'id'],
		commandsUrl: 'https://fossabot.com/api/v2/cached/channels/{channelId}/commands',
		commandsPath: ['commands'],
		namePath: ['name'],
		descriptionPath: ['response'],
		enabledPath: ['enabled'],
		aliasesPath: ['aliases'],
		permissionPath: ['minimum_role']
		// Uses default string mapping (everyone, subscriber, vip, moderator, broadcaster)
	},

	nightbot: {
		name: 'Nightbot',
		botNames: ['nightbot'],
		prefix: '!',
		prefixInName: true, // Nightbot includes prefix in command name
		channelUrl: 'https://api.nightbot.tv/1/channels/twitch/{channel}',
		channelIdPath: ['channel', '_id'],
		commandsUrl: 'https://api.nightbot.tv/1/commands',
		commandsHeaders: {
			'Nightbot-Channel': '{channelId}'
		},
		commandsPath: ['commands'],
		namePath: ['name'],
		descriptionPath: ['message'],
		permissionPath: ['userLevel'],
		permissionMapping: {
			'everyone': 0,
			'subscriber': 1,
			'regular': 2,
			'moderator': 3,
			'owner': 4
		}
	},

	moobot: {
		name: 'Moobot',
		botNames: ['moobot'],
		prefix: '!',
		channelUrl: 'https://api.moo.bot/1/channel/meta',
		channelMethod: 'POST',
		channelFormData: { name: '{channel}' },
		channelIdPath: ['channel', 'userid'],
		commandsUrl: 'https://api.moo.bot/1/channel/public/commands/list',
		commandsMethod: 'POST',
		commandsFormData: { channel: '{channelId}' },
		commandsPath: ['list'],
		namePath: ['command'],
		descriptionPath: ['response'],
		enabledPath: ['enabled'],
		permissionPath: ['access']
		// Uses default string mapping
	}
};

/**
 * Validate a source configuration.
 * At least one of botNames or channelNames must be defined.
 *
 * @param {Object} source - The source configuration to validate.
 * @return {Object} Validation result with 'valid' boolean and optional 'error' message.
 */
export function validateSource(source) {
	const hasBotNames = Array.isArray(source.botNames) && source.botNames.length > 0;
	const hasChannelNames = Array.isArray(source.channelNames) && source.channelNames.length > 0;

	if (!hasBotNames && !hasChannelNames) {
		return {
			valid: false,
			error: `Source "${source.name}" must define either botNames or channelNames`
		};
	}

	return { valid: true };
}
