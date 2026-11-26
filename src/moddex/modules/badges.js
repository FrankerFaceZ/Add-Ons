export default class Badges extends FrankerFaceZ.utilities.module.Module {
	static slot = 44;

	constructor(...args) {
		super(...args);

		this.injectAs('chatBadges', 'chat.badges');

		this.list = [];
	}

	onEnable() {
		this.reload();
	}

	onDisable() {
		this.clear();
	}

	idFor(slug) {
		return `addon.moddex.badge-${slug}`;
	}

	find(slug) {
		return this.list.find(badge => badge.slug === slug);
	}

	async reload() {
		let badges;

		try {
			const response = await fetch('https://api.moddex.tv/v1/chat-badges');

			if (!response.ok) throw new Error(`moddex.tv answered ${response.status}`);

			badges = await response.json();
		} catch (error) {
			this.log.error('could not read the badges', error);
			return;
		}

		if (this.enabled) this.replace(badges);
	}

	replace(badges) {
		if (!Array.isArray(badges)) {
			this.log.error('that was not a list of badges');
			return;
		}

		this.remove();
		this.list = badges.map(badge => ({...badge, users: badge.users.map(String)}));

		for (const badge of this.list) {
			const id = this.idFor(badge.slug);

			this.chatBadges.loadBadgeData(id, {
				id,
				name: badge.name,
				title: badge.name,
				click_url: 'https://moddex.tv',
				image: badge.images[1],
				urls: badge.images,
				slot: Badges.slot,
				svg: false
			});

			this.chatBadges.setBulk('addon.moddex', id, badge.users);
		}

		this.emit('chat:update-lines');
	}

	apply({userId, slug}) {
		if (slug && !this.find(slug)) {
			this.reload();
			return;
		}

		const id = String(userId);
		const moved = [];

		for (const badge of this.list) {
			const at = badge.users.indexOf(id);

			if (at === -1) continue;

			badge.users.splice(at, 1);
			moved.push(badge);
		}

		if (slug) {
			const badge = this.find(slug);

			badge.users.push(id);

			if (!moved.includes(badge)) moved.push(badge);
		}

		if (!moved.length) return;

		for (const badge of moved) {
			this.chatBadges.setBulk('addon.moddex', this.idFor(badge.slug), badge.users);
		}

		this.emit('chat:update-lines-by-user', id, null, false, true);
	}

	remove() {
		for (const badge of this.list) {
			const id = this.idFor(badge.slug);

			this.chatBadges.deleteBulk('addon.moddex', id);
			this.chatBadges.removeBadge(id);
		}

		this.list = [];
	}

	clear() {
		if (!this.list.length) return;

		this.remove();
		this.emit('chat:update-lines');
	}
}
