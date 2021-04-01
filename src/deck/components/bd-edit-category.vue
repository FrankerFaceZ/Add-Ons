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
			<div class="tw-pd-x-1 tw-pd-y-05">
				<div class="tw-card tw-relative">
					<div class="tw-align-items-center tw-flex tw-flex-nowrap tw-flex-row">
						<div class="ffz-card-img ffz-card-img--size-3 tw-flex-shrink-0 tw-overflow-hidden">
							<aspect :ratio="1/1.33">
								<img class="tw-image" :alt="slot.item.displayName" :src="slot.item.boxArtURL" />
							</aspect>
						</div>
						<div class="tw-card-body tw-overflow-hidden tw-relative">
							<p class="tw-pd-x-1">{{ slot.item.displayName }}</p>
						</div>
					</div>
				</div>
			</div>
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