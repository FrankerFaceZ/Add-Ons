export class Api extends FrankerFaceZ.utilities.module.Module {
	constructor(...args) {
		super(...args);

		this.inject(Commands);
		this.inject(Badges);

		this.apiBase = 'https://twir.app/api/v1/api.';
	}

	async request(path, body = {}) {
		try {
			const response = await fetch(`${this.apiBase}${path}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});

			if (response.ok) {
				const json = await response.json();
				return json;
			}
		} catch (err) {
			this.log.error(err);
		}

		return null;
	}
}

export class Commands extends FrankerFaceZ.utilities.module.Module {
	// https://twir.app/api/v1/api.UnProtected/GetChannelCommands
	getChannelCommands(channelId) {
		return this.parent.request('UnProtected/GetChannelCommands', {
			channelId,
		});
	}
}

export class Badges extends FrankerFaceZ.utilities.module.Module {
	// https://twir.app/api/v1/api.UnProtected/GetBadgesWithUsers
	getBadges() {
		return this.parent.request('UnProtected/GetBadgesWithUsers');
	}
}
