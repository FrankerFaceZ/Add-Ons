export class Api extends FrankerFaceZ.utilities.module.Module {
	constructor(...args) {
		super(...args);

		this.inject(Commands);
		this.inject(Badges);

		this.apiBase = 'https://twir.app/api/v1/public';
	}

	async request(path) {
		try {
			const response = await fetch(`${this.apiBase}/${path}`);
			if (response.ok) {
				return await response.json();
			}
		} catch (err) {
			this.log.error(err);
		}

		return [];
	}
}

export class Commands extends FrankerFaceZ.utilities.module.Module {
	// https://twir.app/api/v1/public/channels/{userId}/commands
	getChannelCommands(userId) {
		return this.parent.request(`channels/${userId}/commands`);
	}
}

export class Badges extends FrankerFaceZ.utilities.module.Module {
	// https://twir.app/api/v1/public/badges
	getBadges() {
		return this.parent.request('badges');
	}
}
