import { SETTING_KEYS } from './settings.js';

const NAMESPACE = 'addon.starlit';
const FIRST_SLOT = 70;

export class Badges extends FrankerFaceZ.utilities.module.Module {
	constructor(...args) {
		super(...args);

		this.inject('settings');
		this.inject('chat');
		this.inject('chat.badges');

		this.known = new Set();
	}

	onEnable() {
		this.settings.getChanges(SETTING_KEYS.badges, enabled => this.apply(enabled));
		this.on('..api:update', () => this.apply(this.settings.get(SETTING_KEYS.badges)));
	}

	onDisable() {
		this.clear();
	}

	badgeId(id) {
		return `addon.starlit.${id}`;
	}

	clear() {
		for (const id of this.known) this.badges.setBulk(NAMESPACE, id, []);
		this.emit('chat:update-lines');
	}

	load(badge, slot) {
		const id = this.badgeId(badge.id);
		if (this.known.has(id)) return id;
		this.badges.loadBadgeData(id, {
			id,
			name: badge.title,
			title: badge.title,
			tooltipExtra: () => this.parent.starlit_chromas.badgeExtra(badge),
			click_url: 'https://starlit.gg',
			image: badge.urls[1],
			urls: { 1: badge.urls[1], 2: badge.urls[2], 4: badge.urls[4] },
			svg: false,
			slot,
		});
		this.known.add(id);
		return id;
	}

	apply(enabled) {
		if (!enabled) {
			this.clear();
			return;
		}

		const api = this.parent.starlit_api;
		const templates = new Map(api.badgeCatalog.map(b => [b.id, b]));
		for (const user of api.users.values()) {
			for (const badge of user.badges ?? []) if (!templates.has(badge.id)) templates.set(badge.id, badge);
		}
		const slots = new Map([...templates.keys()].sort().map((id, index) => [id, FIRST_SLOT + index]));
		for (const [id, badge] of templates) this.load(badge, slots.get(id));

		const wearers = new Map();
		for (const user of api.users.values()) {
			for (const badge of user.badges ?? []) {
				const id = this.load(badge, slots.get(badge.id));
				const set = wearers.get(id) ?? [];
				set.push(user.platform_id);
				wearers.set(id, set);
			}
		}

		for (const id of this.known) {
			this.badges.setBulk(NAMESPACE, id, wearers.get(id) ?? []);
		}

		this.emit('chat:update-lines');
	}
}
