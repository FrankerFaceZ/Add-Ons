export default class API extends FrankerFaceZ.utilities.module.Module {
	constructor(...args) {
		super(...args);

		this.inject(User);
		this.inject(Emotes);
		this.inject(Cosmetics);
		this.inject('settings');

		this.clientPlatform = 'ffz';
		this.clientVersion = this.parent.manifest.version;
		
		this.updateBaseURIs();
	}

	updateBaseURIs() {
		const proxySettings = this.resolve('addon.reyohoho-emotes-proxy');
		const proxyUrl = proxySettings ? proxySettings.getProxyUrl() : null;
		const isEnabled = proxySettings ? proxySettings.isServiceEnabled('7tv') : false;

		if (proxyUrl && isEnabled) {
			this.apiBaseURI = `${proxyUrl}https://7tv.io/v3`;
			this.appBaseURI = `${proxyUrl}https://7tv.app`;
		} else {
			this.apiBaseURI = 'https://7tv.io/v3';
			this.appBaseURI = 'https://7tv.app';
		}
		
		this.eventsBaseURI = 'https://events.7tv.io/v3';
	}

	onEnable() {
		this.settings.on('changed:addon.reyohoho-emotes-proxy.enabled', () => {
			this.updateBaseURIs();
		});
		
		this.settings.on('changed:addon.reyohoho-emotes-proxy.proxy-url', () => {
			this.updateBaseURIs();
		});
		
		this.settings.on('changed:addon.reyohoho-emotes-proxy.services', () => {
			this.updateBaseURIs();
		});
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
		try {
			const response = await this.makeRequest(route, 
				{
					...options,
					headers: {
						'Content-Type': 'application/json'
					}
				});
	
			if (response.ok) {
				const json = await response.json();
				return json;
			}
			else {
				this.log.error(`Request to the following URL was not successful: ${route} - HTTP Response Code: ${response.status}`);
			}
		}
		catch (error) {
			this.log.error(`Request to the following URL encountered an error: ${route}`);
			this.log.error(error);
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
	fetchAvatars(identifiers) {
		return this.parent.requestJSON('bridge/event-api', {
			method: 'POST',
			body: JSON.stringify({
				identifiers
			})
		});
	}
}