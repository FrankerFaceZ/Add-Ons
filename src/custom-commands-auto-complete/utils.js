/**
 * Utility Functions
 *
 * Pure utility functions with no external dependencies.
 */

/**
 * Truncate a description to a maximum length.
 *
 * @param {string} description - The description to truncate
 * @param {number} maxLength - Maximum length (default 100)
 * @returns {string} Truncated description
 */
export function truncateDescription(description, maxLength = 100) {
	if (!description) return '';
	if (description.length <= maxLength) return description;
	return `${description.substring(0, maxLength - 3)}...`;
}

/**
 * Get a value from an object using a path.
 *
 * Supports two formats:
 * - Array: ['channel', 'id'] -> obj.channel.id (preferred, unambiguous)
 * - String: 'channel.id' -> obj.channel.id (for backward compatibility)
 *
 * @param {Object} obj - The object to traverse
 * @param {string|Array<string>} path - Path as array or dot-notation string
 * @returns {*} The value at the path, or undefined if not found
 */
export function getNestedValue(obj, path) {
	if (!path) return undefined;
	if (!obj || typeof obj !== 'object') return undefined;

	const keys = Array.isArray(path) ? path : path.split('.');

	let current = obj;
	for (const key of keys) {
		if (current === null || current === undefined) {
			return undefined;
		}
		current = current[key];
	}

	return current;
}

/**
 * Map permission values to standard levels (0-4).
 * Supports exact matches, range-based mappings, and common string values.
 *
 * Custom mapping can be:
 * - Object: {100: 0, 500: 3} for exact matches
 * - Array: [[[100, 299], 0], [[300, 499], 1]] for ranges
 *
 * @param {any} value - The permission value to map
 * @param {Object|Array} customMapping - Optional custom mapping
 * @returns {number} Mapped permission level (0-4, everyone -> broadcaster)
 */
export function mapPermissionLevel(value, customMapping) {
	if (value === undefined || value === null) return 0;

	if (customMapping) {
		// Array format: [[[min, max], level], ...]
		if (Array.isArray(customMapping)) {
			if (typeof value === 'number') {
				for (const [[min, max], level] of customMapping) {
					if (value >= min && value <= max) {
						return level;
					}
				}
			}
		// Object format: {value: level}
		} else if (customMapping[value] !== undefined) {
			return customMapping[value];
		}
	}

	// Numeric values (fallback)
	if (typeof value === 'number') {
		return Math.min(value, 4);
	}

	// Common string mappings
	const mappings = {
		'everyone': 0, 'all': 0, 'public': 0, 'any': 0,
		'subscriber': 1, 'sub': 1, 'subs': 1, 'follower': 1,
		'vip': 2, 'vips': 2, 'regular': 2,
		'moderator': 3, 'mod': 3, 'mods': 3,
		'broadcaster': 4, 'owner': 4, 'streamer': 4
	};

	return mappings[String(value).toLowerCase()] ?? 0;
}

/**
 * Sort source keys by user-defined order.
 *
 * @param {Array<string>} keys - Array of source keys to sort
 * @param {Array<string>} sourceOrder - User-defined order array
 * @returns {Array<string>} Sorted keys
 */
export function sortBySourceOrder(keys, sourceOrder) {
	return [...keys].sort((a, b) => {
		const indexA = sourceOrder.indexOf(a);
		const indexB = sourceOrder.indexOf(b);

		// Both in order: sort by position
		if (indexA !== -1 && indexB !== -1) return indexA - indexB;
		// Only A in order: A first
		if (indexA !== -1) return -1;
		// Only B in order: B first
		if (indexB !== -1) return 1;
		// Neither: alphabetical
		return a.localeCompare(b);
	});
}
