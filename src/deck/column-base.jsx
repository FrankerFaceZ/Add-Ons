import {getLoader, Languages, VideoTypes} from './data';

const {get, make_enum, deep_equals} = FrankerFaceZ.utilities.object;
const {createElement} = FrankerFaceZ.utilities.dom;


export default class ColumnBase {
	constructor(vue, settings, global_settings, cache) {
		this.vue = vue;
		this.settings = settings;
		this.global_settings = global_settings;
		this.cache = cache || {};

		this.updateTags();
		this.updateFilters();
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

	updateFilters() {
		this.filter_games = this.settings?.filter_games?.length ?
			[...this.settings.filter_games] : null;

		this.filter_blocked_games = this.settings?.filter_blocked_games?.length ?
			[...this.settings.filter_blocked_games] : null;
	}

	updateTags() {
		const set = new Set;
		const blocked = new Set;

		if ( this.settings && this.settings.tags )
			for(const tag of this.settings.tags)
				set.add(tag.toLowerCase());

		if ( this.settings && this.settings.blocked_tags )
			for(const tag of this.settings.blocked_tags)
				blocked.add(tag.toLowerCase());

		if ( this.global_settings && this.global_settings.tags )
			for(const tag of this.global_settings.tags)
				set.add(tag.toLowerCase());

		if ( this.global_settings && this.global_settings.blocked_tags )
			for(const tag of this.global_settings.blocked_tags)
				blocked.add(tag.toLowerCase());

		this.required_tags = set.size > 0 ? [...set] : null;
		this.blocked_tags = blocked.size > 0 ? [...blocked] : null;
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
		this.updateFilters();
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
		this.updateFilters();
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

	getShelfComponent(item) { // eslint-disable-line no-unused-vars
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
			lang_sub = this.getLangSubtitle(),
			tag_sub = this.getTagSubtitle(),
			cat_sub = this.getCatSubtitle();

		if ( ! sort_sub && ! lang_sub && ! tag_sub && ! cat_sub )
			return null;

		const out = [];
		if ( sort_sub )
			out.push(sort_sub);
		if ( lang_sub )
			out.push(lang_sub);
		if ( tag_sub )
			out.push(tag_sub);
		if ( cat_sub )
			out.push(cat_sub);

		return out;
	}

	getCatSubtitle() {
		if ( ! this.settings )
			return null;

		const cat_count = this.settings.filter_games?.length || 0;
		const blocked_count = this.settings.filter_blocked_games?.length || 0;

		if ( cat_count === 0 && blocked_count === 0 )
			return null;

		return {
			icon: 'ffz-i-tag',
			i18n: 'addon.deck.sub.categories',
			text: '{count, plural, one {{joined} category} other {{joined} categories}}',
			count: cat_count + blocked_count,
			joined: blocked_count > 0 ? `${cat_count}-${blocked_count}` : cat_count
		};
	}

	getLangSubtitle() {
		if ( ! this.settings )
			return null;

		const langs = this.settings.lang ?? [];
		if ( ! langs.length )
			return null;

		const tip = [];

		for(const lang of langs)
			tip.push(Languages[lang] ?? lang);

		if ( tip.length === 1 )
			return {
				icon: 'ffz-i-language',
				text: tip[0],
				tip: tip[0]
			};

		return {
			icon: 'ffz-i-language',
			i18n: 'addon.deck.sub.lang',
			text: '{count, plural, one {{count} language} other {{count} languages}}',
			count: tip.length,
			tip: tip.join(', ')
		}
	}

	getTagSubtitle() {
		if ( ! this.settings )
			return null;

		const tag_count = this.settings.tags?.length || 0;
		const blocked_count = this.settings.blocked_tags?.length || 0;

		if ( tag_count === 0 && blocked_count === 0 )
			return null;

		const tip = [];

		if (tag_count > 0)
			for(const tag of this.settings.tags) {
				if ( tag )
					tip.push(tag);
			}

		if (blocked_count > 0)
			for(const tag of this.settings.blocked_tags) {
				if ( tag )
					tip.push(`-${tag.label}`);
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
			text: '{count, plural, one {{joined} tag} other {{joined} tags}}',
			count: tag_count + blocked_count,
			joined: blocked_count > 0 ? `${tag_count}-${blocked_count}` : tag_count,

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

	allowFilterCategories() {
		return false;
	}

	allowHideUnlisted() {
		return false;
	}

	useHypeTrains() {
		return false;
	}

	useTags() {
		return true;
	}

	getRefreshDelay() {
		return 60000;
	}

	getRefreshMultiplier() {
		return 30000;
	}

	getSortOptions() {
		return null;
	}

	canRun() {
		return true;
	}

	onStreamChange(type, id) { // eslint-disable-line no-unused-vars
		/* no-op */
	}
}

ColumnBase.ICONIC_TYPES = Object.freeze(make_enum(
	'NONE',
	'AVATAR',
	'BOXART'
));


export class LiveColumnBase extends ColumnBase {

	onStreamChange(type, id) {
		super.onStreamChange(type, id);

		if ( type === 'stream_down' && id )
			this.vue.items = this.vue.items.filter(item => item.id != id);
	}

	allowHideUnlisted() {
		return true;
	}

	useHypeTrains() {
		return true;
	}

	getComponent(item) { // eslint-disable-line no-unused-vars
		return 'bd-live-card';
	}

	getShelfComponent(item) { // eslint-disable-line no-unused-vars
		return 'bd-live-shelf-card';
	}

	performClientSort(items, sort) {
		if ( ! Array.isArray(items) )
			return [];

		const fn = (sort ?? this.sort)?.clientSort;
		if ( ! fn )
			return items;

		return items.sort(fn)
	}

	filterItems(items) {
		if ( ! Array.isArray(items) )
			return [];

		const hide_reruns = this.global_settings.hide_reruns,
			blocked_games = this.global_settings.blocked_games;

		return items.filter(item => LiveColumnBase.filterStream(
			item,
			hide_reruns,
			blocked_games,
			this.required_tags,
			this.blocked_tags,
			this.filter_games,
			this.filter_blocked_games,
			this.languages,
			this.allowHideUnlisted() ? this.settings.hide_unlisted : false,
			this.global_settings.blocked_titles,
			this.global_settings.blocked_flags,
			this.global_settings.blocked_users,
			this.settings.show_offline
		));
	}

	static filterStream(item, hide_reruns, blocked_games, required_tags, blocked_tags, filter_games, filter_blocked_games, languages, hide_unlisted, blocked_titles, blocked_flags, blocked_users, show_offline) {
		const game = item.broadcastSettings && item.broadcastSettings.game;
		if ( blocked_games && game && blocked_games.includes(game.name) )
			return false;

		if ( ! game?.name && hide_unlisted )
			return false;

		if ( filter_games && game && ! filter_games.includes(game.id) )
			return false;

		if ( filter_blocked_games && game && filter_blocked_games.includes(game.id) )
			return false;

		if ( languages && languages.length ) {
			const lang = item.broadcastSettings?.language;
			if ( lang && ! languages.includes(lang) )
				return false;
		}

		if ( blocked_users ) {
			if (blocked_users[0])
				blocked_users[0].lastIndex = -1;
			if (blocked_users[1])
				blocked_users[1].lastIndex = -1;

			if (( blocked_users[0] && blocked_users[0].test(item.login) ) ||
				( blocked_users[1] && blocked_users[1].test(item.login) )
			)
				return false;
		}

		if ( item.broadcastSettings?.title && blocked_titles ) {
			if (blocked_titles[0])
				blocked_titles[0].lastIndex = -1;
			if (blocked_titles[1])
				blocked_titles[1].lastIndex = -1;

			if (( blocked_titles[0] && blocked_titles[0].test(item.broadcastSettings.title) ) ||
				( blocked_titles[1] && blocked_titles[1].test(item.broadcastSettings.title) )
			)
				return false;
		}

		if ( ! item?.stream )
			return show_offline;

		if ( hide_reruns && item.stream.type === 'rerun' )
			return false;

		if ( required_tags || blocked_tags ) {
			const tags = get('stream.freeformTags', item).map(name => name && name.toLowerCase()) || [];
				//lang = item.broadcastSettings && item.broadcastSettings.language && item.broadcastSettings.language.toLowerCase();

			if ( required_tags )
				for(const tag of required_tags)
					if ( ! tags.includes(tag) )
						return false;

			if ( blocked_tags )
				for(const tag of blocked_tags)
					if ( tags.includes(tag) )
						return false;
		}

		if ( blocked_flags ) {
			const flags = get('stream.contentClassificationLabels.@each.id', item) ?? [];
			for(const flag of flags) {
				if ( blocked_flags.has(flag) )
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

	getShelfComponent(item) { // eslint-disable-line no-unused-vars
		return 'bd-clip-shelf-card';
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

		return items.filter(item => ClipColumnBase.filterClip(
			item,
			blocked_games,
			this.filter_games,
			this.filter_blocked_games,
			this.global_settings.blocked_titles,
			this.global_settings.blocked_flags,
			this.global_settings.blocked_users
		));
	}

	static filterClip(item, blocked_games, filter_games, filter_blocked_games, blocked_titles, blocked_flags, blocked_users) {
		if ( ! item )
			return false;

		if ( blocked_games && item.game && blocked_games.includes(item.game.name) )
			return false;

		if ( filter_games && item.game && ! filter_games.includes(item.game.id) )
			return false;

		if ( filter_blocked_games && item.game && filter_blocked_games.includes(item.game.id) )
			return false;

		if ( item.broadcaster?.login && blocked_users ) {
			if (blocked_users[0])
				blocked_users[0].lastIndex = -1;
			if (blocked_users[1])
				blocked_users[1].lastIndex = -1;

			if (( blocked_users[0] && blocked_users[0].test(item.broadcaster.login) ) ||
				( blocked_users[1] && blocked_users[1].test(item.broadcaster.login) )
			)
				return false;
		}

		if ( item.title && blocked_titles ) {
			if (blocked_titles[0])
				blocked_titles[0].lastIndex = -1;
			if (blocked_titles[1])
				blocked_titles[1].lastIndex = -1;

			if (( blocked_titles[0] && blocked_titles[0].test(item.title) ) ||
				( blocked_titles[1] && blocked_titles[1].test(item.title) )
			)
				return false;
		}

		if ( blocked_flags ) {
			const flags = get('contentClassificationLabels.@each.id', item) ?? [];
			for(const flag of flags) {
				if ( blocked_flags.has(flag) )
					return false;
			}
		}

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

	getShelfComponent(item) { // eslint-disable-line no-unused-vars
		return 'bd-video-shelf-card';
	}

	filterItems(items) {
		if ( ! Array.isArray(items) )
			return [];

		const no_recordings = this.settings.no_recordings || this.no_recordings,
			types = this.types,
			blocked_games = this.global_settings.blocked_games;

		return items.filter(item => VideoColumnBase.filterVideo(
			item,
			no_recordings,
			types,
			blocked_games,
			this.required_tags,
			this.blocked_tags,
			this.filter_games,
			this.filter_blocked_games,
			this.global_settings.blocked_titles,
			this.global_settings.blocked_flags,
			this.global_settings.blocked_users
		));
	}

	static filterVideo(item, no_recordings, types, blocked_games, required_tags, blocked_tags, filter_games, filter_blocked_games, blocked_titles, blocked_flags, blocked_users) {
		if ( ! item )
			return false;

		if ( no_recordings && item.status === 'RECORDING' )
			return false;

		if ( types && item.broadcastType && ! types.includes(item.broadcastType) )
			return false;

		if ( blocked_games && item.game && blocked_games.includes(item.game.name) )
			return false;

		if ( filter_games && item.game && ! filter_games.includes(item.game.id) )
			return false;

		if ( filter_blocked_games && item.game && filter_blocked_games.includes(item.game.id) )
			return false;

		if ( required_tags || blocked_tags ) {
			const tags = get('contentTags.@each.id', item).map(tag => tag && tag.toLowerCase()) || [];

			if ( required_tags )
				for(const tag of required_tags)
					if ( ! tags.includes(tag) )
						return false;

			if ( blocked_tags )
				for(const tag of blocked_tags)
					if ( tags.includes(tag) )
						return false;
		}

		if ( item.owner?.login && blocked_users ) {
			if (blocked_users[0])
				blocked_users[0].lastIndex = -1;
			if (blocked_users[1])
				blocked_users[1].lastIndex = -1;

			if (( blocked_users[0] && blocked_users[0].test(item.owner.login) ) ||
				( blocked_users[1] && blocked_users[1].test(item.owner.login) )
			)
				return false;
		}

		if ( item.title && blocked_titles ) {
			if (blocked_titles[0])
				blocked_titles[0].lastIndex = -1;
			if (blocked_titles[1])
				blocked_titles[1].lastIndex = -1;

			if (( blocked_titles[0] && blocked_titles[0].test(item.title) ) ||
				( blocked_titles[1] && blocked_titles[1].test(item.title) )
			)
				return false;
		}

		if ( blocked_flags ) {
			const flags = get('contentClassificationLabels.@each.id', item) ?? [];
			for(const flag of flags) {
				if ( blocked_flags.has(flag) )
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