/**
 * @typedef {Object} Member
 * @property {number} id
 * @property {string} name
 * @property {string[]} proxies
 * @property {boolean} case_sensitive
 * @property {string|null} color
 * @property {string|null} pronouns
 */

/**
 * @typedef {Object} System
 * @property {number} id
 * @property {string|null} color
 * @property {string|null} pronouns
 * @property {number|null} autoproxy_member_id
 * @property {Member[]} members
 */

const CACHE_DURATION = 15 * 60 * 1000 // 15 minutes

const pendingFetches = {}
const systemCache = {}

/**
 * Fetches a system from the Pluralmind API. Returns the existing promise if
 * there's already a fetch in progress for that system.
 * @param {string|number} id The user's Twitch ID or login username.
 * @returns {Promise<System|null>} The system, if the user has one.
 */
const fetchSystem = id => {
	// Check if there's already a pending fetch for this system
	if (id in pendingFetches) return pendingFetches[id]

	// Load the system's info
	pendingFetches[id] = new Promise(async (resolve, reject) => { // eslint-disable-line no-async-promise-executor
		try {
			const response = await fetch(`https://pluralmind.chat/api/system/${id}`)
			const system = response.ok ? (await response.json()) : null
			systemCache[id] = { system, timestamp: Date.now() }
			resolve(system)
		} catch (e) {
			reject(e)
		} finally {
			delete pendingFetches[id]
		}
	})
	return pendingFetches[id]
}

/**
 * Returns the cached data for a system synchronously, and kicks off a
 * background fetch for fresh data if it is needed (and callback is provided).
 * @param {string|number} id The user's Twitch ID or login username.
 * @param {Function} [callback] Function to call if we end up loading fresh
 *     system information for this user.
 * @returns {System|null|undefined} The cached system, if one exists. Undefined
 *     means we hadn't attempted to load this user's system yet, and null means
 *     this user doesn't have a system.
 */
export const getSystem = (id, callback) => {
	const cached = systemCache[id]

	// Kick off a background fetch if we don't have data, or it's too old
	if (callback && (!cached || (Date.now() - cached.timestamp >= CACHE_DURATION))) {
		fetchSystem(id).then(system => callback(system)).catch(() => {});
	}

	// Always return the existing data (or lack thereof) for a system
	return cached?.system
}
