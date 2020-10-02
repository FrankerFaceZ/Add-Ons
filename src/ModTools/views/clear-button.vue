<template lang="html">
	<section class="ffz--widget">
		<button
			class="tw-button"
			@click="clear"
		>
			<span class="tw-button__icon tw-button__icon--left">
				<figure class="ffz-i-trash" />
			</span>
			<span class="tw-button__text">
				{{ t('modtools.highlights-temp-users.clear', 'Clear highlights') }}
			</span>
		</button>
		<p style="padding-top: 5px;">
			{{ userCount() }} users in list
		</p>
	</section>
</template>

<script>
import * as Constants from '../constants.js'
export default {
	props: ['item', 'context'],
	data() {
		return {
		}
	},

	computed:{

	},

	methods: {
		clear(){
			const settings = this.context.getFFZ().resolve('settings')
			settings.provider.delete(Constants.HIGHLIGHT_USERS_KEY)
			this.context.getFFZ().resolve('chat').emit('chat:update-lines')
			this.$forceUpdate();
		},

		userCount(){
			const settings = this.context.getFFZ().resolve('settings');
			return settings.provider.get(Constants.HIGHLIGHT_USERS_KEY,[]).length;
		},
	},
}
</script>