export default class API extends FrankerFaceZ.utilities.module.Module {
	constructor(...args) {
		super(...args);

		this.inject(Emotes);
		this.inject(Cosmetics);

		this.apiBaseURI = 'https://7tv.io/v3';
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

	makeRequest(route, options) {
		const headers = new Headers(options && options.headers || {});

		headers.set('X-SevenTV-Platform', this.clientPlatform);
		headers.set('X-SevenTV-Version', this.clientVersion);

		return fetch(`${this.apiBaseURI}/${route}?_=${this.getBuster(30)}`, {...options, headers})
	}

	async requestJSON(route, options) {
		const response = await this.makeRequest(route, options);

		if (response.ok) {
			let json = await response.json();
			return json;
		}

		return null;
	}

	async requestObject(route, options) {
		const json = await this.requestJSON(route, options);

		if (json != null && typeof json == 'object') return json;

		return {};
	}

	async requestArray(route, options) {
		const json = await this.requestJSON(route, options);

		if (json instanceof Array) return json;

		return [];
	}

	async getEmotesEventSourceURL(channelId) {
		let query = new URLSearchParams();
		query.set('agent', `${this.clientPlatform}:${this.clientVersion}`);
		const channelsEmotes = await this.emotes.fetchChannelEmotes(channelId);
		return `${this.eventsBaseURI}@emote_set.update<object_id=${channelsEmotes.emote_set.id}>?${query.toString()}`;
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
	constructor(...args) {
		super(...args);
	}

	fetchAvatars() {
		return this.parent.requestObject('cosmetics/avatars?map_to=login');
	}

	fetchCosmetics() {
		return this.parent.requestObject('cosmetics?user_identifier=twitch_id');
	}

	updateCosmetics(force = false) {
		if (!this.cosmetics || force) {
			if (!this.cosmeticsUpdate) {
				this.cosmeticsUpdate = this.fetchCosmetics().then((json) => {
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