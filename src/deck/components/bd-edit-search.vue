<template>
	<div
		:class="{'tw-form-required': ! hasQuery}"
		class="tw-flex tw-align-items-center tw-mg-y-05"
	>
		<label :for="'query$' + value.id">
			{{ t('addon.deck.edit.search', 'Search:') }}
		</label>
		<input
			:id="'query$' + value.id"
			v-model.trim="value.settings.query"
			class="tw-flex-grow-1 tw-border-radius-medium tw-font-size-6 tw-pd-x-1 tw-pd-y-05 ffz-input"
		>
	</div>
</template>

<script>

export default {
	props: ['value', 'type', 'settings', 'inst'],

	computed: {
		hasQuery() {
			return this.value.settings.query && this.value.settings.query.length > 0
		}
	}
}

</script>