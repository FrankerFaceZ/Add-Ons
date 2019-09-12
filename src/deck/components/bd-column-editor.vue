<template>
	<bd-modal class="bd--column-editor" @close="close">
		<template #title>
			<h4 :class="inst.edit_icon || 'ffz-i-cog'" class="ffz-i-pd-1 tw-pd-x-1">
				{{ inst_title }}
			</h4>
		</template>

		<simplebar>
			<div class="tw-flex tw-flex-nowrap tw-align-items-center tw-mg-x-1 tw-mg-t-1">
				<div class="tw-flex-grow-1" />
				<template v-if="deleting">
					<button
						class="tw-button tw-button--text tw-tooltip-wrapper tw-mg-r-1"
						@click="deleting = false"
					>
						<span class="tw-button__text ffz-i-cancel">
							{{ t('addons.deck.cancel', 'Cancel') }}
						</span>
					</button>
					<button
						class="tw-button tw-button--text tw-flex-shrink-0"
						@click="remove"
					>
						<span class="tw-button__text ffz-i-trash">
							{{ t('addons.deck.delete', 'Delete') }}
						</span>
					</button>
				</template>
				<template v-else>
					<button
						class="tw-button tw-button--text tw-tooltip-wrapper tw-mg-r-1"
						@click="deleting = true"
					>
						<span class="tw-button__text ffz-i-trash">
							{{ t('addons.deck.delete', 'Delete') }}
						</span>
					</button>
					<button
						class="tw-button tw-button--text tw-flex-shrink-0"
						@click="save"
					>
						<span class="tw-button__text ffz-i-floppy">
							{{ t('addons.deck.save', 'Save') }}
						</span>
					</button>
				</template>
			</div>

			<section class="tw-mg-1">
				<h5 class="tw-border-b">{{ t('addons.deck.edit.appearance', 'Appearance') }}</h5>

				<div class="tw-flex tw-align-items-center tw-mg-y-05">
					<label :for="'title$' + column.id">
						{{ t('addons.deck.edit.title', 'Title:') }}
					</label>
					<input
						:id="'title$' + column.id"
						v-model="column.display.title"
						class="tw-flex-grow-1 tw-border-radius-medium tw-font-size-6 tw-pd-x-1 tw-pd-y-05 tw-input"
					>
				</div>

				<div v-if="inst.useIcon()" class="tw-flex tw-align-items-center tw-mg-y-05">
					<label :for="'icon$' + column.id">
						{{ t('addons.deck.edit.icon', 'Icon:') }}
					</label>
					<icon-picker
						:clearable="true"
						v-model="column.display.icon"
						class="tw-full-width"
					/>
				</div>

				<div class="tw-flex tw-align-items-center tw-mg-y-05">
					<label :for="'width$' + column.id">
						{{ t('addons.deck.edit.width', 'Width:') }}
					</label>
					<select
						ref="width"
						:id="'width$' + column.id"
						v-model="column.display.width"
						class="tw-flex-grow-1 tw-border-radius-medium tw-font-size-6 tw-pd-x-1 tw-pd-y-05 tw-select"
					>
						<option :value="0">Narrow</option>
						<option :value="1">Normal</option>
						<option :value="2">Wide</option>
					</select>
				</div>

				<div class="tw-flex tw-align-items-center tw-mg-y-05">
					<label :for="'tag_count$' + column.id">
						{{ t('addons.deck.edit.max-tags', 'Show Tags:') }}
					</label>
					<input
						:id="'tag_count$' + column.id"
						v-model.number="column.display.max_tags"
						type="range"
						min="0"
						max="10"
						step="1"
						class="tw-range tw-range--unfilled tw-flex-grow-1"
						@wheel="scrollMaxTags"
					>
					<div class="tw-mg-l-1">
						{{ column.display.max_tags }}
					</div>
				</div>

				<div class="tw-flex tw-align-items-center tw-checkbox bd-checkbox--indent tw-mg-y-05">
					<input
						:id="'no_avatars$' + column.id"
						v-model="column.display.hide_avatars"
						type="checkbox"
						class="tw-checkbox__input"
					>
					<label :for="'no_avatars$' + column.id" class="tw-checkbox__label">
						{{ t('addons.deck.edit.avatars', 'Do not display avatars.') }}
					</label>
				</div>
			</section>

			<section class="tw-mg-1">
				<h5 class="tw-border-b">{{ t('addons.deck.edit.behavior', 'Behavior') }}</h5>

				<div v-if="sort_options" class="tw-flex tw-align-items-center tw-mg-y-05">
					<label :for="'sort$' + column.id">
						{{ t('addons.deck.edit.sort', 'Sort By:') }}
					</label>
					<select
						ref="sort"
						:id="'sort$' + column.id"
						class="tw-flex-grow-1 tw-border-radius-medium tw-font-size-6 tw-pd-x-1 tw-pd-y-05 tw-select"
						@change="sortChange"
					>
						<option
							v-for="(option, key) in sort_options"
							:key="key"
							:value="key"
							:selected="key === column.settings.sort"
							v-once
						>
							{{ option.i18n ? t(option.i18n, option.title) : option.title }}
						</option>
					</select>
				</div>

				<div v-if="useTags" class="tw-flex tw-align-items-start tw-mg-y-05">
					<label :for="'tags$' + column.id">
						{{ t('addons.deck.edit.required-tags', 'Required Tags:') }}
					</label>
					<bd-tag-selector
						:inputId="'tags$' + column.id"
						v-model="column.settings.tags"
						class="tw-full-width"
					/>
				</div>
				<component
					v-for="(component, idx) in editComponents"
					:key="idx"
					:is="component"
					:value="column"
					:inst="inst"
					:settings="settings"
				/>
			</section>

			<div class="tw-pd-5" />
			<div class="tw-pd-5" />
		</simplebar>
	</bd-modal>
</template>

<script>
import { getLoader } from '../data';

const {deep_copy, has, maybe_call} = FrankerFaceZ.utilities.object;

let last_id = 0;

export default {
	props: ['data'],

	data() {
		return {
			id: last_id++,
			column: deep_copy(this.data.column),
			deleting: false
		}
	},

	computed: {
		settings() {
			return this.data.settings;
		},

		inst() {
			return this.data.inst;
		},

		inst_title() {
			const out = has(this.inst, 'getEditTitle') && this.inst.getEditTitle();
			if ( Array.isArray(out) )
				return this.t(...out);

			else if ( out )
				return out;

			return this.t('addons.deck.edit.column', 'Edit Column');
		},

		sort_options() {
			const out = this.inst && this.inst.getSortOptions();
			if ( out )
				return deep_copy(out);
		},

		useTags() {
			return this.inst && this.inst.useTags();
		},

		editComponents() {
			const out = this.inst && this.inst.getEditComponent();
			if ( ! out )
				return null;

			return Array.isArray(out) ? out : [out];
		}
	},

	methods: {
		scrollMaxTags(event) {
			if ( event.deltaY === 0 )
				return;

			const delta = event.deltaY > 0 ? 1 : -1;
			let new_val = this.column.display.max_tags + delta;

			if ( new_val < 0 )
				new_val = 0;
			else if ( new_val > 10 )
				new_val = 10;

			this.column.display.max_tags = new_val;
			event.preventDefault();
		},

		sortChange() {
			const key = this.$refs.sort.value,
				raw_value = this.sort_options[key];

			this.column.settings.sort = raw_value ? key : null;
		},

		close() {
			// TODO: Check for unsaved changes.
			this.$emit('close');
		},

		remove() {
			this.data.remove();
			this.$emit('close');
		},

		save() {
			if ( ! this.column )
				return;

			if ( this.column.display.title )
				delete this.column.display.i18n;

			const languages = getLoader().getLanguagesFromTags(this.column.settings.tags);
			this.column.settings.lang = languages.length ? languages : null;

			this.data.save(this.column);
			this.$emit('close');
		}
	}
}

</script>