<template lang="html">
	<section class="ffz--widget">
		<button
			class="tw-button tw-mg-x-1"
			@click="clear"
		>
			<span class="tw-button__icon tw-button__icon--left">
				<figure class="ffz-i-trash" />
			</span>
			<span class="tw-button__text">
				{{ t('hlaction.highlights-temp.clear', 'Clear highlights') }}
			</span>
		</button>
		</setting-color-box>
	</section>
</template>

<script>
export default {
	props: ['item', 'context'],
	data() {
		return {
			error_desc: null,
			error: false,
			message: null
		}
	},
	methods: {
		clear(){
			const settings = this.context.getFFZ().resolve('settings')
			settings.provider.delete('hlaction.highlight-temp')
			this.context.getFFZ().resolve('chat').emit('chat:update-lines')
		},
	},
}
</script>