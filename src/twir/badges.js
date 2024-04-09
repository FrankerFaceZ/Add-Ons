// twitch.tv/twirapp
const TWIR_APP_ID = 870280719;

export class Badges extends FrankerFaceZ.utilities.module.Module {
	constructor(...args) {
		super(...args);

		this.inject('chat');
		this.inject('chat.badges');
		this.inject('settings');

		this.badgeIds = new Set();
	}

	updateBadges(enabled) {
		if (enabled) {
			this.loadBadges();
		} else {
			this.unloadBadges();
		}
	}

	unloadBadges() {
		for (const badgeId of this.badgeIds.values()) {
			this.badges.removeBadge(badgeId);
		}

		this.emit('chat:update-lines');
	}

	async loadBadges() {
		const showUserBadges = this.settings.get('addon.twir.user_badges');
		if (!showUserBadges) return;

		// twitchbot badge for TwirApp
		this.chat.getUser(TWIR_APP_ID).addBadge('ffz', 2);

		try {
			const { badges } = await this.parent.api.badges.getBadges();

			for (const [key, badge] of Object.entries(badges)) {
				if (!badge.enabled || !badge.users.length) return;
				const badgeId = this.registerBadge(badge, key);
				this.badgeIds.add(badgeId);

				for (const userId of badge.users) {
					const user = this.chat.getUser(userId);
					user.addBadge('addon.twir', badgeId);
				}
			}
		} catch (err) {
			this.log.error(err);
		}

		this.emit('chat:update-lines');
	}

	registerBadge(badge, key) {
		const badgeId = `addon.twir.badge_${badge.id}`;

		this.badges.loadBadgeData(badgeId, {
			id: badgeId,
			name: badge.name,
			title: badge.name,
			click_url: 'https://twir.app',
			image: badge.file_url,
			urls: {
				1: badge.file_url,
				2: badge.file_url,
				3: badge.file_url
			},
			slot: 100 + Number(key),
			svg: false,
		});

		return badgeId;
	}
}
