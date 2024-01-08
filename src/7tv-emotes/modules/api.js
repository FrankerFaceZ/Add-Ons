export default class API extends FrankerFaceZ.utilities.module.Module {
	constructor(...args) {
		super(...args);

		this.inject(User);
		this.inject(Emotes);
		this.inject(Cosmetics);

		this.apiBaseURI = 'https://7tv.io/v3';
		this.eventsBaseURI = 'https://events.7tv.io/v3';
		this.appBaseURI = 'https://7tv.app';

		this.clientPlatform = 'ffz';
		this.clientVersion = this.parent.manifest.version;
	}

	makeRequest(route, options = {}, skip_cache = false) {
		const headers = new Headers(options && options.headers || {});

		headers.set('X-SevenTV-Platform', this.clientPlatform);
		headers.set('X-SevenTV-Version', this.clientVersion);

		const request = fetch(`${this.apiBaseURI}/${route}`, {
			cache: skip_cache ? 'reload' : 'default',
			...options,
			headers
		});

		if ( ! skip_cache )
			return request.catch(() => this.makeRequest(route, options, true));

		return request;
	}

	async requestJSON(route, options = {}) {
		const response = await this.makeRequest(route, options);

		if (response.ok) {
			const json = await response.json();
			return json;
		}

		return null;
	}

	async requestObject(route, options = {}) {
		const json = await this.requestJSON(route, options);

		if (json != null && typeof json == 'object') return json;

		return {};
	}

	async requestArray(route, options = {}) {
		const json = await this.requestJSON(route, options);

		if (json instanceof Array) return json;

		return [];
	}

	getEmoteAppURL(emote) {
		return `${this.appBaseURI}/emotes/${emote.id}`;
	}
}

export class User extends FrankerFaceZ.utilities.module.Module {
	fetchUserData(user_id) {
		return this.parent.requestObject(`users/twitch/${user_id}`);
	}

	updateUserPresences(user_id, channel_id, self = undefined, session_id = undefined) {
		return this.parent.requestJSON(`users/${user_id}/presences`, {
			method: 'POST',
			body: JSON.stringify({
				kind: 1,
				passive: self,
				session_id: self ? session_id : undefined,
				data: {
					platform: 'TWITCH',
					id: channel_id
				}
			})
		});
	}
}

export class Emotes extends FrankerFaceZ.utilities.module.Module {
	fetchGlobalEmotes() {
		return this.parent.requestObject('emote-sets/global');
	}

	fetchChannelEmotes(channelId) {
		return this.parent.requestObject(`users/twitch/${channelId}`);
	}
	
	fetchEmoteSet(setID) {
		return this.parent.requestObject(`emote-sets/${setID}`);
	}
}

export class Cosmetics extends FrankerFaceZ.utilities.module.Module {
	fetchAvatars() {
		return {};
		// return this.parent.requestObject('cosmetics/avatars?map_to=login');
	}
}