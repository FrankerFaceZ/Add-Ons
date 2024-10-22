<template>
	<div>
		<div class="tw-flex tw-align-items-center ffz-checkbox bd-checkbox--indent tw-mg-y-05">
			<input
				:id="'show_offline$' + value.id"
				v-model="value.settings.show_offline"
				type="checkbox"
				class="ffz-checkbox__input"
			>
			<label :for="'show_offline$' + value.id" class="ffz-checkbox__label">
				{{ t('addon.deck.show-offline', 'Display offline channels in this column.') }}
			</label>
		</div>
	</div>
</template>

<script>

export default {
	props: ['value']
}

</script>