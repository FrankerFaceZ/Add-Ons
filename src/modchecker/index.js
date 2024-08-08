class Modchecker extends Addon {
	constructor(...args) {
		super(...args);
		this.inject('chat.badges');

		this.corsProxy = 'https://relaxo.dev/?a=';
		this.domain = 'https://modchecker.com';
		this.apiBase = `${this.corsProxy}${this.domain}/api/v1`;
		this.badgeBase = this.domain;

		this.clickRedirectLink = this.domain;
		this.namespace = 'addon.modchecker';
		this.badgesInfo = [
			{
				textId: 'admin',
				id: 11,
				name: 'Modchecker Admin',
				ffzSlot: 120,
			},
			{
				textId: 'contributor',
				id: 12,
				name: 'Modchecker Contributor',
				ffzSlot: 121,
			},
			{
				textId: 'topdonator',
				id: 10,
				name: 'Modchecker Top Donator',
				ffzSlot: 122,
			},
			{
				textId: 'donator',
				id: 8,
				name: 'Modchecker Donator',
				ffzSlot: 123,
			},
		];

		this.badgeIds = new Set();
	}

	async onEnable() {
		const promises = this.badgesInfo.map(badgeInfo => this.processBadge(badgeInfo));
		await Promise.all(promises);
		this.emit('chat:update-lines');
	}

	onDisable() {
		this.unloadBadges();
	}

	async processBadge(badgeInfo) {
		const data = await this.fetchBadgeData(badgeInfo.id);

		const usersIds = data.map(item => item.id);
		const firstBadgePath = data[0]?.badges[0]?.path;

		if (!firstBadgePath) {
			this.error(`Badge path not found for badge ${badgeInfo.textId}`);
			return;
		}

		badgeInfo.url = `${this.badgeBase}${firstBadgePath}`;

		const badgeId = this.registerBadge(badgeInfo);
		this.badges.setBulk(this.namespace, badgeId, usersIds);
	}

	registerBadge(badge) {
		const badgeId = `${this.namespace}.badge-${badge.textId}`;
		this.badgeIds.add(badgeId);

		this.badges.loadBadgeData(badgeId, {
			id: badgeId,
			name: badge.name,
			title: badge.name,
			click_url: this.clickRedirectLink,
			image: badge.url,
			urls: {
				1: badge.url,
				2: badge.url,
				3: badge.url,
			},
			slot: badge.ffzSlot,
		});

		return badgeId;
	}

	unloadBadges() {
		for (const badgeId of this.badgeIds.values()) {
			this.badges.removeBadge(badgeId);
		}

		this.emit('chat:update-lines');
	}

	fetchBadgeData(badgeId) {
		const urlPath = `users?badgeId=${badgeId}`;
		return this.request(urlPath);
	}
	
	async request(path, defaultValue = []) {
		try {
			const response = await fetch(`${this.apiBase}/${path}`);

			if (response.ok) {
				return await response.json();
			}
		} catch (err) {
			this.log.error(err);
		}

		return defaultValue;
	}
}

Modchecker.register();
