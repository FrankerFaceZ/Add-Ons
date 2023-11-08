<template>
	<div
		:class="`preview-card-stat--${type}${type !== 'live' ? ' tw-c-background-overlay' : ''}`"
		class="preview-card-stat tw-align-items-center tw-border-radius-small tw-c-text-overlay tw-flex tw-font-size-6 tw-justify-content-center tw-pd-x-05"
	>
		<div v-if="useIcon || !!$scopedSlots['icon']" class="tw-align-items-center tw-flex tw-mg-r-05">
			<slot name="icon" />
			<figure v-if="useIcon" :class="useIcon" />
		</div>
		<span>{{ useLabel }}</span>
	</div>
</template>

<script>

const types = {
	live: ['LIVE', null],
	host: ['Hosting', 'stream-type-indicator__hosting-dot tw-border-radius-rounded'],
	rerun: ['Rerun', 'ffz-i-cw'],
	RECORDING: ['In-Progress Stream', 'ffz-i-camera'],
	ARCHIVE: ['Past Broadcast'],
	HIGHLIGHT: ['Highlight'],
	CLIP: ['Clip']
};

export default {
	props: {
		type: {
			type: String,
			required: true
		},
		icon: {
			type: String,
			required: false
		},
		label: {
			type: String,
			required: false
		}
	},

	computed: {
		useIcon() {
			if ( this.icon )
				return this.icon;

			const type = types[this.type];
			return type && type[1]
		},

		useLabel() {
			if ( this.label )
				return this.label;

			const type = types[this.type];
			return type && this.t(`addon.deck.type.${  this.type}`, type[0]);
		}
	}
}

</script>