<template>
	<bd-modal @close="save">
		<template #title>
			<h4 class="ffz-i-cog ffz-i-pd-1 tw-pd-x-1">
				{{ t('addon.deck.tab-settings', 'Tab Settings') }}
			</h4>
		</template>

		<simplebar>
			<div class="tw-flex tw-flex-nowrap tw-align-items-center tw-mg-x-1 tw-mg-t-1">
				<div class="tw-flex-grow-1" />
				<button
					v-if="! hasSidebar"
					class="tw-button tw-button--text"
					@click="addSidebarTab"
				>
					<span class="tw-button__text ffz-i-plus">
						{{ t('addon.deck.new-sidebar', 'New Sidebar Tab') }}
					</span>
				</button>
				<button
					class="tw-button tw-button--text"
					@click="addTab"
				>
					<span class="tw-button__text ffz-i-plus">
						{{ t('addon.deck.new-tab', 'New Tab') }}
					</span>
				</button>
			</div>

			<div ref="list" class="bd--tab-list tw-pd-1">
				<bd-tab-editor
					v-for="tab in tabs"
					:key="tab.id"
					:tab="tab"
					:deletable="tabs.length > 1"
					@save="updateTab(tab.id, $event)"
					@delete="removeTab(tab.id)"
				/>
			</div>

			<div class="tw-pd-y-5" />
			<div class="tw-pd-y-5" />

		</simplebar>
	</bd-modal>
</template>

<script>

import Sortable from 'sortablejs';

const {get, has, deep_copy, generateUUID} = FrankerFaceZ.utilities.object;

export default {
	props: ['data'],

	data() {
		return {
			tabs: deep_copy(this.data.tabs),
			deleting: false
		}
	},

	computed: {
		hasSidebar() {
			for(const tab of this.tabs)
				if ( tab?.sidebar)
					return true;
			return false;
		}
	},

	mounted() {
		this.sortable = Sortable.create(this.$refs.list, {
			draggable: 'section',
			handle: '.handle',
			onUpdate: event => {
				if ( event.newIndex === event.oldIndex )
					return;

				this.tabs.splice(event.newIndex, 0, ...this.tabs.splice(event.oldIndex, 1));
			}
		});
	},

	beforeDestroy() {
		if ( this.sortable ) {
			this.sortable.destroy();
			this.sortable = null;
		}
	},

	methods: {
		addTab() {
			this.tabs.push({
				id: generateUUID(),
				title: this.t('addon.deck.tab-name', 'Tab #{count}', {count: this.tabs.length + 1}),
				columns: []
			});
		},

		addSidebarTab() {
			this.tabs.push({
				id: generateUUID(),
				title: this.t('addon.deck.tab-name.sidebar', 'Sidebar Tab'),
				sidebar: true,
				columns: [
					{
						type: 'live/followed',
						id: generateUUID(),
						display: {
							default_count: 20,
							max_tags: 3
						},
						settings: {}
					},
					{
						type: 'live/recommended',
						id: generateUUID(),
						display: {
							default_count: 5,
							max_tags: 3
						},
						settings: {
							count: 10
						}
					}
				]
			});
		},

		removeTab(id) {
			for(let i=0; i < this.tabs.length; i++) {
				if ( this.tabs[i].id === id ) {
					this.tabs.splice(i, 1);
					return;
				}
			}
		},

		updateTab(id, data) {
			for(let i=0; i < this.tabs.length; i++) {
				if ( this.tabs[i].id === id ) {
					this.tabs[i] = Object.assign(this.tabs[i], data);
					break;
				}
			}

			if (data.sidebar)
				for(let i = 0; i < this.tabs.length; i++) {
					if (this.tabs[i].id !== id && this.tabs[i].sidebar)
						this.tabs[i].sidebar = false;
				}
		},

		save() {
			if ( ! this.tabs )
				return;

			this.data.save(this.tabs);
			this.$emit('close');
		}
	}
}

</script>