<template>
	<div class="bd--category-selector tw-flex-column tw-flex-no-wrap" data-a-target="category-dropdown">
		<autocomplete
			v-slot="slot"
			:inputId="inputId"
			:items="getItems"
			:suggestOnFocus="true"
			:clearOnSelect="true"
			:allow-filter="false"
			:placeholder="t('addon.deck.search-categories', 'Search Categories')"
			icon="ffz-i-search"
			@selected="addCategory"
		>
			<autocomplete-game :game="slot.item" />
		</autocomplete>

		<div class="bd--category-selector__list tw-flex tw-flex-wrap tw-c-background-base tw-pd-x-05 tw-pd-b-05 tw-border-l tw-border-b tw-border-r tw-border-radius-medium">
			<div
				v-if="! showCategories || ! showCategories.length"
				class="tw-mg-t-05 tw-c-text-alt-2"
			>
				{{ t('addon.deck.no-categories', 'no categories') }}
				&nbsp;
			</div>
			<div
				v-for="category of showCategories"
				:key="category.id"
				class="tw-inline-block tw-mg-t-05 tw-mg-r-05"
			>
				<button
					class="tw-border-radius-rounded tw-inline-flex tw-interactive tw-semibold ffz-tag"
					:title="category.displayName"
					@click="removeCategory(category.id)"
				>
					<div class="tw-align-items-center tw-flex tw-font-size-7 ffz-tag__content">
						<div class="ffz-card-img ffz-card-img--size-105 tw-mg-r-05 tw-flex-shrink-0 tw-overflow-hidden tw-avatar">
							<aspect :ratio="1">
								<img
									:alt="category.displayName"
									:src="category.boxArtURL"
									class="tw-image tw-image-avatar"
								>
							</aspect>
						</div>
						{{ category.displayName }}
						<figure class="ffz-i-cancel" />
					</div>
				</button>
			</div>
		</div>
	</div>
</template>

<script>

import {getLoader} from '../data';

const {deep_copy} = FrankerFaceZ.utilities.object;

export default {
	props: {
		value: Array,
		inputId: {
			type: String,
			required: false
		}
	},

	data() {
		const ids = Array.isArray(this.value) ? this.value.slice(0) : [],
			categories = {};

		for(const id of ids)
			categories[id] = {id, loading: true};

		return {
			loader: 0,
			ids,
			categories
		}
	},

	computed: {
		showCategories() {
			return this.ids.map(id => this.categories[id] = this.categories[id] || {id});
		}
	},

	watch: {
		ids() {
			this.$emit('input', this.ids)
		}
	},

	created() {
		const loader = getLoader();

		for(const id of this.ids)
			loader.getCategory(id).then(category => {
				this.categories[id] = category ?? {id, displayName: `invalid category`}
			});
	},

	methods: {
		removeCategory(id) {
			// Make sure we weren't accidentally handed a category object.
			if ( id && id.id )
				id = id.id;

			for(let i=0; i < this.ids.length; i++) {
				if ( id === this.ids[i] ) {
					this.ids.splice(i, 1);
					break;
				}
			}
		},

		addCategory(category) {
			if ( ! category || ! category.id )
				return;

			if ( this.ids.includes(category.id) )
				return;

			this.ids.push(category.id);
			this.categories[category.id] = category;
		},

		async getItems(query) {
			if ( ! query )
				return [];

			const out = await getLoader().getMatchingCategories(query),
				categories = out?.items;

			if ( ! categories || ! categories.length )
				return [];

			return deep_copy(categories);
		}
	}
}

</script>