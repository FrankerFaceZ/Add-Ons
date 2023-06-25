export default class API extends FrankerFaceZ.utilities.module.Module {
	constructor(...args) {
		super(...args);

		this.inject(Emotes);
		this.inject(Cosmetics);

		this.apiBaseURI = 'https://7tv.io/v3';
		this.apiv2BaseURI = 'https://api.7tv.app/v2';
		this.eventsBaseURI = 'https://events.7tv.io/v3';
		this.appBaseURI = 'https://7tv.app';

		this.clientPlatform = 'ffz';
		this.clientVersion = this.parent.manifest.version;
	}

	// Helpful cache-busting method from FFZ
	getBuster(resolution = 5) {
		const now = Math.floor(Date.now() / 1000);
		return now - (now % resolution);
	}

	makeRequest(route, use_v2 = false, options = {}) {
		const headers = new Headers(options && options.headers || {});

		headers.set('X-SevenTV-Platform', this.clientPlatform);
		headers.set('X-SevenTV-Version', this.clientVersion);

		return fetch(`${use_v2 ? this.apiv2BaseURI : this.apiBaseURI}/${route}`, {...options, headers})
	}

	async requestJSON(route, use_v2 = false, options = {}) {
		const response = await this.makeRequest(route, use_v2, options);

		if (response.ok) {
			const json = await response.json();
			return json;
		}

		return null;
	}

	async requestObject(route, use_v2 = false, options = {}) {
		const json = await this.requestJSON(route, use_v2, options);

		if (json != null && typeof json == 'object') return json;

		return {};
	}

	async requestArray(route, use_v2 = false, options = {}) {
		const json = await this.requestJSON(route, use_v2, options);

		if (json instanceof Array) return json;

		return [];
	}

	// async getEventSourceURL(channelId) {
	// 	const events = [
	// 		'emote_set.update',

	// 	]
	// }

	async getEmotesEventSourceURL(channelId) {
		const query = new URLSearchParams();
		query.set('agent', `${this.clientPlatform}:${this.clientVersion}`);
		const channelsEmotes = await this.emotes.fetchChannelEmotes(channelId);
		return `${this.eventsBaseURI}@emote_set.update<object_id=${channelsEmotes.emote_set?.id}>?${query.toString()}`;
	}

	getEmoteAppURL(emote) {
		return `${this.appBaseURI}/emotes/${emote.id}`;
	}
}

export class Emotes extends FrankerFaceZ.utilities.module.Module {
	fetchGlobalEmotes() {
		return this.parent.requestArray('emote-sets/global');
	}

	fetchChannelEmotes(channelId) {
		return this.parent.requestObject(`users/twitch/${channelId}`);
	}
}

export class Cosmetics extends FrankerFaceZ.utilities.module.Module {
	fetchAvatars() {
		return this.parent.requestObject('cosmetics/avatars?map_to=login', true);
	}

	fetchCosmetics() {
		return this.parent.requestObject('cosmetics?user_identifier=twitch_id', true);
	}

	updateCosmetics(force = false) {
		if (!this.cosmetics || force) {
			if (!this.cosmeticsUpdate) {
				this.cosmeticsUpdate = this.fetchCosmetics().then(json => {
					this.cosmetics = json;
					this.cosmeticsUpdate = undefined;
					return true;
				});
			}

			return this.cosmeticsUpdate;
		}

		return Promise.resolve(false);
	}

	async getCosmeticsOfType(type) {
		await this.updateCosmetics();

		return this.cosmetics && this.cosmetics[type] || [];
	}

	getBadges() {
		return this.getCosmeticsOfType('badges');
	}

	getPaints() {
		return this.getCosmeticsOfType('paints');
	}
}