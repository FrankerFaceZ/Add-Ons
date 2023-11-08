<template>
	<div class="bd--tag-selector tw-flex-column tw-flex-no-wrap" data-a-target="tags-filter-dropdown">
		<autocomplete
			:input-id="inputId"
			:items="getItems"
			:suggest-on-focus="true"
			:suggest-when-empty="true"
			:clear-on-select="true"
			:placeholder="t('addon.deck.search-tags', 'Search Tags')"
			icon="ffz-i-search"
			@selected="addTag"
		/>
		<div class="bd--tag-selector__list tw-flex tw-flex-wrap tw-c-background-base tw-pd-x-05 tw-pd-b-05 tw-border-l tw-border-b tw-border-r tw-border-radius-medium">
			<div
				v-if="! tags || ! tags.length"
				class="tw-mg-t-05 tw-c-text-alt-2"
			>
				{{ t('addon.deck.no-tags', 'no tags') }}
				&nbsp;
			</div>
			<div
				v-for="tag of tags"
				:key="tag"
				class="tw-inline-block tw-mg-t-05 tw-mg-r-05"
			>
				<button
					class="tw-border-radius-rounded tw-inline-flex tw-interactive tw-semibold ffz-tag"
					@click="removeTag(tag)"
				>
					<div class="tw-align-items-center tw-flex tw-font-size-7 ffz-tag__content">
						{{ tag }}
						<figure class="ffz-i-cancel" />
					</div>
				</button>
			</div>
		</div>
	</div>
</template>

<!-- eslint-disable no-unused-vars -->
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
			tags: Array.isArray(this.value) ? this.value.slice(0) : []
		}
	},

	computed: {
		lowerTags() {
			return this.tags.map(tag => tag.toLowerCase())
		}
	},

	watch: {
		tags() {
			this.$emit('input', this.tags);
		}
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

		addTag(obj) {
			const tag = obj.name;

			if ( this.lowerTags.includes(tag.toLowerCase()))
				return;

			this.tags.push(tag);
		},

		async getItems(query) {
			let out;
			if ( ! query )
				return [];
			else
				out = await getLoader().getMatchingTags(query);

			if ( ! Array.isArray(out) )
				return [];

			return out
				.filter(tag => ! this.lowerTags.includes(tag.toLowerCase()))
				.map(x => ({name: x}));
		}
	}
}

</script>
