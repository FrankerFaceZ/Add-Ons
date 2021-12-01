import { version } from '../manifest.json';

export default class API extends FrankerFaceZ.utilities.module.Module {
    constructor(...args) {
		super(...args);

        this.apiBaseURI = "https://api.7tv.app/v2/";
        this.eventsBaseURI = "https://events.7tv.app/v1/";

        this.clientPlatform = "ffz";
        this.clientVersion = version;
    }

    async fetchAvatars() {
        let response = await this.makeRequest("cosmetics/avatars?map_to=login");
        if (response.ok) {
            let json = await response.json();
            if (typeof json == "object" && json != null) {
                return json;
            }
        }

        return {};
    }

    async fetchBadges() {
        let response = await this.makeRequest("badges?user_identifier=twitch_id");
        if (response.ok) {
            let json = await response.json();
            if (typeof json == "object" && json != null && json["badges"] instanceof Array) {
                return json["badges"];
            }
        }

        return [];
    }

    async fetchGlobalEmotes() {
        let response = await this.makeRequest("emotes/global");
        if (response.ok) {
            let json = await response.json();
            if (json instanceof Array) {
                return json;
            }
        }

        return [];
    }

    async fetchChannelEmotes(login) {
        let response = await this.makeRequest(`users/${login}/emotes`);
        if (response.ok) {
            let json = await response.json();
            if (json instanceof Array) {
                return json;
            }
        }

        return [];
    }

    makeRequest(route, options) {
        const headers = new Headers(options && options.headers || {});

        headers.set("X-SevenTV-Platform", this.clientPlatform);
        headers.set("X-SevenTV-Version", this.clientVersion);

        return fetch(`${this.apiBaseURI}${route}`, {...options, headers: headers})
    }

    getEmotesEventSourceURL(channelLogins) {
        let query = new URLSearchParams();

        query.set("channel", channelLogins);
        query.set("agent", `${this.clientPlatform}:${this.clientVersion}`);

        return `${this.eventsBaseURI}/channel-emotes?${query.toString()}`;
    }
}