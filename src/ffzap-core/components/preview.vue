<template lang="html">
	<button
		class="tw-mg-l-05 tw-mg-y-05 tw-button tw-button--text tw-tooltip__container tw-relative"
		@click="click"
	>
		<span class="tw-button__text ffz-i-right-dir" />
		<div class="tw-tooltip tw-tooltip--down tw-tooltip--align-right">
			{{ t('setting.preview', 'Preview') }}
		</div>
	</button>
</template>

<script>

export default {
	props: ['item', 'context', 'value'],

	methods: {
		click() {
			this.item.onUIChange(this.value)
		}
	}
}

</script>