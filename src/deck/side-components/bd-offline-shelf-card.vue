<template>
	<bd-shelf-card
        :link="url"
        :class="'bd--offline-card'"

        :title="item.displayName"

		:avatar="settings.show_avatars ? avatar : null"
		:avatarTitle="item.displayName"
		:avatarLink="url"

        :views="t('deck.offline', 'Offline')"
	/>
</template>

<script>

export default {
	props: ['item', 'settings', 'inst'],

	computed: {
        url() {
            return this.getReactURL('user', this.item.login)
        },

		avatar() {
            return this.item.profileImageURL;
		}
	},

    methods: {
        renderTooltip(target, tip) {
            return this.t('deck.offline', 'Offline');
        }
    }

}

</script>