class Modchecker extends Addon {
	constructor(...args) {
		super(...args);
		this.inject('chat.badges');
		this.inject('settings');

		this.domain = 'https://modchecker.com';
		this.apiBase = `${this.domain}/api/v1`;
		this.badgeBase = this.domain;

		this.clickRedirectLink = this.domain;
		this.badgeIds = new Set();

		const autoRefreshId = `${this.name}.refresh_interval`
		this.settings.add(autoRefreshId, {
			default: 300000,
			ui: {
				path: 'Add-Ons > Modchecker',
				title: 'Refresh interval',
				description: 'Seconds between automatic badge refreshes. Set to 0 to disable. (Default: 5 minutes, Minimum: 20 seconds)',
				component: 'setting-text-box',
				process: 'to_int',
				bounds: [0],
			},
		});
		this.settings.getChanges(autoRefreshId, value => this.autoRefresh(value));
	}

	onEnable() {
		this.loadBadges();
	}

	onDisable() {
		this.unloadBadges();
	}
	
	async loadBadges() {
		const badges = await this.fetchBadgeData();
		this.log.info('Loaded', badges.length, 'badges');

		for (const badge of badges) {
			const badgeId = this.registerBadge(badge);
			this.badges.setBulk(this.name, badgeId, badge.users);
		}

		this.emit('chat:update-lines');
	}

	unloadBadges() {
		for (const badgeId of this.badgeIds.values()) {
			this.badges.removeBadge(badgeId);
		}

		this.emit('chat:update-lines');
	}

	autoRefresh(secondsInterval) {
		clearInterval(this.refreshTimerId);

		if (secondsInterval === 0) {
			return this.refreshTimerId = null;
		} else if (secondsInterval < 20) {
			secondsInterval = 20;
		}

		this.refreshTimerId = setInterval(() => this.loadBadges(), secondsInterval * 1000);
	}

	createBadgeId(badgeName) {
		// 1. translate into lower case
		// 2. remove `modchecker` including spaces around
		// 3. replace spaces with dashes
		badgeName = badgeName.toLowerCase().replace(/\s*modchecker\s*/g, '').replace(/\s+/g, '-');

		const badgeId = `${this.name}.badge-${badgeName}`;
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
