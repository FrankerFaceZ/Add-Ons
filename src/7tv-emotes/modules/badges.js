const SUB_BADGE_REGEX = /sub(?:\d+|founder)/;

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

		// Load the "1 Month" subscriber badge so it can be hidden in FFZ without having to be seen first
		this.addBadge({
			id: '62f97c05e46eb00e438a696a',
			name: '7TV Subscriber - 1 Month',
			tag: 'sub1',
			tooltip: '7TV Subscriber (1 Month)',
			host: {
				url: '//cdn.7tv.app/badge/62f97c05e46eb00e438a696a'
			}
		});
	}

	getBadgeID(badge_id) {
		return `addon.seventv_emotes.badge-${badge_id}`;
	}

	addBadge(badge) {
		const host = badge.host.url;

		const id = `addon.seventv_emotes.badge-${badge.id}`;

		if (this.loadedBadges.has(id)) return;

		let title = badge.tooltip;
		let subtext;
		if (title.includes('Subscriber')) {
			const split = title.split(' (');
			title = split[0];
			subtext = `(${split[1]}`;
		}

		this.chat_badges.loadBadgeData(id, {
			id: badge.id,
			base_id: SUB_BADGE_REGEX.test(badge.tag)
				? 'addon.seventv_emotes.subscriber_badge'
				: undefined,
			title,
			tooltipExtra: () => {
				if (!subtext) return;

				return `\n${subtext}`;
			},
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
		const user = this.chat.getUser(user_id);
		const has_badge = user.getBadge(this.getBadgeID(badge_id));
		if (has_badge) return;

		user.addBadge('addon.seventv-emotes', this.getBadgeID(badge_id));

		this.emit('chat:update-lines-by-user', user_id);
	}

	addUserBadge(data) {
		const badge_id = data.ref_id || data.id;
		const user = data.user?.connections?.find(c => c.platform === 'TWITCH');

		if (!user?.id) return;

		this.addUserBadgeByID(user.id, badge_id);
	}

	removeUserBadgeByID(user_id, badge_id) {
		const user = this.chat.getUser(user_id);
		const has_badge = user.getBadge(this.getBadgeID(badge_id));
		if (!has_badge) return;

		user.removeBadge('addon.seventv-emotes', this.getBadgeID(badge_id));

		this.emit('chat:update-lines-by-user', user_id);
	}

	removeUserBadge(data) {
		const badge_id = data.ref_id || data.id;
		const user = data.user?.connections?.find(c => c.platform === 'TWITCH');

		if (!user?.id) return;

		this.removeUserBadgeByID(user.id, badge_id);
	}
}