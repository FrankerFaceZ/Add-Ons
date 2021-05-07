<template>
	<div class="tw-flex tw-align-items-start tw-mg-y-05">
		<label
			:for="'channels$' + id"
			:class="{'tw-form-required': ! hasChannels}"
		>
			{{ t('addon.deck.edit.channels', 'Channels:') }}
		</label>

		<bd-channel-selector
			v-model="value.settings.ids"
			:input-id="'channels$' + id"
			class="tw-full-width"
		/>
	</div>
</template>

<script>

const {generateUUID} = FrankerFaceZ.utilities.object;

export default {
	props: ['value', 'type', 'settings', 'inst'],

	data() {
		return {
			id: generateUUID()
		}
	},

	computed: {
		hasChannels() {
			return this.value?.settings?.ids?.length > 0;
		}
	}
}

</script>