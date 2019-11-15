<template>
	<div class="tw-flex tw-align-items-center tw-mg-y-05">
		<label :for="'count$' + value.id">
			{{ t('addon.deck.edit.count', 'Count:') }}
		</label>
		<input
			:id="'count$' + value.id"
			v-model.number="value.settings.count"
			type="range"
			min="1"
			max="50"
			step="1"
			class="tw-range tw-range--unfilled tw-flex-grow-1"
			@wheel="scroll"
		>
		<div class="tw-mg-l-1">
			{{ value.settings.count }}
		</div>
	</div>
</template>

<script>

export default {
	props: ['value', 'type', 'settings', 'inst'],

	methods: {
		scroll(event) {
			if ( event.deltaY === 0 )
				return;

			const delta = event.deltaY > 0 ? 1 : -1;
			let new_val = this.value.settings.count + delta;

			if ( new_val < 0 )
				new_val = 0;
			else if ( new_val > 10 )
				new_val = 10;

			this.value.settings.count = new_val;
			event.preventDefault();
		}
	}
}

</script>