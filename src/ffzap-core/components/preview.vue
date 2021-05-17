<template lang="html">
	<div>
		<button
			class="tw-mg-l-05 tw-mg-y-05 tw-button tw-button--text ffz-il-tooltip__container tw-relative"
			@click="click"
		>
			<span class="tw-button__text ffz-i-play" />
			<div class="ffz-il-tooltip ffz-il-tooltip--down ffz-il-tooltip--align-right">
				{{ t('setting.preview', 'Preview') }}
			</div>
		</button>
	</div>
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