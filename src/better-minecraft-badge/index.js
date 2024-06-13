class BetterMineBadge extends Addon {
	constructor(...args) {
		super(...args);
		this.inject('chat.badges');

		this.idBadge = 'minecraft-15th-anniversary-celebration';
		this.newBadgeUrl = 'https://cdn.frankerfacez.com/emoticon/753195';
		this.originalBadgeUrl = null;
	}

	onEnable() {
		this._updateTwitchBadges = this.badges.updateTwitchBadges;
		this.badges.updateTwitchBadges = (badges, ...args) => {
			// We guarantee that if the code breaks, it will not break the FFZ API
			try {
				this.rememberOriginalBadgeUrl(badges);
				badges = this.replaceBadge(badges, this.idBadge, this.newBadgeUrl);
			} catch (e) {
				this.log.error(e);
			}
			this._updateTwitchBadges(badges, ...args);
		};

		// If we didn’t have time to replace the function before calling it, we call it ourselves
		if (this.getBadgeUrl(this.idBadge) !== this.newBadgeUrl && this.badges.twitch_badges) {
			this.badges.updateTwitchBadges(this.badges.twitch_badges);
		}
	}

	onDisable() {
		this.badges.updateTwitchBadges = this._updateTwitchBadges;
		const badges = this.replaceBadge(this.badges.twitch_badges, this.idBadge, this.originalBadgeUrl);
		this.badges.updateTwitchBadges(badges);
	}

	getBadgeUrl(idBadge, badgesSet = null) {
		const badges = badgesSet || this.badges.twitch_badges || {};

		if (!badges || Object.keys(badges).length === 0) return null;

		let targetBadge;
		if (Array.isArray(badges)) targetBadge = badges.find(item => item.setID === idBadge);
		else targetBadge = badges[idBadge][1];

		if (!targetBadge?.image1x) return null;

		return targetBadge.image1x.slice(0, -2); // remove '/1'
	}

	rememberOriginalBadgeUrl(badgesSet = null) {
		if (this.originalBadgeUrl) return;

		const badgeUrl = this.getBadgeUrl(this.idBadge, badgesSet);
		if (badgeUrl) this.originalBadgeUrl = badgeUrl;
	}

	replaceBadge(badges, idBadge, newBadgeUrl) {
		if (Array.isArray(badges) && badges?.length) {
			const newBadgesArray = JSON.parse(JSON.stringify(badges)); // avoid only-read

			const targetBadge = newBadgesArray.find(item => item.setID === idBadge);

			this._replaceBadgeImages(targetBadge, newBadgeUrl);
			return newBadgesArray;
		} else if (badges[idBadge]) {
			const targetBadge = badges[idBadge][1];

			this._replaceBadgeImages(targetBadge, newBadgeUrl);
			return badges;
		}
	}

	_replaceBadgeImages(badge, newBaseUrl) {
		if (!badge) return;
		badge.image1x = `${newBaseUrl}/1`;
		badge.image2x = `${newBaseUrl}/2`;
		badge.image4x = `${newBaseUrl}/${newBaseUrl.includes('cdn.frankerfacez.com') ? '4' : '3'}`;
	}
}

BetterMineBadge.register();
