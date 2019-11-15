<template>
	<div ref="deck" class="bd--deck tw-c-background-body tw-flex tw-full-width tw-relative">
		<div class="bd--deck-controls tw-flex tw-absolute tw-top-0 tw-left-0 tw-mg-t-1 tw-mg-x-3">
			<div class="tw-flex tw-align-items-center tw-flex-shrink-0 tw-mg-r-1 tw-border-r tw-pd-r-1">
				<div
					v-on-clickaway="closeMenu"
					class="tw-relative"
				>
					<button
						class="tw-button tw-button--text"
						@click="toggleMenu"
					>
						<span class="tw-button__text ffz-i-plus">
							{{ t('addon.deck.new', 'New...') }}
						</span>
						<span class="tw-button__icon tw-button__icon--right">
							<figure class="ffz-i-down-dir" />
						</span>
					</button>
					<balloon
						v-if="menu_open"
						color="background-base"
						dir="down"
						size="sm"
					>
						<simplebar classes="bd-column-select-menu">
							<div class="tw-pd-y-1">
								<template v-for="(preset, idx) in presets">
									<div v-if="preset.divider" :key="idx" class="tw-mg-1 tw-border-b" />
									<div v-else-if="preset.title" :key="idx" class="tw-pd-1">
										<div class="tw-c-text-alt-2 tw-font-size-6 tw-strong tw-upcase">
											{{ t(preset.i18n, preset.title) }}
										</div>
									</div>
									<button
										v-else
										:key="idx"
										:disabled="preset.disabled"
										:class="{'tw-button--disabled': preset.disabled, 'ffz-tooltip ffz-tooltip--no-mouse': preset.list && preset.list.desc}"
										:data-title="preset.list ? (preset.list.desc_i18n ? t(preset.list.desc_i18n, preset.list.desc) : preset.list.desc) : null"
										class="tw-interactable tw-interactable--alpha tw-interactable--hover-enabled tw-interactive tw-full-width"
										@click="addColumn(preset)"
									>
										<div class="tw-pd-y-05 tw-pd-x-1">
											<div :class="preset.list ? preset.list.icon : preset.display.icon">
												{{ t(preset.list ? preset.list.i18n : preset.display.i18n, preset.list ? preset.list.title : preset.display.title) }}
											</div>
										</div>
									</button>
								</template>
							</div>
						</simplebar>
					</balloon>
				</div>
				<button
					:class="[refreshable > 0 ? '' : 'tw-button--disabled']"
					:disabled="refreshable === 0"
					class="tw-mg-l-1 tw-button tw-button--text"
					@click="refreshAll"
				>
					<span class="tw-button__text ffz-i-arrows-cw">
						{{ t('addon.deck.refresh-all', 'Refresh All') }}
					</span>
				</button>
			</div>
			<div ref="tablist" class="bd--deck-selector tw-flex">
				<div
					v-for="(tab, index) of tabs"
					:key="tab.id"
					class="tw-mg-r-1"
				>
					<button
						:class="{'tw-button--text': index !== tab_index}"
						class="tw-button"
						@click="switchTab(index)"
					>
						<span :class="tab.icon" class="tw-button__text">
							{{ tab.i18n ? t(tab.i18n, tab.title) : tab.title }}
						</span>
					</button>
				</div>
				<button
					class="tw-button tw-button--hollow tw-tooltip-wrapper"
					@click="openTabSettings"
				>
					<span class="tw-button__text ffz-i-cog" />
					<div class="tw-tooltip tw-tooltip--down tw-tooltip--align-right">
						{{ t('addon.deck.tab-settings', 'Tab Settings') }}
					</div>
				</button>
			</div>
			<div v-if="currentTags && currentTags.length" class="bd--global-tags tw-flex tw-align-items-center tw-mg-l-1 tw-border-l tw-pd-l-1">
				<div class="tw-mg-r-05">
					{{ t('addon.deck.filtered', 'Filtered by') }}
				</div>
				<bd-tag-list :tags="currentTags.slice(0, 3)" :noMargin="true" />
				<div v-if="currentTags.length > 3" class="tw-mg-l-05 tw-tooltip-wrapper">
					{{ t('addon.deck.filter-more', ' and {count,number} other{count,en_plural}', {count: currentTags.length - 3}) }}
					<div class="tw-tooltip tw-tooltip--down tw-tooltip--align-right tw-balloon--lg tw-pd-x-1 tw-pd-b-1">
						<bd-tag-list
							:tags="currentTags"
							class="tw-flex tw-flex-wrap"
						/>
					</div>
				</div>
			</div>
		</div>
		<div class="bd--deck-list tw-flex">
			<div ref="list" class="tw-flex tw-flex-grow-1 tw-mg-t-5 tw-mg-l-3 tw-mg-b-1">
				<component
					v-for="column in columns"
					:key="column.id"
					:is="getColumnComponent(column)"
					:data="column"
					:settings="activeSettings"
					:collapsed="column.collapsed"
					:type="types[column.type]"
					@can-refresh="updateRefresh()"
					@save="updateColumn($event)"
					@delete="removeColumn(column.id)"
					@collapse="collapseColumn(column.id, $event)"
					@cache="cacheColumn(column.id, $event)"
					@open-modal="openModal($event)"
				/>
				<div v-if="! columns.length" class="tw-c-text-base">
					<h1 class="ffz-i-up-big tw-mg-l-2 tw-c-text-alt-2" />
					<markdown :source="t('addon.deck.intro', 'Welcome to Deck, the best way to discover content on Twitch.\n\nYou need to start by adding a column using the New button.')" />
				</div>
				<div class="tw-mg-r-2" />
			</div>
		</div>
		<div v-if="modal" class="bd--deck-modal tw-flex tw-align-items-start tw-justify-content-center">
			<component
				:is="modal"
				:data="modal_data"
				@open-modal="openModal($event)"
				@close="closeModal"
			/>
		</div>
	</div>
</template>

<script>

import Sortable from 'sortablejs';
import {getLoader, getLocale} from '../data';

const {maybeLoad} = FrankerFaceZ.utilities.fontAwesome;
const {get, has, deep_copy, generateUUID} = FrankerFaceZ.utilities.object;

const category_labels = {
	live: 'Streams',
	video: 'Videos',
	clip: 'Clips',
	other: 'Other'
};

function getDefaultTab() {
	return {
		id: generateUUID(),
		title: 'Default Tab',
		i18n: 'addon.deck.default-tab',
		columns: []
	}
};

export default {
	data() {
		const data = this.$vnode.data;

		if ( ! Array.isArray(data.tabs) )
			data.tabs = [];

		if ( ! data.tabs.length )
			data.tabs.push(getDefaultTab());

		if ( ! data.tab_index || data.tab_index < 0 )
			data.tab_index = 0;

		if ( data.tab_index >= data.tabs.length )
			data.tab_index = data.tabs.length - 1;

		data.refreshable = 0;
		data.menu_open = false;

		data.modal = null;
		data.modal_data = null;
		data.loader = 0;

		return data;
	},

	computed: {
		tab() {
			return this.tabs[this.tab_index];
		},

		currentTags() {
			if ( ! this.tab || ! Array.isArray(this.tab.tags) )
				return null;

			this.loader;
			return this.tab.tags.map(id => {
				const tag = getLoader().getTagImmediate(id, this.load, true);
				return tag ? deep_copy(tag) : {
					id,
					name: '(...)'
				}
			});
		},

		activeSettings() {
			return Object.assign({
				lang: this.tab && this.tab.lang || null,
				tags: this.tab && this.tab.tags || []
			}, this.settings);
		},

		columns() {
			return this.tab.columns;
		},

		presets() {
			const categories = {live: [], video: []};
			for(const [key, type] of Object.entries(this.types))
				if ( type && type.presets )
					for(const [category, presets] of Object.entries(type.presets)) {
						const cat = categories[category] = categories[category] || [];
						for(const preset of presets) {
							preset.type = key;
							cat.push(preset);
						}
					}

			// Sort the categories alphabetically by key.
			const sorted = Object.entries(categories);
			sorted.sort((a,b) => a[0] > b[0] ? 1 : a[0] < b[0] ? -1 : 0);

			const out = [];
			for(const [cat, presets] of sorted) {
				if ( ! presets || ! presets.length )
					continue;

				if ( out.length )
					out.push({divider: true});

				out.push({
					title: category_labels[cat] || cat,
					i18n: `addon.deck.category.${cat}`
				});

				for(const preset of presets)
					out.push(preset);
			}

			return out;
		}
	},

	watch: {
		tabs() {
			this.loadIcons();

			if ( this.tab_index >= this.tabs.length )
				this.switchTab(this.tabs.length - 1);
		},

		columns() {
			this.$nextTick(() => this.updateRefresh());
		}
	},

	created() {
		this.load = () => this.loader++;
	},

	mounted() {
		window.deck = this;

		this.loadIcons();

		this.sortable = Sortable.create(this.$refs.list, {
			draggable: '.bd--deck-column',
			handle: '.bd--column-header',
			filter: 'button',

			onUpdate: event => {
				if ( event.newIndex === event.oldIndex )
					return;

				this.moveColumn(event.oldIndex, event.newIndex);
			}
		});
	},

	beforeDestroy() {
		if ( window.deck === this )
			window.deck = null;

		if ( this.sortable ) {
			this.sortable.destroy();
			this.sortable = null;
		}
	},

	methods: {
		getColumnComponent(column) {
			const type = this.types[column.type];
			if ( ! type )
				return 'bd-column-bad';

			if ( type.getColumnComponent )
				return type.getColumnComponent();

			return 'bd-column';
		},

		loadIcons() {
			for(const tab of this.tabs)
				if ( tab && tab.icon )
					maybeLoad(tab.icon);
		},

		openTabSettings(event) {
			this.modal = 'bd-tab-settings';
			this.modal_data = {
				tabs: this.tabs,
				save: tabs => {
					this.tabs = tabs;
					this.saveTabs(this.tabs);
				}
			};
		},

		openModal(event) {
			this.modal = event.modal;
			this.modal_data = event.data;
		},

		closeModal() {
			this.modal = this.modal_data = null;
		},

		updateRefresh() {
			let i = 0;
			for(const child of this.$children)
				if ( child && child.canRefresh )
					i++;

			this.refreshable = i;
		},

		refreshAll() {
			for(const child of this.$children)
				if ( child && child.canRefresh )
					child.refresh();
		},

		closeMenu() {
			this.menu_open = false
		},

		toggleMenu() {
			this.menu_open = ! this.menu_open;
		},

		saveColumns(columns) {
			this.saveTabs(this.tabs);
		},

		addTab() {
			this.tabs.push({
				id: generateUUID(),
				title: `Tab #${this.tabs.length + 1}`,
				columns: []
			});
			this.saveTabs(this.tabs);
			this.switchTab(this.tabs.length - 1);
		},

		saveTab(id, data) {
			if ( id && id.id )
				id = id.id;

			for(let i=0; i < this.tabs.length; i++) {
				if ( this.tabs[i].id === id ) {
					this.tabs[i] = Object.assign(this.tabs[i], data);
					this.saveTabs(this.tabs);
					return;
				}
			}
		},

		removeTab(id) {
			if ( id && id.id )
				id = id.id;

			for(let i=0; i < this.tabs.length; i++) {
				if ( this.tabs[i].id === id ) {
					this.tabs.splice(i, 1);

					// We must always have at least one tab.
					if ( ! this.tabs.length )
						this.tabs.push(getDefaultTab());

					this.saveTabs(this.tabs);
					return;
				}
			}
		},

		moveTab(from, to) {
			this.tabs.splice(to, 0, ...this.tabs.splice(from, 1));

			let idx = this.tab_index;

			if ( idx === from )
				idx = to;
			else {
				if ( idx >= from )
					idx--;
				if ( idx >= to )
					idx++;
			}

			this.saveTabs(this.tabs);
			this.switchTab(idx);
		},

		updateColumn(column) {
			const id = column.id;
			for(let i=0; i < this.columns.length; i++) {
				if ( this.columns[i].id === id ) {
					this.columns.splice(i, 1, deep_copy(column));
					this.saveColumns(this.columns);
					return;
				}
			}
		},

		collapseColumn(id, collapsed) {
			if ( id && id.id )
				id = id.id;

			for(let i=0; i < this.columns.length; i++) {
				if ( this.columns[i].id === id ) {
					this.columns[i].collapsed = collapsed;
					this.saveColumns(this.columns);
					return;
				}
			}
		},

		cacheColumn(id, cache) {
			if ( id && id.id )
				id = id.id;

			for(let i=0; i < this.columns.length; i++) {
				if ( this.columns[i].id === id ) {
					this.columns[i].cache = cache;
					this.saveColumns(this.columns);
					return;
				}
			}
		},

		removeColumn(id) {
			if ( id && id.id )
				id = id.id;

			for(let i=0; i < this.columns.length; i++) {
				if ( this.columns[i].id === id ) {
					this.columns.splice(i, 1);
					this.saveColumns(this.columns);
					return;
				}
			}
		},

		moveColumn(from, to) {
			this.columns.splice(to, 0, ...this.columns.splice(from, 1));
			this.saveColumns(this.columns);
		},

		addColumn(preset) {
			this.menu_open = false;

			const data = Object.assign({display: {}, settings: {}}, preset, {id: generateUUID()});
			delete data.list;

			if ( ! has(data.display, 'max_tags') )
				data.display.max_tags = 3;

			this.columns.push(data);
			this.saveColumns(this.columns);
		},

		switchTab(idx) {
			this.tab_index = idx;
			this.navigateToTab(idx);
		}
	}
}

</script>