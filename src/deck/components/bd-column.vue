<template>
	<div
		ref="root"
		:class="[vertical ? 'tw-mg-b-1 tw-mg-r-3' : 'tw-mg-r-1', vertical ? 'vertical' : '', is_collapsed ? 'collapsed' : '', widthClass, colors ? 'tw-c-text-base' : '', hasArt ? 'bd--art-column tw-c-background-alt' : 'tw-c-background-base']"
		class="bd--deck-column tw-relative tw-border tw-elevation-1 tw-flex-column"
		:data-column-id="data.id"
		:data-columns="columns"
		:style="`--columns: ${columns};${colors}`"
	>
		<div
			v-if="hasArt"
			class="bd--column-cover"
			:style="{ backgroundImage: `url(&quot;${cover}&quot;)`}"
		>
			<span class="bd--fader" />
		</div>
		<div
			ref="header"
			:class="[is_collapsed ? 'collapsed tw-pd-x-05' : 'tw-border-b tw-pd-x-1']"
			class="bd--column-header tw-pd-y-05 tw-flex"
			@dblclick="doubleClick"
		>
			<div class="tw-flex-grow-1 tw-flex tw-align-items-center tw-z-above">
				<button
					class="tw-button-icon tw-flex-shrink-0"
					@click="toggle"
				>
					<span class="tw-button-icon__icon">
						<figure :class="`ffz-i-${is_collapsed != vertical ? 'down' : 'right'}-dir`" />
					</span>
				</button>
				<div
					v-if="! is_collapsed && avatar"
					class="column-avatar tw-mg-r-05"
				>
					<img :src="avatar">
				</div>
				<div class="tw-flex-grow-1 tw-flex tw-align-items-center tw-ellipsis">
					<div
						v-if="(is_collapsed || ! avatar) && icon"
						:class="[is_collapsed ? 'tw-mg-b-05' : 'tw-mg-r-05']"
						class="column-icon tw-font-size-3 tw-flex-shrink-0"
					>
						<figure :class="icon" />
					</div>
					<div class="tw-font-size-5 tw-align-left tw-flex-grow-1 tw-ellipsis">
						<p :title="title" class="bd--header-text tw-ellipsis">{{ title }}</p>
						<div
							v-if="! is_collapsed && hasSubtitles"
							data-tooltip-type="child"
							class="ffz-tooltip ffz-tooltip--no-mouse tw-ellipsis tw-font-size-7"
						>
							<span
								v-for="(subtitle, idx) in subtitles"
								:key="idx"
								:class="subtitle.icon"
								class="tw-mg-r-05 bd--header-text"
							>
								{{ subtitle.i18n ? t(subtitle.i18n, subtitle.text, subtitle) : subtitle.text }}
							</span>
							<div class="ffz-tooltip-child tw-pd-x-05 tw-align-left">
								<div
									v-for="(subtitle, idx) in subtitles"
									:key="idx"
									:class="[subtitle.tip_icon || subtitle.icon, (subtitle.tip_icon || subtitle.icon) ? 'ffz-i-pd-1' : '']"
									class="tw-mg-y-05"
								>
									<template v-if="subtitle.tip">{{ subtitle.tip_i18n ? t(subtitle.tip_i18n, subtitle.tip, subtitle) : subtitle.tip }}</template>
									<template v-else>{{ subtitle.i18n ? t(subtitle.i18n, subtitle.text, subtitle) : subtitle.text }}</template>
								</div>
							</div>
						</div>
					</div>
				</div>
				<button
					v-if="! is_collapsed"
					class="tw-button tw-button--text tw-flex-shrink-0 ffz-il-tooltip__container"
					@click="openMenu"
				>
					<figure class="tw-button__text ffz-i-cog" />
					<div class="ffz-il-tooltip ffz-il-tooltip--down ffz-il-tooltip--align-right">
						{{ t('addon.deck.open-settings', 'Open Settings') }}
					</div>
				</button>
			</div>
			<div
				v-if="! is_collapsed && canAutoRefresh"
				class="bd--column-progress ffz-il-tooltip__container"
			>
				<div
					class="ffz-progress-bar ffz-progress-bar-countdown ffz-progress-bar--default ffz-progress-bar--mask"
					role="progressbar"
					:aria-valuenow="progressWidth"
					aria-valuemin="0"
					aria-valuemax="100"
				>
					<div
						class="tw-block ffz-progress-bar__fill"
						data-a-target="tw-progress-bar-animation"
						:style="{
							width: `${progressWidth}%`,
							transition: progressWidth >= 99 ? 'none' : '1s linear all'
							//'animation-duration': `${ttRefresh / 1000}s`
						}"
					/>
				</div>
				<div class="ffz-il-tooltip ffz-il-tooltip--up ffz-il-tooltip--align-right">
					{{ t('addon.deck.auto-refresh', 'Automatically refreshing in {delay}', {delay: progressTip}) }}
				</div>
			</div>
		</div>
		<div
			v-if="! is_collapsed"
			ref="scroller"
			:class="[hasArt ? '' : 'tw-c-background-alt']"
			class="bd--deck-scroller"
		>
			<transition name="bd--slide-down">
				<div
					v-if="canRefresh"
					:class="[canScrollTop ? 'bd--top-link--right' : '']"
					class="bd--top-link tw-align-center tw-c-background-base tw-pd-05 tw-border-b"
					@click="refresh"
				>
					<span class="ffz-i-arrows-cw">
						{{ t('addon.deck.refresh', 'Refresh') }}
					</span>
				</div>
			</transition>
			<transition name="bd--slide-down">
				<div
					v-if="canScrollTop"
					:class="[canRefresh ? 'bd--top-link--left' : '']"
					class="bd--top-link tw-align-center tw-c-background-base tw-pd-05 tw-border-b"
					@click="scrollToTop"
				>
					{{ t('addon.deck.go-to-top', 'Return to Top') }}
				</div>
			</transition>
			<simplebar v-observe-visibility="{callback: onVisibilityChange}">
				<div v-observe-visibility="{callback: onTopChange}" />
				<div
					v-for="item in visible_items"
					:key="item.real_id || item.id"
					class="tw-mg-t-1 tw-mg-l-1 tw-pd-b-1 tw-border-b"
					:class="{'bd--hidden-item': show_filtered && ! filtered.includes(item)}"
				>
					<component
						:is="getComponent(item)"
						:item="item"
						:inst="inst"
						:settings="activeSettings"
					/>
				</div>
				<div v-observe-visibility="{callback: onBottomChange}" />
				<div class="tw-align-center tw-mg-l-1 tw-mg-y-2 tw-c-text-alt-2">
					<template v-if="! canRun">
						<div class="bd--width">
							<h1 class="ffz-i-up-big" />
							<div>
								{{ t('addon.deck.need-config', 'You need to finish configuring this column.') }}
							</div>
							<div class="tw-mg-t-1">
								<button
									class="tw-button tw-button--text"
									@click="openMenu"
								>
									<span class="ffz-i-cog tw-button__text">
										{{ t('addon.deck.open-settings', 'Open Settings') }}
									</span>
								</button>
							</div>
						</div>
					</template>
					<template v-else-if="finished || errored || too_throttled">
						<div class="tw-mg-b-1">
							<img
								src="//cdn.frankerfacez.com/emoticon/26608/2"
								srcSet="//cdn.frankerfacez.com/emoticon/26608/2 1x, //cdn.frankerfacez.com/emoticon/26608/4 2x"
							>
						</div>
						<div v-if="finished" class="bd--width">
							{{ t('addon.deck.end', 'You have reached the end.') }}
							<div
								v-if="filtered.length < items.length"
								class="tw-mg-t-05"
							>
								{{ t('addon.deck.end-filtered', '({removed,number} of {total, plural, one {# item} other {# items} } have been hidden by client-side filtering.)', {
									removed: items.length - filtered.length,
									total: items.length
								}) }}
							</div>
							<button
								v-if="filtered.length < items.length && ! show_filtered"
								class="tw-button tw-button--text tw-mg-t-05"
								@click="show_filtered = true"
							>
								<span class="ffz-i-eye tw-button__text">
									{{ t('addon.deck.show-filtered', 'Show Filtered Items') }}
								</span>
							</button>
							<button
								v-if="show_filtered"
								class="tw-button tw-button--text tw-mg-t-05"
								@click="show_filtered = false"
							>
								<span class="ffz-i-eye-off tw-button__text">
									{{ t('addon.deck.hide-filtered', 'Hide Filtered Items') }}
								</span>
							</button>
						</div>
						<div v-else-if="errored" class="bd--width">
							<div class="tw-mg-b-1">
								{{ t('addon.deck.error', 'An error occured while loading more data.') }}
							</div>
							<div class="tw-mg-b-1">
								<button
									class="tw-button tw-button--text"
									@click="refresh"
								>
									<span class="ffz-i-arrows-cw tw-button__text">
										{{ t('addon.deck.refresh', 'Refresh') }}
									</span>
								</button>
							</div>
							<button
								v-if="! show_error"
								class="tw-button tw-button--text"
								@click="show_error = true"
							>
								<span class="ffz-i-eye tw-button__text">
									{{ t('addon.deck.show-error', 'Show Details') }}
								</span>
							</button>
							<div
								v-else
								class="bd--error-log tw-mg-x-05 tw-pd-05 tw-border-radius-medium tw-c-background-alt-2 tw-border"
							>{{ error && error.stack }}</div>
						</div>
						<div v-else-if="too_throttled" class="bd--width">
							<div class="tw-mg-b-1">
								{{ t('addon.deck.too-much-loading', 'This column has stopped loading because it\'s been loading a lot, and we want to make sure nothing\'s wrong.') }}
							</div>
							<div class="tw-mg-b-1">
								<button
									class="tw-button tw-button--text"
									@click="btnLoadMore"
								>
									<span class="ffz-i-plus tw-button__text">
										{{ t('addon.deck.load-more', 'Load More') }}
									</span>
								</button>
							</div>
						</div>
					</template>
					<template v-else>
						<div class="tw-mg-l-1 bd--width tw-align-center">
							<h1 class="ffz-i-zreknarf loading" />
							<div v-if="loading">{{ t('addon.deck.loading', 'Loading...') }}</div>
							<div v-else-if="throttled">{{ t('addon.deck.throttled', 'Waiting a bit...') }}</div>
							<div v-else>{{ t('addon.deck.no-state', '(what am i doing)') }}</div>
						</div>
					</template>
				</div>
			</simplebar>
		</div>
	</div>
</template>

<script>
import { cleanTooltips, getTheme } from '../data';
const {maybeLoad} = FrankerFaceZ.utilities.fontAwesome;
const {print_duration} = FrankerFaceZ.utilities.time;
const {has, deep_copy} = FrankerFaceZ.utilities.object;
const {Color} = FrankerFaceZ.utilities.color;

export default {
	props: ['data', 'type', 'settings', 'collapsed', 'forSidebar', 'vertical', 'getFFZ'],

	data() {
		return {
			// The instance in charge of this column's behavior.
			inst: null,
			loader: 0,

			// Used to determine when enough time has passed to let us refresh
			// our data without having changed anything.
			first_load: 0,
			now: 0,

			// Visibility
			is_collapsed: this.collapsed,
			visible: false,
			at_top: true,
			at_end: false,

			// Loading State
			items: [],
			size: 10,
			cursor: null,
			finished: false,
			pending_reset: false,
			want_refresh: false,
			throttled: false,
			throttle_count: 0,
			too_throttled: false,
			loading: false,

			show_filtered: false,

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

		columns() {
			if ( has(this.data.display, 'columns') )
				return this.data.display.columns;

			if ( this.inst && this.inst.getColumns ) {
				this.loader;
				return this.inst.getColumns();
			}

			return 1;
		},

		widthClass() {
			if ( this.width === 0 )
				return 'bd-narrow';
			else if ( this.width === 2 )
				return 'bd-wide';

			return null;
		},

		width() {
			if ( has(this.data.display, 'width') )
				return this.data.display.width;

			if ( this.inst && this.inst.getWidth ) {
				this.loader;
				return this.inst.getWidth();
			}

			return 1;
		},

		hasArt() {
			if ( this.data.display.no_art )
				return false;

			this.loader;
			return ! this.is_collapsed && this.inst && this.inst.hasArt();
		},

		icon() {
			const icon = this.data.display.icon;
			if ( icon && icon.length )
				return icon;

			if ( this.inst && this.inst.getIcon ) {
				this.loader;
				return this.inst.getIcon();
			}

			return null;
		},

		avatar() {
			this.loader;
			return this.inst && this.inst.getLogo();
		},

		cover() {
			this.loader;
			return this.inst && this.inst.getCoverImage();
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

		visible_items() {
			if ( this.show_filtered )
				return this.items;
			return this.filtered;
		},

		filtered() {
			this.loader;
			if ( this.inst && this.inst.filterItems )
				return this.inst.filterItems(this.items);

			return this.items;
		},

		unfiltered() {
			if ( this.items.length === this.filtered.length )
				return [];

			return this.items.filter(item => ! this.filtered.includes(item));
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
			const value = this.data.display.refresh;
			if ( value == null || value < 0 )
				return null;

			const base = this.inst && this.inst.getRefreshDelay(),
				multiplier = this.inst && this.inst.getRefreshMultiplier();

			return base + (value * multiplier);
		},

		ttRefresh() {
			if ( this.is_collapsed || ! this.first_load || this.loading || ! this.canRun )
				return null;

			const value = this.autoRefreshDelay;
			if ( ! value || value < 0 )
				return null;

			return (this.first_load + this.autoRefreshDelay) - this.now;
		},

		progressTip() {
			let value = this.ttRefresh;
			if ( ! value || value < 0 )
				value = 0;

			return print_duration(Math.floor(value / 1000));
		},

		progressWidth() {
			const ttl = this.ttRefresh;
			if ( ! ttl )
				return null;

			if ( ttl <= 0 )
				return 0;

			const value = this.autoRefreshDelay;
			const frac = ttl / value;
			return (frac - (1 / value) * (1 - frac)) * 100;
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

		canScrollTop() {
			return this.visible && ! this.at_top;
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
		collapsed(val) {
			this.is_collapsed = val;
		},

		data: {
			handler() {
				if ( this.inst )
					this.inst.updateSettings(deep_copy(this.data.settings));

				this.refreshFromInst();
			},

			deep: true
		},

		activeSettings: {
			handler() {
				if ( this.inst )
					this.inst.updateGlobalSettings(deep_copy(this.activeSettings));

				this.refreshFromInst();
			},

			deep: true
		},

		icon() {
			maybeLoad(this.icon)
		},

		canRefresh() {
			this.$emit('can-refresh', this.canRefresh);
		},

		shouldRefresh() {
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

		// Height Calculations
		this._resize_listener = this.scheduleUpdateHeight.bind(this);
		window.addEventListener('resize', this._resize_listener);

		this.$emit('init', this);

	},

	beforeDestroy() {
		clearInterval(this._timer);
		clearTimeout(this._maybe_timer);
		window.removeEventListener('resize', this._resize_listener);
	},

	mounted() {
		if ( this.inst && this.inst.useIcon() )
			maybeLoad(this.icon);

		this.updateHeight();
	},

	updated() {
		this.updateHeight();
	},

	methods: {
		onStreamChange(type, id) {
			if ( this.inst && this.inst.onStreamChange )
				this.inst.onStreamChange(type, id);
		},

		// Visibility
		doubleClick(event) {
			if ( event.target.closest('button') )
				return;

			this.toggle();
			cleanTooltips();
		},

		toggle() {
			this.is_collapsed = ! this.is_collapsed;
			if ( ! this.is_collapsed && this.canRefresh )
				this.refresh();

			this.$emit('collapse', this.is_collapsed);
		},

		onVisibilityChange(visible) {
			this.visible = visible;
		},

		onTopChange(visible) {
			this.at_top = visible;
		},

		onBottomChange(visible) {
			this.at_end = visible;
			if ( visible )
				this.maybeLoadMore();
		},


		// Scrolling and Height
		scrollToTop() {
			const scroller = this.$refs.scroller,
				target = scroller.querySelector('.simplebar-scroll-content');

			if ( target ) {
				target.scrollTo(0,0);
				this.at_top = true;
			}
		},

		scheduleUpdateHeight() {
			if ( this._scheduled_height )
				return;

			this._scheduled_height = requestAnimationFrame(() => this.updateHeight());
		},

		updateHeight() {
			if ( this._scheduled_height ) {
				cancelAnimationFrame(this._scheduled_height);
				this._scheduled_height = null;
			}

			const root = this.$refs.root,
				header = this.$refs.header,
				scroller = this.$refs.scroller;
			if ( ! root || ! scroller )
				return;

			const height = root.clientHeight - (header ? header.clientHeight : 0),
				width = root.clientWidth;

			if ( height === this.old_height && width === this.old_width )
				return;

			this.old_height = height;
			this.old_width = width;

			scroller.style.height = Math.max(0, height) + 'px';

			if ( this.vertical ) {
				let item_width = 320;
				if ( this.width === 2 )
					item_width = 400;
				else if ( this.width === 0 )
					item_width = 200;

				item_width += 10;

				this.size = this.columns * Math.max(1, Math.floor(width / item_width));

			} else
				this.size = this.columns * Math.max(1, Math.ceil(height / 220));

			// Sanity limits.
			if ( this.size < 50 )
				this.size = 50;
			else if ( this.size > 200 )
				this.size = 200;
		},


		// ColumnBase Interactions
		saveCache(cache) {
			this.$emit('cache', cache);
		},

		invalidateData() {
			this.resetData();
			this.maybeLoadMore();
		},

		getComponent(item) {
			return this.inst ? this.inst.getComponent(item) : null;
		},


		// Settings

		openMenu() {
			const data = deep_copy(this.data),
				display = data.display = data.display || {};

			if ( ! has(display, 'icon') )
				display.icon = this.icon;

			if ( ! has(display, 'width') )
				display.width = this.width;

			if ( ! has(display, 'default_count') )
				display.default_count = this.forSidebar ? 5 : 10;

			if ( ! has(display, 'columns') )
				display.columns = this.columns;

			this.$emit('open-modal', {
				modal: 'bd-column-editor',
				data: {
					sidebar: this.forSidebar,
					column: data,
					inst: this.inst,
					settings: this.activeSettings,
					remove: () => this.$emit('delete'),
					save: data => this.$emit('save', data)
				}
			});
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

				this.show_filtered = false;
				this.errored = false;
				this.show_error = false;
				this.error = null;

				this.refreshFromInst();
			}
		},

		refresh() {
			this.resetData();
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
			if ( this.at_end && ! this.loading && ! this.errored && ! this.finished && this.canRun )
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
				const data = await this.inst.load(this.size * (this.first_load ? 2 : 1), this.cursor, this.want_refresh);

				if ( ! this.pending_reset ) {
					this.items = this.items.concat(data.items);
					if ( this.inst.shouldClientSort() )
						this.items = this.inst.performClientSort(this.items);

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

			if ( ! this.finished && ! this.errored )
				this.maybeLoadMore();
		}
	}
}

</script>