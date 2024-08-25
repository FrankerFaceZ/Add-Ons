class ChatterinoHomies extends Addon {
    constructor(...args) {
        super(...args);

        this.inject('chat');
        this.inject('chat.badges');

        this.badgeUrls = [
           'https://itzalex.github.io/badges',
           'https://itzalex.github.io/badges2'
        ];
        this.maxBadgeId = -1;
    }

    onEnable() {
        this.updateBadges();
    }

    onDisable() {
        this.removeBadges();
    }

    getIdFromIndex(index) {
        return `add_ons.chatterino_homies.badge-${index}`;
    }

    async fetchAndMergeBadges() {
        try {
            const responses = await Promise.all(this.badgeUrls.map(url => fetch(url)));
            const data = await Promise.all(responses.map(res => res.json()));
            return this.mergeData(...data);
        } catch (error) {
            console.error('Error fetching badges:', error);
            return [];
        }
    }

    mergeData(...dataArrays) {
        const mergedArray = [];

        dataArrays.forEach(data => {
            (data.badges || []).forEach(badge => {
                const existingObj = mergedArray.find(obj => obj.tooltip === badge.tooltip);
                if (existingObj) {
                    if (badge.users && badge.users.length) existingObj.users.push(...badge.users);
                } else {
                    mergedArray.push({
                        userId: badge.id,
                        tooltip: badge.tooltip,
                        image1: badge.image1,
                        image2: badge.image2,
                        image3: badge.image3,
                        users: badge.users || []
                    });
                }
            });
        });

        return mergedArray;
    }

    async updateBadges() {
        this.removeBadges();

        const badges = await this.fetchAndMergeBadges();
        this.maxBadgeId = badges.length - 1;

        badges.forEach((badge, i) => {
            const badgeId = this.getIdFromIndex(i);
            this.badges.loadBadgeData(badgeId, {
                id: badge.userId,
                title: badge.tooltip,
                slot: 78,
                image: badge.image1,
                urls: {
                    1: badge.image1,
                    2: badge.image2,
                    4: badge.image3,
                },
                click_url: 'https://chatterinohomies.com/',
                svg: false,
            });
            this.badges.setBulk('add_ons.chatterino_homies', badgeId, badge.users);
        });

        this.emit('chat:update-lines');
    }

    removeBadges() {
        for (let i = 0; i <= this.maxBadgeId; i++) {
            this.badges.deleteBulk('add_ons.chatterino_homies', this.getIdFromIndex(i));
        }
        this.maxBadgeId = -1;
    }
}

ChatterinoHomies.register();