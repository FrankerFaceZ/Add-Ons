<template>
	<div
		:class="{'tw-form-required': ! hasName}"
		class="tw-flex tw-align-items-center tw-mg-y-05"
	>
		<label :for="'team$' + value.id">
			{{ t('addons.deck.edit.team', 'Team:') }}
		</label>
		<input
			:id="'team$' + value.id"
			v-model.trim="value.settings.name"
			class="tw-flex-grow-1 tw-border-radius-medium tw-font-size-6 tw-pd-x-1 tw-pd-y-05 tw-input"
		>
	</div>
</template>

<script>

export default {
	props: ['value', 'type', 'settings', 'inst'],

	computed: {
		hasName() {
			return this.value.settings.name && this.value.settings.name.length > 0
		}
	}
}

</script>