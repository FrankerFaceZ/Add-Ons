<template>
	<div>
		<div class="tw-flex tw-align-items-center tw-checkbox bd-checkbox--indent tw-mg-y-05">
			<input
				:id="'no_live$' + value.id"
				v-model="value.settings.no_live"
				type="checkbox"
				class="tw-checkbox__input"
			>
			<label :for="'no_live$' + value.id" class="tw-checkbox__label">
				{{ t('addon.deck.no-live', "Do not display the channel's live broadcast when they are streaming.") }}
			</label>
		</div>
	</div>
</template>

<script>

export default {
	props: ['value', 'type', 'settings', 'inst']
}

</script>