export class Badges extends FrankerFaceZ.utilities.module.Module {
    constructor(...args) {
        super(...args);

        this.inject('chat');
        this.inject('chat.badges');
        this.inject('settings');

        this.badgeIds = [];

        this.settings.add('addon.turtegbot.badges.enabled', {
            default: true,
            ui: {
                sort: 1,
                path: 'Add-Ons > TurtegBot >> Badges',
                title: 'Badges',
                description: 'Show TurtegBot user badges.\n\n(Per-badge visibilty can be set in [Chat >> Badges > Visibilty](~chat.badges.tabs.visibility))',
                component: 'setting-check-box'
            }
        });
    }

    onEnable() {
        this.settings.getChanges('addon.turtegbot.badges.enabled', enabled => {
            if (enabled) this.loadBadges();
            else this.unloadBadges();
        });

        this.log.info("Badges loaded.");
    }

    onDisable() {
        this.unloadBadges();

        this.log.info("Badges unloaded.");
    }

    unloadBadges() {
        this.badgeIds.forEach(badgeId => {
            this.badges.deleteBulk('addon.turtegbot', badgeId);
        });
        this.badgeIds = [];

        this.emit('chat:update-lines');
    }

    async loadBadges() {
        if (!this.settings.get('addon.turtegbot.badges.enabled')) return;

        this.badgeIds = [];
        const badges = await this.parent.turtegbot_api.ffz.getBadges();
        for (const badge of badges) {
            const badgeId = this.registerBadge(badge);
            this.badgeIds.push(badgeId);
            this.badges.setBulk('addon.turtegbot', badgeId, badge.users);
            this.log.info(`Loaded badge: ${badgeId}`);
        }
        this.emit('chat:update-lines');
    }

    registerBadge(badge) {
        const badgeId = `addon.turtegbot.badge_${badge.id}`;

        this.badges.loadBadgeData(badgeId, {
            id: badgeId,
            title: badge.title,
            slot: 68,
            image: badge.image,
            urls: badge.urls,
            click_url: 'https://turteg.xslash.ovh/',
            svg: badge.svg,
        });
        
        return badgeId;
    }
}