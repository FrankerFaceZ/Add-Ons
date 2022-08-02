<template>
	<section
		class="bd--tab-editor tw-elevation-1 tw-c-background-base tw-border tw-pd-y-05 tw-mg-y-05 tw-pd-x-1 tw-flex tw-flex-nowrap"
	>
		<div class="tw-flex tw-flex-shrink-0 tw-align-items-center handle tw-c-text-alt-2">
			<h2 class="ffz-i-ellipsis-vert" />
		</div>
		<h1 v-if="! editing && icon" :class="icon" class="tw-mg-r-1 tw-c-text-alt tw-align-self-center" />
		<div class="tw-flex-grow-1">
			<template v-if="! editing">
				<h4>
					{{ title }}

					<span
						v-if="tab.sidebar"
						class="ffz-i-pin ffz-tooltip"
						:data-title="t('addon.deck.tab-sidebar', 'This tab is being used as your sidebar.')"
					/>
				</h4>
				<div class="tw-c-text-alt">
					{{ t('addon.deck.column-count', '{count, plural, one {# column} other {# columns} }', {count: tab.columns && tab.columns.length}) }}
				</div>
				<bd-tag-list :tags="tags" />
			</template>
			<template v-else-if="copying">
				<textarea
					ref="json"
					v-model="json"
					readonly
					rows="15"
					class="tw-full-width tw-full-height tw-border-radius-medium tw-font-size-6 tw-pd-x-1 tw-pd-y-05 ffz-input"
					@focus="$event.target.select()"
				/>
			</template>
			<template v-else>
				<section>
					<div class="tw-flex tw-align-items-center">
						<label :for="'title$' + id" class="tw-mg-l-05">
							{{ t('addon.deck.edit.title', 'Title:') }}
						</label>
						<input
							:id="'title$' + id"
							v-model="edit_data.title"
							class="tw-flex-grow-1 tw-border-radius-medium tw-font-size-6 tw-pd-x-1 tw-pd-y-05 tw-mg-y-05 ffz-input"
						>
					</div>

					<div class="tw-flex tw-align-items-center ffz-checkbox bd-checkbox--indent tw-mg-y-05 tw-pd-x-05">
						<input
							:id="'sidebar$' + id"
							v-model="edit_data.sidebar"
							type="checkbox"
							class="ffz-checkbox__input"
						>
						<label :for="'sidebar$' + id" class="ffz-checkbox__label">
							{{ t('addon.deck.edit.sidebar', 'Use Tab as Sidebar') }}
						</label>
					</div>

					<div class="tw-flex tw-align-items-center ffz-checkbox bd-checkbox--indent tw-mg-y-05 tw-pd-x-05">
						<input
							:id="'vertical$' + id"
							v-model="edit_data.vertical"
							type="checkbox"
							class="ffz-checkbox__input"
						>
						<label :for="'vertical$' + id" class="ffz-checkbox__label">
							{{ t('addon.deck.edit.vertical', 'Use Vertical Layout for Tab') }}
						</label>
					</div>

					<div class="tw-flex tw-align-items-center">
						<label :for="'icon$' + id" class="tw-mg-l-05">
							{{ t('addon.deck.edit.icon', 'Icon:') }}
						</label>
						<icon-picker
							:clearable="true"
							v-model="edit_data.icon"
							class="tw-mg-y-05 tw-full-width"
						/>
					</div>

					<div class="tw-flex tw-align-items-start">
						<label :for="'tags$' + id" class="tw-mg-l-05">
							{{ t('addon.deck.edit.tags', 'Tags:') }}
						</label>
						<bd-tag-selector
							:id="'tags$' + id"
							v-model="edit_data.tags"
							class="tw-full-width"
						/>
					</div>
				</section>
			</template>
		</div>

		<div class="tw-mg-l-1 tw-border-l tw-pd-l-1 tw-flex tw-flex-wrap tw-flex-column tw-justify-content-start tw-align-items-start">
			<template v-if="copying">
				<button class="tw-button tw-button--text" @click="copying = false">
					<span class="tw-button__text ffz-i-cancel">
						{{ t('setting.cancel', 'Cancel') }}
					</span>
				</button>
			</template>
			<template v-else-if="editing">
				<button class="tw-button tw-button--text" @click="save">
					<span class="tw-button__text ffz-i-floppy">
						{{ t('setting.save', 'Save') }}
					</span>
				</button>
				<button class="tw-button tw-button--text" @click="cancel">
					<span class="tw-button__text ffz-i-cancel">
						{{ t('setting.cancel', 'Cancel') }}
					</span>
				</button>
				<button class="tw-button tw-button--text" @click="prepareCopy">
					<span class="tw-button__text ffz-i-docs">
						{{ t('setting.copy-json', 'Copy') }}
					</span>
				</button>
			</template>
			<template v-else-if="deletable && deleting">
				<button class="tw-button tw-button--text" @click="$emit('delete')">
					<span class="tw-button__text ffz-i-trash">
						{{ t('setting.delete', 'Delete') }}
					</span>
				</button>
				<button class="tw-button tw-button--text" @click="deleting = false">
					<span class="tw-button__text ffz-i-cancel">
						{{ t('setting.cancel', 'Cancel') }}
					</span>
				</button>
			</template>
			<template v-else>
				<button
					class="tw-button tw-button--text"
					@click="edit"
				>
					<span class="tw-button__text ffz-i-cog">
						{{ t('setting.edit', 'Edit') }}
					</span>
				</button>
				<button v-if="deletable" class="tw-button tw-button--text" @click="deleting = true">
					<span class="tw-button__text ffz-i-trash">
						{{ t('setting.delete', 'Delete') }}
					</span>
				</button>
			</template>
		</div>
	</section>
</template>

<script>

import {getLoader} from '../data';
const {get, has, deep_copy} = FrankerFaceZ.utilities.object;

const BAD_KEYS = [
	'id'
];

const BAD_COL_KEYS = [
	'id', 'cache'
];

let last_id = 0;

export default {
	props: ['tab', 'deletable'],

	data() {
		return {
			id: last_id++,
			edit_data: null,
			editing: false,
			copying: false,
			deleting: false,
			loader: 0
		}
	},

	computed: {
		json() {
			const copy = deep_copy(this.display);
			for(const key of BAD_KEYS)
				if ( has(copy, key) )
					delete copy[key];

			if ( ! Array.isArray(copy.columns) || copy.columns.length === 0 )
				copy.columns = undefined;
			else
				for(const column of copy.columns) {
					for(const key of BAD_COL_KEYS)
						if ( has(column, key) )
							delete column[key];
				}

			return JSON.stringify({
				type: 'tab',
				data: copy
			});
		},

		display() {
			if ( this.editing )
				return this.edit_data;

			return this.tab;
		},

		tags() {
			if ( ! this.display.tags )
				return null;

			this.loader;
			return this.display.tags.map(id => {
				const tag = getLoader().getTagImmediate(id, this.load, true);
				return tag ? deep_copy(tag) : {
					id,
					name: '(...)'
				};
			});
		},

		icon() {
			return this.display.icon;
		},

		title() {
			if ( this.display.i18n )
				return this.t(this.display.i18n, this.display.title);

			return this.display.title;
		}
	},

	created() {
		this.load = () => this.loader++;
	},

	methods: {
		edit() {
			this.edit_data = deep_copy(this.tab);
			if ( ! this.edit_data.tags )
				this.edit_data.tags = [];

			this.editing = true;
		},

		prepareCopy() {
			this.copying = true;
			requestAnimationFrame(() => {
				this.$refs.json.focus();
			});
		},

		save() {
			if ( this.edit_data ) {
				const languages = getLoader().getLanguagesFromTags(this.edit_data.tags);
				this.edit_data.lang = languages.length ? languages : null;
			}

			this.$emit('save', this.edit_data);
			this.editing = false;
			this.edit_data = null;
		},

		cancel() {
			this.copying = false;
			this.editing = false;
			this.edit_data = null;
		}
	}
}

</script>