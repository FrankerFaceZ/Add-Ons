class Modchecker extends Addon {
	constructor(...args) {
		super(...args);
		this.inject('chat.badges');

		this.domain = 'https://modchecker.com';
		this.apiBase = `${this.domain}/api/v1`;
		this.badgeBase = this.domain;

		this.clickRedirectLink = this.domain;
		this.namespace = 'addon.modchecker';
		this.badgeIds = new Set();
	}

	onEnable() {
		this.loadBadges();
	}
	
	onDisable() {
		this.unloadBadges();
	}
	
	async loadBadges() {
		const badges = await this.fetchBadgeData();

		for (const badge of badges) {
			const badgeId = this.registerBadge(badge);
			this.badges.setBulk(this.namespace, badgeId, badge.users);
		}

		this.emit('chat:update-lines');
	}

	unloadBadges() {
		for (const badgeId of this.badgeIds.values()) {
			this.badges.removeBadge(badgeId);
		}

		this.emit('chat:update-lines');
	}

	createBadgeId(badgeName) {
		// 1. translate into lower case
		// 2. remove `modchecker` including spaces around
		// 3. replace spaces with dashes
		badgeName = badgeName.toLowerCase().replace(/\s*modchecker\s*/g, '').replace(/\s+/g, '-');

		const badgeId = `${this.namespace}.badge-${badgeName}`;
		this.badgeIds.add(badgeId);
		return badgeId;
	}

	registerBadge(badge) {
		const badgeId = this.createBadgeId(badge.name);

		this.badges.loadBadgeData(badgeId, {
			id: badgeId,
			name: badge.name,
			title: badge.name,
			click_url: this.clickRedirectLink,
			image: badge.path,
			urls: {
				1: badge.path,
				2: badge.path,
				3: badge.path,
			},
			slot: badge.ffzSlot,
		});

		return badgeId;
	}

	fetchBadgeData() {
		return this.request('chatBadges');
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
