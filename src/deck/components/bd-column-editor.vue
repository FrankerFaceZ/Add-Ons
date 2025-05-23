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
				<template v-if="copying">
					<button
						class="tw-button tw-button--text ffz-il-tooltip__container tw-mg-r-1"
						@click="copying = false"
					>
						<span class="tw-button__text ffz-i-cancel">
							{{ t('addon.deck.cancel', 'Cancel') }}
						</span>
					</button>
				</template>
				<template v-else-if="deleting">
					<button
						class="tw-button tw-button--text ffz-il-tooltip__container tw-mg-r-1"
						@click="deleting = false"
					>
						<span class="tw-button__text ffz-i-cancel">
							{{ t('addon.deck.cancel', 'Cancel') }}
						</span>
					</button>
					<button
						class="tw-button tw-button--text tw-flex-shrink-0"
						@click="remove"
					>
						<span class="tw-button__text ffz-i-trash">
							{{ t('addon.deck.delete', 'Delete') }}
						</span>
					</button>
				</template>
				<template v-else>
					<button
						class="tw-button tw-button--text ffz-il-tooltip__container tw-mg-r-1"
						@click="prepareCopy"
					>
						<span class="tw-button__text ffz-i-docs">
							{{ t('addon.deck.copy', 'Copy') }}
						</span>
					</button>
					<button
						class="tw-button tw-button--text ffz-il-tooltip__container tw-mg-r-1"
						@click="deleting = true"
					>
						<span class="tw-button__text ffz-i-trash">
							{{ t('addon.deck.delete', 'Delete') }}
						</span>
					</button>
					<button
						class="tw-button tw-button--text tw-flex-shrink-0"
						@click="save"
					>
						<span class="tw-button__text ffz-i-floppy">
							{{ t('addon.deck.save', 'Save') }}
						</span>
					</button>
				</template>
			</div>

			<section v-if="copying" class="tw-mg-1">
				<textarea
					ref="json"
					v-model="json"
					readonly
					rows="10"
					class="tw-full-width tw-full-height tw-border-radius-medium tw-font-size-6 tw-pd-x-1 tw-pd-y-05 ffz-input"
					@focus="$event.target.select()"
				/>
			</section>

			<section v-if="! copying" class="tw-mg-1">
				<h5 class="tw-border-b">
					{{ t('addon.deck.edit.appearance', 'Appearance') }}
				</h5>

				<div class="tw-flex tw-align-items-center tw-mg-y-05">
					<label :for="'title$' + column.id">
						{{ t('addon.deck.edit.title', 'Title:') }}
					</label>
					<input
						:id="'title$' + column.id"
						v-model="column.display.title"
						:placeholder="titlePlaceholder"
						class="tw-flex-grow-1 tw-border-radius-medium tw-font-size-6 tw-pd-x-1 tw-pd-y-05 ffz-input"
					>
				</div>

				<div v-if="inst.useIcon()" class="tw-flex tw-align-items-center tw-mg-y-05">
					<label :for="'icon$' + column.id">
						{{ t('addon.deck.edit.icon', 'Icon:') }}
					</label>
					<icon-picker
						v-model="column.display.icon"
						:clearable="true"
						class="tw-full-width"
					/>
				</div>

				<div class="tw-flex tw-align-items-center tw-mg-y-05">
					<label :for="'color$' + column.id">
						{{ t('addon.deck.edit.color', 'Color:') }}
					</label>
					<color-picker
						:id="'color$' + column.id"
						ref="color"
						v-model="column.display.color"
						:alpha="false"
						:nullable="true"
						class="tw-flex-grow-1"
					/>
				</div>

				<div v-if="sidebar" class="tw-flex tw-align-items-center tw-mg-y-05">
					<label :for="'default_count$' + column.id">
						{{ t('addon.deck.edit.default_count', 'Default Size:') }}
					</label>
					<input
						:id="'default_count$' + column.id"
						v-model.number="column.display.default_count"
						type="range"
						min="1"
						max="20"
						step="1"
						class="ffz-range ffz-range--unfilled tw-flex-grow-1"
						@wheel="scrollDefaultCount"
					>
					<div class="tw-mg-l-1">
						{{ column.display.default_count }}
					</div>
				</div>

				<div v-if="!sidebar" class="tw-flex tw-align-items-center tw-mg-y-05">
					<label :for="'columns$' + column.id">
						<template v-if="vertical">
							{{ t('addon.deck.edit.height', 'Height:') }}
						</template>
						<template v-else>
							{{ t('addon.deck.edit.columns', 'Columns:') }}
						</template>
					</label>
					<input
						:id="'columns$' + column.id"
						v-model.number="column.display.columns"
						type="range"
						min="1"
						max="10"
						step="1"
						class="ffz-range ffz-range--unfilled tw-flex-grow-1"
						@wheel="scrollColumns"
					>
					<div class="tw-mg-l-1">
						{{ column.display.columns }}
					</div>
				</div>

				<div v-if="!sidebar" class="tw-flex tw-align-items-center tw-mg-y-05">
					<label :for="'width$' + column.id">
						{{ t('addon.deck.edit.card-width', 'Card Size:') }}
					</label>
					<select
						:id="'width$' + column.id"
						ref="width"
						v-model="column.display.width"
						class="tw-flex-grow-1 tw-border-radius-medium tw-font-size-6 tw-pd-x-1 tw-pd-y-05 ffz-select"
					>
						<option :value="0">
							{{ t('addon.deck.width.0', 'Small') }}
						</option>
						<option :value="1">
							{{ t('addon.deck.width.1', 'Normal') }}
						</option>
						<option :value="2">
							{{ t('addon.deck.width.2', 'Large') }}
						</option>
					</select>
				</div>

				<div class="tw-flex tw-align-items-center tw-mg-y-05">
					<label :for="'tag_count$' + column.id">
						{{ t('addon.deck.edit.max-tags', 'Show Tags:') }}
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

				<div v-if="useHypeTrains" class="tw-flex tw-align-items-center ffz-checkbox bd-checkbox--indent tw-mg-y-05">
					<input
						:id="'hype_trains$' + column.id"
						v-model="column.display.hype_trains"
						type="checkbox"
						class="ffz-checkbox__input"
					>
					<label :for="'hype_trains$' + column.id" class="ffz-checkbox__label">
						{{ t('addon.deck.edit.hype-trains', 'Display active Hype Trains.') }}
					</label>
				</div>

				<div class="tw-flex tw-align-items-center ffz-checkbox bd-checkbox--indent tw-mg-y-05">
					<input
						:id="'no_avatars$' + column.id"
						v-model="column.display.hide_avatars"
						type="checkbox"
						class="ffz-checkbox__input"
					>
					<label :for="'no_avatars$' + column.id" class="ffz-checkbox__label">
						{{ t('addon.deck.edit.avatars', 'Do not display avatars.') }}
					</label>
				</div>

				<div class="tw-flex tw-align-items-center ffz-checkbox bd-checkbox--indent tw-mg-y-05">
					<input
						:id="'no_viewers$' + column.id"
						v-model="column.display.hide_viewers"
						type="checkbox"
						class="ffz-checkbox__input"
					>
					<label :for="'no_viewers$' + column.id" class="ffz-checkbox__label">
						{{ t('addon.deck.edit.viewers', 'Do not display views / viewers.') }}
					</label>
				</div>
			</section>

			<section v-if="! copying" class="tw-mg-1">
				<h5 class="tw-border-b">
					{{ t('addon.deck.edit.behavior', 'Behavior') }}
				</h5>

				<div v-if="auto_refresh" class="tw-flex tw-align-items-center tw-mg-y-05">
					<label :for="'refresh$' + column.id">
						{{ t('addon.deck.edit.refresh', 'Auto Refresh:') }}
					</label>

					<input
						:id="'refresh$' + column.id"
						v-model.number="column.display.refresh"
						type="range"
						min="-1"
						max="10"
						step="1"
						class="tw-range tw-range--unfilled tw-flex-grow-1"
						@wheel="scrollRefresh"
					>
					<div class="tw-mg-l-1">
						{{ refreshLabel }}
					</div>
				</div>

				<div v-if="sort_options" class="tw-flex tw-align-items-center tw-mg-y-05">
					<label :for="'sort$' + column.id">
						{{ t('addon.deck.edit.sort', 'Sort By:') }}
					</label>
					<select
						:id="'sort$' + column.id"
						ref="sort"
						class="tw-flex-grow-1 tw-border-radius-medium tw-font-size-6 tw-pd-x-1 tw-pd-y-05 ffz-select"
						@change="sortChange"
					>
						<option
							v-for="(option, key) in sort_options"
							v-once
							:key="key"
							:value="key"
							:selected="key === column.settings.sort"
						>
							{{ option.i18n ? t(option.i18n, option.title) : option.title }}
						</option>
					</select>
				</div>

				<component
					v-for="(component, idx) in editComponents"
					:is="component"
					:key="idx"
					:value="column"
					:inst="inst"
					:settings="settings"
				/>
			</section>

			<section v-if="! copying" class="tw-mg-1">
				<h5 class="tw-border-b">
					{{ t('addon.deck.edit.filtering', 'Filtering') }}
				</h5>

				<div
					v-if="useHideUnlisted" 
					class="tw-flex tw-align-items-center ffz-checkbox bd-checkbox--indent tw-mg-y-05"
				>
					<input
						:id="'hide_unlisted$' + column.id"
						v-model="column.settings.hide_unlisted"
						type="checkbox"
						class="ffz-checkbox__input"
					>
					<label :for="'hide_unlisted$' + column.id" class="ffz-checkbox__label">
						{{ t('addon.deck.edit.hide_unlisted', 'Do not display items with no category set.') }}
					</label>
				</div>

				<bd-edit-languages
					v-model="column.settings.lang"
				/>

				<div v-if="useTags" class="tw-flex tw-align-items-start tw-mg-y-05">
					<label :for="'tags$' + column.id">
						{{ t('addon.deck.edit.required-tags', 'Required Tags:') }}
					</label>
					<bd-tag-selector
						v-model="column.settings.tags"
						:input-id="'tags$' + column.id"
						class="tw-full-width"
					/>
				</div>
				<div v-if="useTags" class="tw-flex tw-align-items-start tw-mg-y-05">
					<label :for="'blocked-tags$' + column.id">
						{{ t('addon.deck.edit.blocked-tags', 'Blocked Tags:') }}
					</label>
					<bd-tag-selector
						v-model="column.settings.blocked_tags"
						:input-id="'blocked-tags$' + column.id"
						class="tw-full-width"
					/>
				</div>

				<div v-if="filterCategories" class="tw-flex tw-align-items-start tw-mg-y-05">
					<label :for="'categories$' + column.id">
						{{ t('addon.deck.edit.required-categories', 'Required Categories:') }}
					</label>

					<bd-category-selector
						v-model="column.settings.filter_games"
						:input-id="'categories$' + column.id"
						class="tw-full-width"
					/>
				</div>
				<div v-if="filterCategories" class="tw-flex tw-align-items-start tw-mg-y-05">
					<label :for="'blocked-categories$' + column.id">
						{{ t('addon.deck.edit.blocked-categories', 'Blocked Categories:') }}
					</label>

					<bd-category-selector
						v-model="column.settings.filter_blocked_games"
						:input-id="'blocked-categories$' + column.id"
						class="tw-full-width"
					/>
				</div>
			</section>

			<div v-if="! copying" class="tw-pd-5" />
			<div v-if="! copying" class="tw-pd-5" />
		</simplebar>
	</bd-modal>
</template>

<script>
import { getLoader } from '../data';

const {deep_copy, has} = FrankerFaceZ.utilities.object;
const {print_duration} = FrankerFaceZ.utilities.time;

const BAD_KEYS = [
	'id',
	'collapsed',
	'cache'
];

let last_id = 0;

export default {
	props: ['data', 'vertical'],

	data() {
		const column = deep_copy(this.data.column);
		if ( ! column.display )
			column.display = {};

		if ( column.display.refresh == null )
			column.display.refresh = -1;

		return {
			id: last_id++,
			column,
			deleting: false,
			copying: false
		}
	},

	computed: {
		json() {
			const copy = deep_copy(this.column);
			for(const key of BAD_KEYS)
				if ( has(copy, key) )
					delete copy[key];

			return JSON.stringify(copy);
		},

		titlePlaceholder() {
			const out = this.inst.getTitle?.();
			if ( Array.isArray(out) )
				return this.t(...out);
			else if ( out )
				return out;

			return null;
		},

		refreshLabel() {
			const val = this.column.display.refresh;
			if ( val == null || val < 0 )
				return this.t('addon.deck.refresh.disabled', 'Disabled');

			const base = this.inst && this.inst.getRefreshDelay(),
				multiplier = this.inst && this.inst.getRefreshMultiplier();

			return print_duration(Math.floor((base + (val * multiplier)) / 1000));
		},

		sidebar() {
			return this.data.sidebar;
		},

		settings() {
			return this.data.settings;
		},

		inst() {
			return this.data.inst;
		},

		inst_title() {
			const out = this.inst.getEditTitle?.();
			if ( Array.isArray(out) )
				return this.t(...out);

			else if ( out )
				return out;

			return this.t('addon.deck.edit.column', 'Edit Column');
		},

		auto_refresh() {
			return true;
		},

		sort_options() {
			const out = this.inst && this.inst.getSortOptions();
			if ( out )
				return deep_copy(out);

			return null;
		},

		useTags() {
			return this.inst && this.inst.useTags();
		},

		useHypeTrains() {
			return this.inst && this.inst.useHypeTrains();
		},

		useHideUnlisted() {
			return this.inst && this.inst.allowHideUnlisted();
		},

		filterCategories() {
			return this.inst && this.inst.allowFilterCategories();
		},

		editComponents() {
			const out = this.inst && this.inst.getEditComponent();
			if ( ! out )
				return null;

			return Array.isArray(out) ? out : [out];
		}
	},

	methods: {
		scrollDefaultCount(event) {
			if (event.deltaY === 0 )
				return;

			const delta = event.deltaY > 0 ? 1 : -1;
			let new_val = this.count.display.default_count + delta;

			if ( new_val < 1 )
				new_val = 1;
			else if ( new_val > 20 )
				new_val = 20;

			this.column.display.default_count = new_val;
			event.preventDefault();
		},

		scrollColumns(event) {
			if ( event.deltaY === 0 )
				return;

			const delta = event.deltaY > 0 ? 1 : -1;
			let new_val = this.column.display.columns + delta;

			if ( new_val < 0 )
				new_val = 0;
			else if ( new_val > 10 )
				new_val = 10;

			this.column.display.columns = new_val;
			event.preventDefault();
		},

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

		scrollRefresh(event) {
			if ( event.deltaY === 0 )
				return;

			const delta = event.deltaY > 0 ? 1 : -1;
			let new_val = this.column.display.refresh + delta;

			if ( new_val < 0 )
				new_val = 0;
			else if ( new_val > 10 )
				new_val = 10;

			this.column.display.refresh = new_val;
			event.preventDefault();
		},

		sortChange() {
			const key = this.$refs.sort.value,
				raw_value = this.sort_options[key];

			this.column.settings.sort = raw_value ? key : null;
		},

		prepareCopy() {
			this.copying = true;
			requestAnimationFrame(() => {
				this.$refs.json?.focus?.();
			});
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

			this.data.save(this.column);
			this.$emit('close');
		}
	}
}

</script>