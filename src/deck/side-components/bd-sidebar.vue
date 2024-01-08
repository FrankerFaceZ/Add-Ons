<template>
	<div ref="deck" class="bd--sidebar">
		<component
			:is="getShelfComponent(shelf)"
			v-for="(shelf, idx) in visible"
			:key="shelf.id"
			:data="shelf"
			:offset="idx"
			:settings="activeSettings"
			:collapsed="shelf.collapsed"
			:type="types[shelf.type]"
			:getFFZ="getFFZ"
			@can-refresh="updateRefresh()"
		/>
	</div>
</template>

<script>

const {maybeLoad} = FrankerFaceZ.utilities.fontAwesome;

export default {
	data() {
		const data = this.$vnode.data;

		if ( ! Array.isArray(data.tabs) )
			data.tabs = [];

		data.refreshable = 0;
		data.loader = 0;

		return data;
	},

	computed: {
		tab() {
			for(const tab of this.tabs)
				if ( tab && tab.sidebar )
					return tab;

			return null;
		},

		activeSettings() {
			return Object.assign({
				lang: this.tab && this.tab.lang || null,
				tags: this.tab && this.tab.tags || []
			}, this.settings);
		},

		shelves() {
			return this.tab && this.tab.columns;
		},

		visible() {
			const out = [];
			if ( this.shelves )
				for(const shelf of this.shelves)
					if ( ! shelf.collapsed )
						out.push(shelf);

			return out;
		}
	},

	watch: {
		tab() {
			this.loadIcons();
		},

		shelves() {
			this.$nextTick(() => this.updateRefresh());
		}
	},

	created() {
		this.load = () => this.loader++;
	},

	mounted() {
		window.deckbar = this;
		this.loadIcons();
	},

	beforeDestroy() {
		if ( window.deckbar === this )
			window.deckbar = null;
	},

	methods: {
		onStreamChange(type, id) {
			for(const child of this.$children)
				if ( child && child.onStreamChange)
					child.onStreamChange(type, id);
		},

		getShelfComponent(shelf) {
			const type = this.types[shelf.type];
			if ( ! type )
				return 'bd-shelf-bad';

			if ( type.getShelfComponent )
				return type.getShelfComponent();

			return 'bd-shelf';
		},

		loadIcons() {
			if ( this.tab && this.tab.icon )
				maybeLoad(this.tab.icon);
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
		}
	}
}

</script>