export class Api extends FrankerFaceZ.utilities.module.Module {
    constructor(...args) {
        super(...args);

        this.inject(FFZ);
        this.inject(Users);
        this.inject(Room);

        this.apiBase = 'https://turteg-api.xslash.ovh/v1';
    }

    async request(path) {
        try {
            const response = await fetch(`${this.apiBase}/${path}`);
            if (response.ok) {
                return await response.json();
            }
        } catch (err) {
            this.log.error(`Error fetching "${this.apiBase}/${path}": ${err}`);
        }

        return [];
    }
}

export class FFZ extends FrankerFaceZ.utilities.module.Module {
    // https://turteg-api.xslash.ovh/v1/ffz/badges
    async getBadges() {
        return (await this.parent.request('ffz/badges')).badges;
    }
    // https://turteg-api.xslash.ovh/v1/ffz/commands
    async getCommands(roomId = null) {
        return (await this.parent.request(`ffz/commands${roomId ? `?roomId=${roomId}` : ''}`)).commands;
    }
    // https://turteg-api.xslash.ovh/v1/ffz/{roomId}/power?userId={userId}
    async getUserPower(roomId, userId) {
        return (await this.parent.request(`ffz/${roomId}/power?userId=${userId}`)).power;
    }
}

export class Users extends FrankerFaceZ.utilities.module.Module {
    // https://turteg-api.xslash.ovh/v1/users/twitch/{twitchId}
    async getUserId(twitchId) {
        return (await this.parent.request(`users/twitch/${twitchId}`)).user.id;
    }
    // https://turteg-api.xslash.ovh/v1/users/{userId}
    async getUser(userId) {
        return (await this.parent.request(`users/${userId}`)).user;
    }
}

export class Room extends FrankerFaceZ.utilities.module.Module {
    // https://turteg-api.xslash.ovh/v1/room/twitch/{twitchId}
    async getRoomId(twitchId) {
        return (await this.parent.request(`room/twitch/${twitchId}`)).roomId;
    }
    // https://turteg-api.xslash.ovh/v1/room/{roomId}/settings
    async getRoomSettings(roomId) {
        return (await this.parent.request(`room/${roomId}/settings`));
    }
}