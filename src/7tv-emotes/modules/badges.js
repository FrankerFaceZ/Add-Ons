export default class Badges extends FrankerFaceZ.utilities.module.Module {
	constructor(...args) {
		super(...args);

		this.inject("..api");

		this.inject('settings');
		this.inject('chat.badges');

		this.settings.add('addon.seventv_emotes.badges', {
			default: true,
			ui: {
				path: 'Add-Ons > 7TV Emotes >> User Cosmetics',
				title: 'Badges',
				description: 'Show 7TV user badges. (Per-badge visibilty can be set in [Chat >> Badges > Visibilty > Add-Ons](~chat.badges))',
				component: 'setting-check-box',
			}
		});

		this.bulkBadgeIDs = new Set();
	}
	
	onEnable() {
		this.on('settings:changed:addon.seventv_emotes.badges', () => this.updateBadges());

		this.updateBadges();
	}

	async updateBadges() {
		this.removeBadges();

		if (this.settings.get('addon.seventv_emotes.badges')) {
			const badges = await this.api.fetchBadges();
			for (const badge of badges) {
				const id = `addon.seventv_emotes.badge-${badge.id}`;
				this.badges.loadBadgeData(id, {
					id: badge.id,
					title: badge.tooltip,
					slot: 69,
					image: badge.urls[1][1],
					urls: {
						1: badge.urls[2][1]
					},
					svg: false
				});

				this.badges.setBulk('addon.seventv_emotes', id, badge.users);
				this.bulkBadgeIDs.add(id);
			}
		}
	}

	removeBadges() {
		for (let id of this.bulkBadgeIDs) {
			this.badges.deleteBulk("addon.seventv_emotes", id);
			delete this.badges.badges[id];
		}

		this.badges.buildBadgeCSS();

		this.bulkBadgeIDs.clear();
	}
}