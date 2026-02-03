/**
 * API Fetcher
 *
 * Handles all HTTP communication with bot APIs.
 */

import { getNestedValue, mapPermissionLevel } from './utils';

/**
 * Fetch from API with support for GET/POST, headers, and form data.
 *
 * @param {string} url - The URL to fetch
 * @param {string} method - HTTP method ('GET' or 'POST')
 * @param {Object|null} formData - Form data for POST requests
 * @param {Object|null} headers - Custom headers
 * @param {Object} log - Logger instance
 * @returns {Promise<Object|null>} Parsed JSON response or null on error
 */
export async function fetchApi(url, method = 'GET', formData = null, headers = null, log = console) {
	try {
		const options = {
			method: method || 'GET',
			headers: headers || {}
		};

		if (formData && method === 'POST') {
			const form = new URLSearchParams();
			for (const [key, value] of Object.entries(formData)) {
				form.append(key, value);
			}
			options.body = form;
			options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
		}

		const response = await fetch(url, options);
		if (response.ok) {
			return await response.json();
		}

		// Log non-404 errors as warnings (404 is expected when bot not configured)
		if (response.status === 404) {
			log.info(`API returned 404 for ${url} (channel not configured?)`);
		} else {
			log.warn(`HTTP ${response.status} for ${url}`);
		}
	} catch (err) {
		const msg = err.message || String(err);
		if (msg.includes('Failed to fetch')) {
			log.warn(`CORS/network error for ${url}`);
		} else {
			log.error(`Fetch error for ${url}: ${msg}`);
		}
	}
	return null;
}

/**
 * Wraps a promise with a timeout.
 *
 * @param {Promise} promise - The promise to wrap
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} sourceName - Source name for error message
 * @param {Object} log - Logger instance
 * @returns {Promise} Promise that resolves with the result or rejects on timeout
 */
export async function fetchWithTimeout(promise, timeoutMs, sourceName, log) {
	const timeoutPromise = new Promise((_, reject) => {
		setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs);
	});

	try {
		return await Promise.race([promise, timeoutPromise]);
	} catch (err) {
		if (err.message.includes('Timeout')) {
			log.warn(`${sourceName}: Request timed out after ${timeoutMs}ms`);
		}
		throw err;
	}
}

/**
 * Build headers object with placeholders replaced.
 *
 * @param {Object|null} headersConfig - Headers configuration with placeholders
 * @param {string} channelLogin - Channel login name
 * @param {string} channelId - Resolved channel ID
 * @returns {Object|null} Headers with placeholders replaced, or null
 */
export function buildHeaders(headersConfig, channelLogin, channelId) {
	if (!headersConfig) return null;
	const headers = {};
	for (const [key, value] of Object.entries(headersConfig)) {
		headers[key] = String(value)
			.replace('{channel}', channelLogin)
			.replace('{channelId}', channelId);
	}
	return headers;
}

/**
 * Build form data object with placeholders replaced.
 *
 * @param {Object|null} formDataConfig - Form data configuration with placeholders
 * @param {string} channelLogin - Channel login name
 * @param {string} channelId - Resolved channel ID
 * @returns {Object|null} Form data with placeholders replaced, or null
 */
export function buildFormData(formDataConfig, channelLogin, channelId) {
	if (!formDataConfig) return null;
	const data = {};
	for (const [key, value] of Object.entries(formDataConfig)) {
		data[key] = String(value)
			.replace('{channel}', channelLogin)
			.replace('{channelId}', channelId);
	}
	return data;
}

/**
 * Resolve channel ID from a source's channel endpoint.
 *
 * @param {Object} source - Source definition
 * @param {string} channelLogin - Channel login name
 * @param {Object} log - Logger instance
 * @returns {Promise<string|null>} Resolved channel ID or null on failure
 */
export async function resolveChannelId(source, channelLogin, log) {
	if (!source.channelUrl || !source.channelIdPath) {
		return channelLogin;
	}

	const channelUrl = source.channelUrl.replace('{channel}', channelLogin);
	const channelHeaders = buildHeaders(source.channelHeaders, channelLogin, channelLogin);
	const channelFormData = buildFormData(source.channelFormData, channelLogin, channelLogin);

	if (channelFormData) {
		log.debug(`${source.name}: Channel form data:`, channelFormData);
	}

	const channelData = await fetchApi(channelUrl, source.channelMethod, channelFormData, channelHeaders, log);

	if (!channelData) {
		log.debug(`${source.name}: Failed to fetch channel data`);
		return null;
	}

	const channelId = getNestedValue(channelData, source.channelIdPath);
	const pathStr = Array.isArray(source.channelIdPath) ? source.channelIdPath.join('.') : source.channelIdPath;

	if (!channelId) {
		log.warn(`${source.name}: Channel ID not found at path "${pathStr}"`);
		log.debug(`${source.name}: Response keys: ${Object.keys(channelData).join(', ')}`);
		return null;
	}

	log.debug(`${source.name}: Resolved channel ID: ${channelId}`);
	return channelId;
}

/**
 * Fetch and parse commands from a source.
 *
 * @param {Object} source - Source definition
 * @param {string} channelLogin - Channel login name
 * @param {Object} log - Logger instance
 * @returns {Promise<Object>} Result with source and commands array
 */
export async function fetchFromSource(source, channelLogin, log) {
	log.debug(`${source.name}: Fetching commands for ${channelLogin}`);

	try {
		// Resolve channel ID if needed
		const channelId = await resolveChannelId(source, channelLogin, log);
		if (!channelId) {
			return { source, commands: null };
		}

		if (!source.commandsUrl) {
			log.warn(`${source.name}: No commandsUrl configured`);
			return { source, commands: null };
		}

		const finalUrl = source.commandsUrl
			.replace('{channel}', channelLogin)
			.replace('{channelId}', channelId);

		log.debug(`${source.name}: Fetching commands from ${finalUrl}`);

		const headers = buildHeaders(source.commandsHeaders, channelLogin, channelId);
		const formData = buildFormData(source.commandsFormData, channelLogin, channelId);

		const data = await fetchApi(finalUrl, source.commandsMethod, formData, headers, log);
		if (!data) {
			log.info(`${source.name}: No data returned from commands endpoint`);
			return { source, commands: null };
		}

		const commands = parseCommands(data, source, log);
		return { source, commands };
	} catch (err) {
		log.error(`${source.name}: Error during fetch - ${err.message || err}`);
		return { source, commands: null, error: err };
	}
}

/**
 * Parse raw API response into standardized command objects.
 *
 * @param {Object|Array} data - Raw API response
 * @param {Object} source - Source definition
 * @param {Object} log - Logger instance
 * @returns {Array} Array of parsed command objects
 */
function parseCommands(data, source, log) {
	// Extract commands array from response
	let commandsArray = source.commandsPath
		? getNestedValue(data, source.commandsPath)
		: data;

	if (!commandsArray) {
		log.info(`${source.name}: Commands array not found at path "${source.commandsPath}"`);
		return [];
	}

	if (!Array.isArray(commandsArray)) {
		commandsArray = [commandsArray];
	}

	const sourcePrefix = source.prefix || '!';

	return commandsArray
		.filter(cmd => {
			if (source.enabledPath) {
				return getNestedValue(cmd, source.enabledPath) !== false;
			}
			return true;
		})
		.map(cmd => parseCommand(cmd, source, sourcePrefix))
		.filter(cmd => cmd.name);
}

/**
 * Parse a single command from raw API data.
 *
 * @param {Object} cmd - Raw command object from API
 * @param {Object} source - Source definition
 * @param {string} sourcePrefix - Default prefix for this source
 * @returns {Object} Standardized command object
 */
function parseCommand(cmd, source, sourcePrefix) {
	let name = getNestedValue(cmd, source.namePath || 'name') || '';
	let cmdPrefix = sourcePrefix;

	// If prefix is embedded in command name, extract it
	if (source.prefixInName && name) {
		const prefixMatch = name.match(/^([!.$/\\?#@~])(.+)$/);
		if (prefixMatch) {
			cmdPrefix = prefixMatch[1];
			name = prefixMatch[2];
		}
	}

	return {
		name,
		description: getNestedValue(cmd, source.descriptionPath || 'description') || '',
		permissionLevel: mapPermissionLevel(
			getNestedValue(cmd, source.permissionPath || 'permission'),
			source.permissionMapping
		),
		aliases: getNestedValue(cmd, source.aliasesPath) || [],
		source: source.name,
		sourcePrefix: cmdPrefix
	};
}
