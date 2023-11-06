const SUB_BADGE_REGEX = /sub(?:\d+|founder)/;

export default class Badges extends FrankerFaceZ.utilities.module.Module {
	constructor(...args) {
		super(...args);
	
		this.inject('settings');
		this.inject('chat');
		this.inject('i18n');
		this.injectAs('chat_badges', 'chat.badges');

		this.settings.add('addon.seventv_emotes.badges', {
			default: true,
			ui: {
				path: 'Add-Ons > 7TV Emotes >> User Cosmetics',
				title: 'Badges',
				description: 'Show 7TV user badges.\n\n(Per-badge visibilty can be set in [Chat >> Badges > Visibilty > Add-Ons](~chat.badges.tabs.visibility))',
				component: 'setting-check-box',
			}
		});

		this.badges = new Map();
		this.badgeToUsers = new Map();

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

	onEnable() {
		this.settings.getChanges('addon.seventv_emotes.badges', enabled => this.updateBadges(enabled));
	}

	getUsersForBadge(badge_id) {
		const set = this.badgeToUsers.get(badge_id);
		return set || new Set();
	}

	updateBadges(enabled) {
		if (!enabled) {
			for(const user of this.chat.iterateUsers()) {
				user.removeAllBadges('addon.seventv-emotes');
			}
		}
		else {
			for (const badge_id of this.badgeToUsers.keys()) {
				const userSet = this.getUsersForBadge(badge_id);
				for (const user_id of userSet) {
					const user = this.chat.getUser(user_id);
					user.addBadge('addon.seventv-emotes', badge_id);
				}
			}
		}

		this.emit('chat:update-lines');
	}

	getBadgeID(badge_id) {
		return `addon.seventv_emotes.badge-${badge_id}`;
	}

	addBadge(badge) {
		const host = badge.host.url;

		const id = this.getBadgeID(badge.id);

		if (this.badges.has(id)) return;

		let title = badge.tooltip;
		let subtext;
		if (title.includes('Subscriber')) {
			const split = title.split(' (');
			title = split[0];
			subtext = `(${split[1]}`;
		}

		const badgeData = {
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
			svg: false,
			click_url: 'https://7tv.app/',
		};

		this.chat_badges.loadBadgeData(id, badgeData);

		this.badges.set(id, badgeData);
	}

	addUserBadgeByID(user_id, badge_id) {
		badge_id = this.getBadgeID(badge_id);

		const user = this.chat.getUser(user_id);
		const has_badge = user.getBadge(badge_id);
		if (has_badge) return;

		const userBadges = this.getUsersForBadge(badge_id);
		userBadges.add(user_id);
		this.badgeToUsers.set(badge_id, userBadges);

		if (!this.settings.get('addon.seventv_emotes.badges')) return;

		user.addBadge('addon.seventv-emotes', badge_id);

		this.emit('chat:update-lines-by-user', user_id);
	}

	addUserBadge(data) {
		const badge_id = data.ref_id || data.id;
		const user = data.user?.connections?.find(c => c.platform === 'TWITCH');

		if (!user?.id) return;

		this.addUserBadgeByID(user.id, badge_id);
	}

	removeUserBadgeByID(user_id, badge_id) {
		badge_id = this.getBadgeID(badge_id);

		const user = this.chat.getUser(user_id);
		const has_badge = user.getBadge(badge_id);
		if (!has_badge) return;

		const userBadges = this.getUsersForBadge(badge_id);
		userBadges.delete(user_id);
		this.badgeToUsers.set(badge_id, userBadges);

		user.removeBadge('addon.seventv-emotes', badge_id);

		this.emit('chat:update-lines-by-user', user_id);
	}

	removeUserBadge(data) {
		const badge_id = data.ref_id || data.id;
		const user = data.user?.connections?.find(c => c.platform === 'TWITCH');

		if (!user?.id) return;

		this.removeUserBadgeByID(user.id, badge_id);
	}
}