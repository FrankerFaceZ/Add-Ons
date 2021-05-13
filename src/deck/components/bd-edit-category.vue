<template>
	<div class="tw-flex tw-align-items-center tw-mg-y-05">
		<label
			:for="'game$' + value.id"
			:class="{'tw-form-required': ! hasName}"
		>
			{{ t('addon.deck.edit.game', 'Category:') }}
		</label>
		<autocomplete
			:inputId="'game$' + value.id"
			:items="fetchGames"
			:value="value.settings.name"
			:suggestOnFocus="true"
			:escapeToClear="false"
			class="tw-full-width"
			@selected="onSelected"
			v-slot="slot"
		>
			<autocomplete-game :game="slot.item" />
		</autocomplete>
	</div>
</template>

<script>

import { getLoader } from '../data';

const {deep_copy} = FrankerFaceZ.utilities.object;

export default {
	props: ['value', 'type', 'settings', 'inst'],

	computed: {
		hasName() {
			return this.value.settings.name && this.value.settings.name.length > 0
		}
	},

	methods: {
		async fetchGames(query) {
			const data = await getLoader().getMatchingCategories(query);
			if ( ! data || ! data.items )
				return [];

			return deep_copy(data.items);
		},

		onSelected(item) {
			this.value.settings.name = item.name;
		}
	}
}

</script>