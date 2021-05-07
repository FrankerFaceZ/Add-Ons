import {getLoader, VideoTypes} from './data';

const {get, make_enum, deep_equals} = FrankerFaceZ.utilities.object;


export default class ColumnBase {
	constructor(vue, settings, global_settings, cache) {
		this.vue = vue;
		this.settings = settings;
		this.global_settings = global_settings;
		this.cache = cache || {};

		this.updateTags();
		this.updateLanguages();
		this.updateSort();
		this.reset();
	}

	destroy() {
		this.vue = null;
		this.settings = null;
		this.global_settings = null;
		this.cache = null;
	}

	// ========================================================================
	// Data Validation
	// ========================================================================

	updateLanguages() {
		const set = new Set;
		if ( this.settings && this.settings.lang )
			for(const lang of this.settings.lang)
				set.add(lang.toUpperCase());

		if ( this.global_settings && this.global_settings.lang )
			for(const lang of this.global_settings.lang)
				set.add(lang.toUpperCase());

		this.languages = set.size > 0 ? [...set] : null;
	}

	updateTags() {
		const set = new Set;
		if ( this.settings && this.settings.tags )
			for(const tag of this.settings.tags)
				set.add(tag);

		if ( this.global_settings && this.global_settings.tags )
			for(const tag of this.global_settings.tags)
				set.add(tag);

		this.required_tags = set.size > 0 ? [...set] : null;
	}

	updateSort() {
		const options = this.getSortOptions();
		this.sort = options && this.settings && options[this.settings.sort] || null;
	}

	shouldClientSort() {
		return false;
	}

	performClientSort(items) { // eslint-disable-line
		throw new Error('Not Implemented');
	}

	/**
	 * Receive new settings for this column. Called when an existing
	 * column has its settings edited.
	 * @param {Object} settings The new settings object.
	 */
	updateSettings(settings) {
		const old_settings = this.settings;
		this.settings = settings;
		this.updateTags();
		this.updateLanguages();
		this.updateSort();

		if ( this.shouldSettingsInvalidate(settings, old_settings) )
			this.invalidate();
	}

	shouldSettingsInvalidate(new_settings, old_settings) {
		if ( new_settings )
			return ! deep_equals(new_settings, old_settings);
		else
			return ! old_settings;
	}

	/**
	 * Receive new global settings for this column. Called when the global
	 * settings or tab settings are edited.
	 * @param {Object} settings The new global settings object.
	 */
	updateGlobalSettings(settings) {
		const old_global = this.global_settings;
		this.global_settings = settings;
		this.updateTags();
		this.updateLanguages();

		if ( this.shouldGlobalSettingsInvalidate(settings, old_global) )
			this.invalidate();
	}

	shouldGlobalSettingsInvalidate(new_settings, old_settings) {
		if ( new_settings )
			return ! deep_equals(new_settings, old_settings);
		else
			return ! old_settings;
	}

	/**
	 * Mark that this column's data needs to be refreshed.
	 */
	invalidate() {
		this.vue.invalidateData();
	}

	/**
	 * Called when this column's internal state should be reset
	 * in preparation for a refresh.
	 */
	reset() {

	}


	// ========================================================================
	// Caching
	// ========================================================================

	/**
	 * Update the cached data if it differs, and save it. Only updates the keys
	 * in the provided object. Does not remove existing keys.
	 * @param {Object} data The data to save to the cache.
	 */
	updateCache(data) {
		if ( ! data || typeof data !== 'object' )
			return;

		if ( ! this.cache )
			this.cache = {};

		let updated = false;
		for(const [key, value] of Object.entries(data)) {
			if ( ! deep_equals(this.cache[key], value) ) {
				updated = true;
				this.cache[key] = value;
			}
		}

		if ( updated ) {
			this.vue.saveCache(this.cache);
			this.vue.refreshFromInst();
		}
	}

	/**
	 * Save the currently cached data, to be restored when this column
	 * is loaded from storage.
	 */
	saveCache() {
		this.vue.saveCache(this.cache);
		this.vue.refreshFromInst();
	}

	/**
	 * Set the cache and save it.
	 * @param {Object} cache The data to set the cache to.
	 */
	setCache(cache) {
		if ( ! cache )
			cache = {};

		this.cache = cache;
		this.vue.saveCache(this.cache);
		this.vue.refreshFromInst();
	}


	// ========================================================================
	// Display
	// ========================================================================

	getEditComponent() {
		return null;
	}

	getComponent(item) { // eslint-disable-line no-unused-vars
		return null;
	}

	useIcon() {
		return true;
	}

	getIcon() {
		return null;
	}

	getTitle() {
		return null;
	}

	hasArt() {
		return this.cache && this.cache.cover;
	}

	getLogo() {
		return this.cache && this.cache.avatar;
	}

	getCoverImage() {
		return this.cache && this.cache.cover;
	}

	getSubtitles() {
		const sort_sub = this.getSortSubtitle(),
			tag_sub = this.getTagSubtitle();

		if ( sort_sub && tag_sub )
			return [sort_sub, tag_sub];
		else if ( sort_sub )
			return [sort_sub];
		else if ( tag_sub )
			return [tag_sub];

		return null;
	}

	getTagSubtitle() {
		if ( ! this.settings || ! this.settings.tags || ! this.settings.tags.length )
			return null;

		const tip = [],
			loader = getLoader();
		for(const tag_id of this.settings.tags) {
			const tag = loader.getTagImmediate(tag_id, () => this.vue.refreshFromInst());
			if ( tag )
				tip.push(tag.label);
		}

		if ( tip.length === 1 )
			return {
				icon: 'ffz-i-tags',
				text: tip[0],
				tip: tip[0]
			};

		return {
			icon: 'ffz-i-tags',
			i18n: 'addon.deck.sub.tags',
			text: '{count,number} tag{count,en_plural}',
			count: this.settings.tags.length,

			tip: tip.length ? tip.join(', ') : null
		}
	}

	getSortSubtitle() {
		if ( ! this.sort )
			return null;

		if ( this.sort.subtitle )
			return {
				icon: this.sort.icon || 'ffz-i-sort-down',
				i18n: this.sort.sub_i18n,
				text: this.sort.subtitle,

				tip_i18n: this.sort.i18n,
				tip: this.sort.title
			};

		return {
			icon: this.sort.icon || 'ffz-i-sort-down',
			i18n: this.sort.i18n,
			text: this.sort.title
		};
	}

	getSortSubtitleTip() {
		if ( ! this.sort )
			return null;

		return [this.sort.i18n, this.sort.title];
	}

	getSubtitleIcon() {
		if ( ! this.sort )
			return null;

		return this.sort.icon || 'ffz-i-sort-down';
	}

	getIconicType() {
		return ColumnBase.ICONIC_TYPES.AVATAR;
	}

	showUserLine() {
		return true;
	}

	showGameLine() {
		return true;
	}

	// ========================================================================
	// Processing
	// ========================================================================

	useTags() {
		return true;
	}

	getRefreshDelay() {
		return 60000;
	}

	getSortOptions() {
		return null;
	}

	canRun() {
		return true;
	}

}

ColumnBase.ICONIC_TYPES = Object.freeze(make_enum(
	'NONE',
	'AVATAR',
	'BOXART'
));


export class LiveColumnBase extends ColumnBase {
	static memorizeTags(item) {
		const tags = item && item.stream && item.stream.tags,
			loader = getLoader();
		if ( loader && Array.isArray(tags) )
			for(const tag of tags)
				loader.memorizeTag(tag);
	}

	getComponent(item) { // eslint-disable-line no-unused-vars
		return 'bd-live-card';
	}

	memorizeTags(item) {
		LiveColumnBase.memorizeTags(item);
	}

	performClientSort(items) {
		if ( ! Array.isArray(items) )
			return [];

		const fn = this.sort?.clientSort;
		if ( ! fn )
			return items;

		return items.sort(fn)
	}

	filterItems(items) {
		if ( ! Array.isArray(items) )
			return [];

		const hide_reruns = this.global_settings.hide_reruns,
			blocked_games = this.global_settings.blocked_games;

		return items.filter(item => LiveColumnBase.filterStream(item, hide_reruns, blocked_games, this.required_tags));
	}

	static filterStream(item, hide_reruns, blocked_games, required_tags) {
		if ( ! item.stream )
			return false;

		if ( hide_reruns && item.stream.type === 'rerun' )
			return false;

		if ( blocked_games ) {
			const game = item.broadcastSettings && item.broadcastSettings.game;
			if ( game && blocked_games.includes(game.name) )
				return false;
		}

		if ( required_tags ) {
			const tags = get('stream.tags.@each.id', item) || [],
				lang = item.broadcastSettings && item.broadcastSettings.language && item.broadcastSettings.language.toLowerCase(),
				loader = getLoader();

			for(const tag_id of required_tags)
				if ( ! tags.includes(tag_id) ) {
					const tag = loader.getTagImmediate(tag_id);
					if( tag && tag.is_language && lang && lang === tag.language )
						continue;

					return false;
				}
		}

		return true;
	}
}

LiveColumnBase.SORT_OPTIONS = {
	VIEWER_COUNT: {
		title: 'Viewers (High to Low)', i18n: 'addon.deck.sort.live.viewers',
		subtitle: 'Viewers', sub_i18n: 'addon.deck.sort.sub.viewers',
		icon: 'ffz-i-sort-alt-down',
		clientSort: (a,b) => (b?.stream?.viewersCount || 0) - (a?.stream?.viewersCount || 0)
	},
	VIEWER_COUNT_ASC: {
		title: 'Viewers (Low to High)', i18n: 'addon.deck.sort.live.viewers-asc',
		subtitle: 'Viewers', sub_i18n: 'addon.deck.sort.sub.viewers',
		icon: 'ffz-i-sort-alt-up',
		clientSort: (a,b) => (a?.stream?.viewersCount || 0) - (b?.stream?.viewersCount || 0)
	},
	RECENT: {
		title: 'Recently Started', i18n: 'addon.deck.live.recent',
		subtitle: 'Recent', sub_i18n: 'addon.deck.sub.recent',
		icon: 'ffz-i-clock',
		clientSort: (a,b) => new Date(b?.stream?.createdAt || 0) - new Date(a?.stream?.createdAt || 0)
	},
	RELEVANCE: {
		title: 'Recommended for You', i18n: 'addon.deck.live.recommended',
		subtitle: 'Recommended', sub_i18n: 'addon.deck.sub.recommended',
		icon: 'ffz-i-thumbs-up'
	}
};

Object.freeze(LiveColumnBase.SORT_OPTIONS);


export class ClipColumnBase extends ColumnBase {
	useTags() {
		return false;
	}

	getComponent() {
		return 'bd-clip-card';
	}

	getSortOptions() {
		return ClipColumnBase.SORT_OPTIONS;
	}

	getPeriods() {
		return ClipColumnBase.CLIP_PERIOD;
	}

	getSubtitles() {
		const out = super.getSubtitles(),
			period = this.getPeriodSubtitle();

		if ( ! period )
			return out;
		if ( ! out )
			return [period];

		out.push(period);
		return out;
	}

	getPeriodSubtitle() {
		const options = this.getPeriods(),
			value = options && options[this.settings.period];

		if ( ! value )
			return null;

		if ( value.subtitle )
			return {
				icon: value.icon || 'ffz-i-calendar',
				i18n: value.sub_i18n,
				text: value.title,

				tip_i18n: value.i18n,
				tip: value.title
			};

		return {
			icon: value.icon || 'ffz-i-calendar',
			i18n: value.i18n,
			text: value.title
		};
	}

	filterItems(items) {
		if ( ! Array.isArray(items) )
			return [];

		const blocked_games = this.global_settings.blocked_games;

		return items.filter(item => ClipColumnBase.filterClip(item, blocked_games));
	}

	static filterClip(item, blocked_games) {
		if ( blocked_games && item.game && blocked_games.includes(item.game.name) )
			return false;

		return true;
	}
}

ClipColumnBase.SORT_OPTIONS = {
	CREATED_AT_ASC: {
		title: 'Recently Created', i18n: 'addon.deck.sort.clip.created-asc',
		subtitle: 'Recent', sub_i18n: 'addon.deck.sub.recent',
		icon: 'ffz-i-clock'
	},
	CREATED_AT_DESC: {
		title: 'Oldest First', i18n: 'addon.deck.sort.clip.created-desc',
		subtitle: 'Oldest', sub_i18n: 'addon.deck.sub.oldest',
		icon: 'ffz-i-clock'
	},
	VIEWS_ASC: {
		title: 'Views (Low to High)', i18n: 'addon.deck.sort.clip.views-asc',
		subtitle: 'Views', sub_i18n: 'addon.deck.sub.views',
		icon: 'ffz-i-sort-alt-up'
	},
	VIEWS_DESC: {
		title: 'Views (High to Low)', i18n: 'addon.deck.sort.clip.views-desc',
		subtitle: 'Views', sub_i18n: 'addon.deck.sub.views',
		icon: 'ffz-i-sort-alt-down'
	},
	TRENDING: {
		title: 'Trending', i18n: 'addon.deck.sort.trending',
		icon: 'ffz-i-thumbs-up'
	}
};

Object.freeze(ClipColumnBase.SORT_OPTIONS);

ClipColumnBase.CLIP_PERIOD = {
	/*TRENDING: {
		title: 'Trending', i18n: 'addon.deck.sort.trending',
		icon: 'ffz-i-thumbs-up'
	},*/
	LAST_DAY: {
		title: '24 Hours', i18n: 'addon.deck.clip-period.24-hours',
		subtitle: '24h', sub_i18n: 'addon.deck.clip-period.24h',
		icon: 'ffz-i-calendar'
	},
	LAST_WEEK: {
		title: '7 Days', i18n: 'addon.deck.clip-period.7-days',
		subtitle: '7d', sub_i18n: 'addon.deck.clip-period.7d',
		icon: 'ffz-i-calendar'
	},
	LAST_MONTH: {
		title: '30 Days', i18n: 'addon.deck.clip-period.30-days',
		subtitle: '30d', sub_i18n: 'addon.deck.clip-period.30d',
		icon: 'ffz-i-calendar'
	},
	ALL_TIME: {
		title: 'All TIme', i18n: 'addon.deck.clip-period.all-time',
		subtitle: 'All', sub_i18n: 'addon.deck.clip-period.all',
		icon: 'ffz-i-calendar'
	}
};

Object.freeze(ClipColumnBase.CLIP_PERIOD);


export class VideoColumnBase extends ColumnBase {

	static memorizeTags(item) {
		const tags = item && item.contentTags,
			loader = getLoader();
		if ( loader && Array.isArray(tags) )
			for(const tag of tags)
				loader.memorizeTag(tag);
	}

	constructor(...args) {
		super(...args);

		this.updateTypes();
	}

	updateSettings(settings) {
		super.updateSettings(settings);

		this.updateTypes();
	}

	updateTypes() {
		const types = this.settings && this.settings.types;
		if ( ! Array.isArray(types) || ! types.length ) {
			this.types = null;
			return;
		}

		const out = this.types = [];
		for(const type of Object.keys(VideoTypes)) {
			if ( ! types.includes(type) )
				out.push(type);
		}
	}

	canRun() {
		return ! this.types || this.types.length;
	}

	getComponent(item) { // eslint-disable-line no-unused-vars
		return 'bd-video-card'
	}

	memorizeTags(item) {
		VideoColumnBase.memorizeTags(item);
	}

	filterItems(items) {
		if ( ! Array.isArray(items) )
			return [];

		const no_recordings = this.settings.no_recordings || this.no_recordings,
			types = this.types,
			blocked_games = this.global_settings.blocked_games;

		return items.filter(item => VideoColumnBase.filterVideo(item, no_recordings, types, blocked_games, this.required_tags));
	}

	static filterVideo(item, no_recordings, types, blocked_games, required_tags) {
		if ( no_recordings && item.status === 'RECORDING' )
			return false;

		if ( types && item.broadcastType && ! types.includes(item.broadcastType) )
			return false;

		if ( blocked_games && item.game && blocked_games.includes(item.game.name) )
			return false;

		if ( required_tags ) {
			const tags = get('contentTags.@each.id', item) || [],
				lang = item.language && item.language.toLowerCase(),
				loader = getLoader();

			for(const tag_id of required_tags)
				if ( ! tags.includes(tag_id) ) {
					const tag = loader.getTagImmediate(tag_id);
					if ( tag && tag.is_language && lang && lang === tag.language )
						continue;

					return false;
				}
		}

		return true;
	}
}

VideoColumnBase.SORT_OPTIONS = {
	TIME: {
		title: 'Recently Published', i18n: 'addon.deck.sort.video.recent',
		subtitle: 'Recent', sub_i18n: 'addon.deck.sub.recent',
		icon: 'ffz-i-clock'
	},
	VIEWS: {
		title: 'Views (High to Low)', i18n: 'addon.deck.sort.video.views',
		subtitle: 'Views', sub_i18n: 'addon.deck.sort.sub.views',
		icon: 'ffz-i-sort-alt-down'
	}
};

Object.freeze(VideoColumnBase.SORT_OPTIONS);