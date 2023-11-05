<template>
	<div
		ref="root"
		:class="[
			items.length ? '' : 'bd--shelf-expanded',
			colors ? 'tw-c-background-alt tw-c-text-base' : ''
		]"
		class="bd--shelf side-nav-section tw-flex tw-flex-column"
		:data-shelf-id="data.id"
		role="group"
		:style="colors"
	>
		<div class="bd--shelf-expanded side-nav-header tw-mg-1 tw-pd-t-05 tw-flex tw-flex-nowrap tw-align-items-center">
			<figure :class="icon" class="tw-mg-r-05" />
			<h5 class="tw-ellipsis" :title="title">
				{{ title }}
			</h5>
		</div>
		<div
			class="bd--shelf-collapsed ffz-tooltip ffz-tooltip--no-mouse side-nav-header tw-c-text-alt-2 tw-flex tw-flex-wrap tw-justify-content-center tw-align-items-center tw-flex-grow-1 tw-pd-y-1"
			data-tooltip-type="text"
			:data-title="title"
			:data-tooltip-side="settings.swap_sidebars ? 'left' : 'right'"
		>
			<figure :class="icon" class="tw-font-size-4" />
		</div>

		<div v-observe-visibility="{callback: onTopChange}" />

		<transition-group name="bd--appear" tag="div">
			<div
				v-for="item in limited"
				:key="item.real_id || item.id"
			>
				<component
					:is="getShelfComponent(item)"
					:item="item"
					:inst="inst"
					:settings="activeSettings"
					:now="now"
					:getFFZ="getFFZ"
				/>
			</div>
		</transition-group>

		<div v-observe-visibility="{callback: onBottomChange}" />
		<div v-if="! canRun" class="tw-mg-x-1 tw-c-text-alt-2">
			{{ t('addon.deck.need-config', 'You need to finish configuring this column.') }}
		</div>
		<div v-else-if="finished && ! items.length" class="tw-mg-x-1 tw-c-text-alt-2">
			{{ t('addon.deck.empty', 'There are no results.') }}
		</div>
		<div v-else-if="errored" class="tw-mg-x-1 tw-c-text-alt-2">
			{{ t('addon.deck.error', 'An error occured while loading more data.') }}
		</div>

		<div class="bd--shelf-expanded tw-pd-y-05 tw-pd-x-1 tw-flex tw-full-width tw-overflow-hidden tw-align-left tw-justify-content-between side-nav-show-more-toggle__button">
			<button
				v-if="too_throttled && canShowMore"
				class="tw-button tw-button--text"
				@click="showMore"
			>
				<span class="tw-button__text">
					{{ t('addon.deck.load-more', 'Load More') }}
				</span>
			</button>
			<button
				v-else-if="canShowMore"
				class="tw-button tw-button--text"
				@click="showMore"
			>
				<span class="tw-button__text">
					{{ t('addon.deck.show-more', 'Show More') }}
				</span>
			</button>
			<div v-else />
			<button
				v-if="canShowLess"
				class="tw-button tw-button--text"
				@click="showLess"
			>
				<span class="tw-button__text">
					{{ t('addon.deck.show-less', 'Show Less') }}
				</span>
			</button>
			<div v-else />
		</div>
	</div>
</template>

<script>

import { getTheme } from '../data';

const {maybeLoad} = FrankerFaceZ.utilities.fontAwesome;
const {has, deep_copy} = FrankerFaceZ.utilities.object;
const {Color} = FrankerFaceZ.utilities.color;


export default {
	props: ['data', 'type', 'settings', 'offset', 'getFFZ'],

	data() {
		const count = this.data.display?.default_count || 5;

		return {
			// The instance in charge of this shelf's behavior.
			inst: null,
			loader: 0,

			visible: false,
			at_top: true,
			at_end: false,

			// Used to determine when enough time has passed to let us refresh
			// our data without having changed anything.
			first_load: 0,
			now: 0,

			// Loading State
			display: 0,
			old_items: null,
			items: [],
			size: count,
			cursor: null,
			finished: false,
			pending_reset: false,
			want_refresh: false,
			throttled: false,
			throttle_count: 0,
			too_throttled: false,
			loading: false,
			first_refresh: false,

			// Error State
			errored: false,
			show_error: false,
			error: null
		}
	},

	computed: {
		colors() {
			if ( ! this.data.display.color )
				return '';

			const color = Color.RGBA.fromCSS(this.data.display.color),
				theme = getTheme();
			if ( ! color || ! theme )
				return '';

			return theme.generateBackgroundTextBlob(color);
		},

		use_items() {
			if ( this.items.length || this.old_items == null )
				return this.items;
			return this.old_items;
		},

		canShowMore() {
			return this.display < this.use_items.length || (! this.errored && ! this.finished && this.canRun);
		},

		canShowLess() {
			return this.display > this.size;
		},

		icon() {
			let icon = this.data.display.icon;
			if ( icon && icon.length )
				return icon;

			if ( this.inst && this.inst.getIcon ) {
				this.loader;
				icon = this.inst.getIcon();
			}

			return icon || 'ffz-i-tag';
		},

		title() {
			const title = this.data.display.title;

			if ( title && title.length )
				return title;

			if ( this.inst && this.inst.getTitle ) {
				this.loader;
				const out = this.inst.getTitle();
				if ( Array.isArray(out) )
					return this.t(...out);

				return out;
			}

			return null;
		},

		hasSubtitles() {
			return this.subtitles && this.subtitles.length > 0;
		},

		subtitles() {
			if ( ! this.inst || ! this.inst.getSubtitles )
				return null;

			this.loader;
			return this.inst.getSubtitles();
		},

		subtitle_tip() {
			if ( ! this.hasSubtitles )
				return null;

			const out = [];

			for(const tip of this.subtitles) {
				if ( tip.tooltip )
					out.push(tip.tooltip_i18n ? this.t(tip.tooltip_i18n, tip.tooltip, tip) : tip.tooltip);
				else
					out.push(tip.i18n ? this.t(tip.i18n, tip.text, tip) : tip.text);
			}

			return out.join('\n');
		},

		canRun() {
			this.loader;
			return this.inst && this.inst.canRun();
		},

		limited() {
			const filtered = this.filtered;
			if ( filtered.length > this.display )
				return filtered.slice(0, this.display);
			return filtered;
		},

		filtered() {
			this.loader;
			if ( this.inst && this.inst.filterItems )
				return this.inst.filterItems(this.use_items);

			return this.use_items;
		},

		refreshDelay() {
			this.loader;
			if ( this.inst && this.inst.getRefreshDelay )
				return this.inst.getRefreshDelay();

			return 60000;
		},

		canRefresh() {
			if ( this.is_collapsed || ! this.first_load || this.loading || ! this.canRun )
				return false;

			return this.now - this.first_load >= this.refreshDelay;
		},

		autoRefreshDelay() {
			let value = this.data.display.refresh;
			if ( value == null || value < 0 )
				value = 1;

			const base = this.inst && this.inst.getRefreshDelay(),
				multiplier = this.inst && this.inst.getRefreshMultiplier();

			return base + (value * multiplier) + (this.first_refresh ? 0 : (this.offset * 5000));
		},

		ttRefresh() {
			if ( this.is_collapsed || ! this.first_load || this.loading || ! this.canRun )
				return null;

			const value = this.autoRefreshDelay;
			if ( ! value || value < 0 )
				return null;

			return (this.first_load + this.autoRefreshDelay) - this.now;
		},

		shouldRefresh() {
			if ( ! this.canRefresh )
				return false;

			const delay = this.autoRefreshDelay;
			if ( ! delay )
				return false;

			return this.now - this.first_load >= this.autoRefreshDelay;
		},

		canAutoRefresh() {
			const delay = this.autoRefreshDelay;
			return delay != null && delay >= 0;
		},

		activeSettings() {
			let width, height;

			if ( this.width === 2 ) {
				// Wide
				width = 400;
				height = 225;

			} else {
				// Normal and Narrow
				width = 320;
				height = 180;
			}

			const out = Object.assign({
				previewWidth: width,
				previewHeight: height,
				max_tags: has(this.data.display, 'max_tags') ? this.data.display.max_tags : 3
			}, this.settings);

			if ( this.data.display.hide_avatars )
				out.show_avatars = false;

			if ( this.data.display.hide_viewers )
				out.hide_viewers = true;

			return out;
		}
	},

	watch: {
		data: {
			handler() {
				if ( this.inst )
					this.inst.updateSettings(deep_copy(this.data.settings));

				this.size = this.data.display?.default_count || 5;

				this.refreshFromInst();
			}
		},

		icon() {
			maybeLoad(this.icon)
		},

		canRefresh() {
			this.$emit('can-refresh', this.canRefresh);
		},

		shouldRefresh() {
			if ( this.shouldRefresh )
				this.refresh();
		}
	},

	created() {
		this.inst = new this.type(this, this.data.settings, this.activeSettings, this.data.cache);

		this.refreshFromInst = () => this.loader++;

		// Refresh Checking
		this._timer = setInterval(() => this.now = Date.now(), 1000);
		this.now = Date.now();
		this.last_load = 0;

		this.$emit('init', this);
	},

	beforeDestroy() {
		clearInterval(this._timer);
		clearTimeout(this._maybe_timer);
	},

	mounted() {
		if ( this.inst && this.inst.useIcon() )
			maybeLoad(this.icon);

		this.maybeLoadMore();
	},

	methods: {
		onStreamChange(type, id) {
			if ( this.inst && this.inst.onStreamChange )
				this.inst.onStreamChange(type, id);
		},

		showMore() {
			if ( this.display < this.items.length ) {
				this.display += this.size;
				if ( this.display <= this.items.length )
					return;
			}

			this.maybeLoadMore();
		},

		showLess() {
			this.display -= this.size;
			if ( this.display < this.size )
				this.display = this.size;
		},

		onVisibilityChange(visible) {
			this.visible = visible;
		},

		onTopChange(visible) {
			this.at_top = visible;
		},

		onBottomChange(visible) {
			this.at_end = visible;
		},

		saveCache(cache) {
			this.$emit('cache', cache);
		},

		invalidateData() {
			this.resetData();
			this.maybeLoadMore();
		},

		getShelfComponent(item) {
			return this.inst ? this.inst.getShelfComponent(item) : null;
		},

		// Loading

		resetData() {
			clearTimeout(this._maybe_timer);

			if ( this.loading )
				this.pending_reset = true;
			else {
				this.inst.reset();

				this.first_load = 0;
				this.last_load = 0;
				this.items = [];
				this.cursor = null;
				this.finished = false;
				this.pending_reset = false;
				this.want_refresh = false;
				this.throttled = false;
				this.throttle_count = 0;
				this.throttle_incremented = false;
				this.too_throttled = false;

				this.errored = false;
				this.show_error = false;
				this.error = null;

				this.refreshFromInst();
			}
		},

		refresh() {
			this.old_items = this.items;
			this.resetData();
			this.first_refresh = true;
			this.want_refresh = true;
			this.maybeLoadMore();
		},

		btnLoadMore() {
			this.throttle_count = 0;
			this.too_throttled = false;
			this.maybeLoadMore();
		},

		maybeLoadMore() {
			if ( ! this._scheduled_load ) {
				this._scheduled_load = true;
				this.$nextTick(() => this._maybeLoadMore());
			}
		},

		_maybeLoadMore() {
			this._scheduled_load = false;
			if ( ! this.loading && ! this.errored && ! this.finished && this.canRun )
				this.loadMore();
		},

		async loadMore() {
			if ( this.loading || this.errored || this.finished || ! this.canRun )
				return;

			clearTimeout(this._maybe_timer);
			const offset = Date.now() - this.last_load;
			if ( offset < (this.inst && this.inst.getThrottle ? this.inst.getThrottle(this.throttle_count) : (500 * (1 + 0.1 * this.throttle_count))) ) {
				this.throttled = true;
				if ( ! this.throttle_incremented ) {
					this.throttle_count++;
					this.throttle_incremented = true;
				}

				if ( this.throttle_count > 5 )
					this.too_throttled = true;
				else
					this._maybe_timer = setTimeout(() => this.maybeLoadMore(), offset);

				return;

			} else if ( ! this.throttled ) {
				this.too_throttled = false;
				this.throttle_count = 0;
			}

			this.throttle_incremented = false;
			this.throttled = false;
			this.loading = true;

			try {
				let wanted = this.size;
				const old = this.old_items && this.old_items.length;
				if ( old && old > wanted && old <= 4 * wanted ) {
					wanted = Math.ceil(old / wanted) * wanted;
					if ( wanted > this.display )
						wanted = this.display;
				}

				const data = await this.inst.load(wanted, this.cursor, this.want_refresh);

				if ( ! this.pending_reset ) {
					this.items = this.items.concat(data.items);
					if ( this.inst.shouldClientSort() )
						this.items = this.inst.performClientSort(this.items);

					this.old_items = null;
					this.display = Math.ceil(this.items.length / this.size) * this.size;
					this.cursor = data.cursor;
					this.finished = data.finished;
				}

			} catch(err) {
				console.error(err);
				this.error = err;
				this.errored = true;
			}

			this.last_load = Date.now();
			if ( ! this.first_load )
				this.first_load = this.last_load;

			this.want_refresh = false;
			this.loading = false;

			if ( this.pending_reset )
				this.resetData();
		}
	}
}

</script>