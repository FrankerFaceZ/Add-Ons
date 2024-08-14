class ChatterinoBadges extends Addon {
	constructor(...args) {
		super(...args);

		this.inject('chat');
		this.inject('chat.badges');
		this.inject('settings');

        const corsProxy = 'https://corsproxy.io/?'
		this.badgeUrl = `${corsProxy}https://api.chatterino.com/badges`;
		this.maxBadgeId = -1;

		this.settings.add('addon.chatterino_badges.badges', {
			default: true,
			ui: {
				path: 'Add-Ons > Chatterino Badges >> Badges',
				title: 'Enable Badges',
				description: 'Show all available Chatterino user badges',
				component: 'setting-check-box',
			},
			changed: () => this.updateBadges()
		});
	}

	onEnable() {
		this.updateBadges();
	}

	getIdFromIndex(index) {
		return `addon.chatterino_badges.badge-${index}`;
	}

	async updateBadges() {
		this.removeBadges();

		if (this.settings.get('addon.chatterino_badges.badges')) {
			const response = await fetch(this.badgeUrl);
			const badgeData = await response.json();
			const badges = badgeData.badges;
			this.maxBadgeId = badges.length - 1;

			for (let i = 0; i <= this.maxBadgeId; i++) {
				const badge = badges[i];
				const badgeId = this.getIdFromIndex(i);
				this.badges.loadBadgeData(badgeId, {
					id: `chatterino-${i}`,
					title: badge.tooltip,
					slot: 77,
					image: badge.image1,
					urls: {
						1: badge.image1,
						2: badge.image2,
						4: badge.image3,
					},
					click_url: 'https://chatterino.com/',
					svg: false,
				});
				this.badges.setBulk('addon.chatterino_badges', badgeId, badge.users);
			}
		}

		this.emit('chat:update-lines');
	}

	removeBadges() {
		for (let i = 0; i <= this.maxBadgeId; i++) {
			this.badges.deleteBulk('addon.chatterino_badges', this.getIdFromIndex(i));
		}

		this.maxBadgeId = -1;
	}
}

ChatterinoBadges.register();