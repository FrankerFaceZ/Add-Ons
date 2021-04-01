<template>
	<div class="bd--tag-selector tw-flex-column tw-flex-no-wrap" data-a-target="tags-filter-dropdown">
		<autocomplete
			:inputId="inputId"
			:items="getItems"
			:suggestOnFocus="true"
			:suggestWhenEmpty="true"
			:clearOnSelect="true"
			:placeholder="t('addon.deck.search-tags', 'Search Tags')"
			icon="ffz-i-search"
			@selected="addTag"
		/>
		<div class="bd--tag-selector__list tw-flex tw-flex-wrap tw-c-background-base tw-pd-x-05 tw-pd-b-05 tw-border-l tw-border-b tw-border-r tw-border-radius-medium">
			<div
				v-if="! showTags || ! showTags.length"
				class="tw-mg-t-05 tw-c-text-alt-2"
			>
				{{ t('addon.deck.no-tags', 'no tags') }}
				&nbsp;
			</div>
			<div
				v-for="tag of showTags"
				:key="tag.id"
				class="tw-inline-block tw-mg-t-05 tw-mg-r-05"
			>
				<button
					class="tw-border-radius-rounded tw-inline-flex tw-interactive tw-semibold ffz-tag"
					:title="tag.description"
					@click="removeTag(tag.id)"
				>
					<div class="tw-align-items-center tw-flex tw-font-size-7 ffz-tag__content">
						<figure v-if="tag.is_language" class="ffz-i-language" />
						{{ tag.label }}
						<figure class="ffz-i-cancel" />
					</div>
				</button>
			</div>
		</div>
	</div>
</template>

<script>

import {getLoader, cleanTooltips} from '../data';

const {get, deep_copy, has, generateUUID} = FrankerFaceZ.utilities.object;

export default {
	props: {
		value: Array,
		category: {
			type: Number,
			required: false,
			default: null
		},
		inputId: {
			type: String,
			required: false
		}
	},

	data() {
		return {
			loader: 0,
			tags: Array.isArray(this.value) ? this.value.slice(0) : []
		}
	},

	computed: {
		hasLanguage() {
			this.loader;
			for(const tag_id of this.tags) {
				const tag = getLoader().getTagImmediate(tag_id, this.load);
				if ( tag && tag.is_language )
					return true;
			}

			return false;
		},

		showTags() {
			this.loader;
			return this.tags.map(id => {
				const tag = getLoader().getTagImmediate(id, this.load, true);
				return tag ? deep_copy(tag) : {
					id,
					name: '(...)'
				}
			});
		}
	},

	watch: {
		tags() {
			this.$emit('input', this.tags);
		}
	},

	created() {
		this.load = () => this.loader++;
	},

	methods: {
		removeTag(id) {
			for(let i=0; i < this.tags.length; i++) {
				if ( id === this.tags[i] ) {
					this.tags.splice(i, 1);
					return;
				}
			}
		},

		addTag(id) {
			// Make sure we weren't accidentally handed a tag object.
			if ( id && id.id )
				id = id.id;

			if ( ! this.tags.includes(id) )
				this.tags.push(id);
		},

		async getItems(query) {
			let out;
			if ( ! query )
				out = await getLoader().getTopTags(50);
			else
				out = await getLoader().getMatchingTags(query, this.category);

			if ( ! Array.isArray(out) )
				return [];

			return deep_copy(out.filter(tag => ! this.tags.includes(tag.id)));
		}
	}
}

</script>