import { TWIR_APP_ID } from './settings.js';

export class Badges extends FrankerFaceZ.utilities.module.Module {
	constructor(...args) {
		super(...args);

		this.inject('chat');
		this.inject('chat.badges');
		this.inject('settings');

		this.badgeIds = new Set();

		// twitchbot badge for TwirApp
		this.chat.getUser(TWIR_APP_ID).addBadge('ffz', 2);
	}

	onDisable() {
		this.unloadBadges();
	}

	toggleBadges(enabled) {
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
		const badges = await this.parent.twir_api.badges.getBadges();
		for (const badge of badges) {
			if (!badge.users.length) return;
			const badgeId = this.registerBadge(badge);
			this.badges.setBulk('addon.twir', badgeId, badge.users);
		}

		this.emit('chat:update-lines');
	}

	registerBadge(badge) {
		const badgeId = `addon.twir.badge_${badge.id}`;
		this.badgeIds.add(badgeId);

		this.badges.loadBadgeData(badgeId, {
			id: badgeId,
			name: badge.name,
			title: badge.name,
			click_url: 'https://twir.app',
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
}
