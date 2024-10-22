<template>
	<bd-card
        :class="'bd--offline-card'"

		:avatar="settings.show_avatars ? avatar : null"
		:avatarTitle="item.displayName"
		:avatarLink="url"
	>
		<template #subtitles>
			<p class="tw-c-text-alt tw-ellipsis">
				<react-link class="tw-interactive ffz-link ffz-link--inherit" :href="url">{{ item.displayName }}</react-link>
			</p>
            <p class="tw-c-text-alt-2">
                {{ t('deck.offline', 'Offline') }}
            </p>
		</template>
	</bd-card>
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
	}

}

</script>