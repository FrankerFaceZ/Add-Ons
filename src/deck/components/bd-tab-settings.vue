<template>
	<bd-modal @close="save">
		<template #title>
			<h4 class="ffz-i-cog ffz-i-pd-1 tw-pd-x-1">
				{{ t('addons.deck.tab-settings', 'Tab Settings') }}
			</h4>
		</template>

		<simplebar>
			<div class="tw-flex tw-flex-nowrap tw-align-items-center tw-mg-x-1 tw-mg-t-1">
				<div class="tw-flex-grow-1" />
				<button
					class="tw-button tw-button--text"
					@click="addTab"
				>
					<span class="tw-button__text ffz-i-plus">
						{{ t('addons.deck.new-tab', 'New Tab') }}
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
				title: this.t('addons.deck.tab-name', 'Tab #{count}', {count: this.tabs.length + 1}),
				columns: []
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
					return;
				}
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