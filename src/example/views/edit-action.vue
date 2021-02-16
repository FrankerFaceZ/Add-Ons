<template lang="html">
	<div>
		<div class="tw-flex tw-align-items-center">
			<label for="edit_thingy">
				{{ t('addon.example.action.thingy', 'Thingy') }}
			</label>

			<input
				id="edit_thingy"
				v-model.number="value.thingy"
				:placeholder="defaults.thingy"
				class="tw-border-radius-medium tw-font-size-6 tw-full-width ffz-input tw-pd-x-1 tw-pd-y-05 tw-mg-y-05"
				type="number"
				@input="$emit('input', value)"
			>
		</div>
	</div>
</template>

<script>

export default {
	props: ['value', 'defaults']
}

</script>