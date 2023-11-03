export default class Badges extends FrankerFaceZ.utilities.module.Module {
	constructor(...args) {
		super(...args);
	
		this.inject('settings');
		this.inject('chat');
		this.inject('i18n');
		this.injectAs('chat_badges', 'chat.badges');
	
		this.settings.addUI('addon.seventv_emotes.badges', {
			path: 'Add-Ons > 7TV Emotes >> User Cosmetics',
			component: 'setting-text',
			force_seen: true,
			content: () => this.i18n.t(
				'addon.seventv_emotes.badges.info',
				'**Badge visibilty has moved.**\n\nYou can set it in [Chat >> Badges > Visibilty > Add-Ons](~chat.badges.tabs.visibility)'
			)
		});

		this.loadedBadges = new Set();
	}

	getBadgeID(badge_id) {
		return `addon.seventv_emotes.badge-${badge_id}`;
	}

	addBadge(badge) {
		const host = badge.host.url;

		const id = `addon.seventv_emotes.badge-${badge.id}`;

		if (this.loadedBadges.has(id)) return;

		this.chat_badges.loadBadgeData(id, {
			id: badge.id,
			title: badge.tooltip,
			slot: 69,
			image: `${host}/1x`,
			urls: {
				1: `${host}/1x`,
				2: `${host}/2x`,
				4: `${host}/3x`
			},
			svg: false
		});

		this.loadedBadges.add(id);
	}

	addUserBadgeByID(user_id, badge_id) {
		this.chat.getUser(user_id).addBadge('addon.seventv-emotes', this.getBadgeID(badge_id));

		this.emit('chat:update-lines-by-user', user_id);
	}

	addUserBadge(data) {
		const badge_id = data.ref_id || data.id;
		const user = data.user?.connections?.find(c => c.platform === 'TWITCH');

		if (!user?.id) return;

		this.addUserBadgeByID(user.id, badge_id);
	}

	removeUserBadgeByID(user_id, badge_id) {
		this.chat.getUser(user_id).removeBadge('addon.seventv-emotes', this.getBadgeID(badge_id));

		this.emit('chat:update-lines-by-user', user_id);
	}

	removeUserBadge(data) {
		const badge_id = data.ref_id || data.id;
		const user = data.user?.connections?.find(c => c.platform === 'TWITCH');

		if (!user?.id) return;

		this.removeUserBadgeByID(user.id, badge_id);
	}
}