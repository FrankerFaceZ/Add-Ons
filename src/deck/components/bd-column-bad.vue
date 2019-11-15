<template>
	<div class="bd--deck-column tw-relative tw-c-background-base tw-border tw-elevation-1 tw-flex-column tw-mg-r-1">
		<div class="bd--width tw-mg-1">
			<h3 class="tw-border-b tw-mg-b-05">
				{{ t('addon.deck.bad-column', 'Invalid Column') }}
			</h3>
			<p>
				{{ t('addon.deck.bad-column.explain', 'This column type ("{type}") is no longer supported and this column cannot be displayed. Please remove it.', {
					type: this.data.type
				}) }}
			</p>
			<div class="tw-mg-t-1">
				<button
					class="tw-button tw-button--text"
					@click="$emit('delete')"
				>
					<span class="ffz-i-trash tw-button__text">
						{{ t('addon.deck.delete', 'Delete') }}
					</span>
				</button>
			</div>
		</div>
	</div>
</template>

<script>

export default {
	props: ['data', 'type', 'settings', 'collapsed']
}

</script>