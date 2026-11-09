// Pure emote matching for the settings editor. Mirrors FFZ's tab-completion rules
// (doesEmoteMatchTerm / sortEmotes in FFZ's chat input module) without FFZ deps.

export const MATCH = {
	NONE: 0,
	ANY: 1,
	NON_PREFIX: 2,
	CASE_INSENSITIVE_PREFIX: 3,
	EXACT_PREFIX: 4
};

const locale = new Intl.Collator(),
	localeCaseInsensitive = new Intl.Collator(undefined, { sensitivity: 'accent' });

export function emoteMatchType(name, term) {
	if ( ! name || ! term )
		return MATCH.NONE;

	if ( name.startsWith(term) )
		return MATCH.EXACT_PREFIX;

	const name_lower = name.toLowerCase(),
		term_lower = term.toLowerCase();

	if ( name_lower.startsWith(term_lower) )
		return MATCH.CASE_INSENSITIVE_PREFIX;

	const idx = name.indexOf(term.charAt(0).toUpperCase());
	if ( idx !== -1 && name_lower.slice(idx + 1).startsWith(term_lower.slice(1)) )
		return MATCH.NON_PREFIX;

	if ( name_lower.includes(term_lower) )
		return MATCH.ANY;

	return MATCH.NONE;
}

// entries: [{token, srcSet, source, favorite}]. Options mirror FFZ settings:
// matching = chat.tab-complete.matching (1-3), limit = 25 when limit-results is on.
export function findEmotes(entries, term, {
	matching = 1,
	limit = null,
	preferFavorites = false,
	prioritizePrefix = false
} = {}) {
	if ( ! term )
		return [];

	const results = [];
	for(const entry of entries) {
		const match_type = emoteMatchType(entry.token, term);
		if ( match_type !== MATCH.NONE && match_type >= matching )
			results.push({ ...entry, match_type });
	}

	results.sort((a, b) => {
		if ( preferFavorites && (!! a.favorite !== !! b.favorite) )
			return a.favorite ? -1 : 1;

		if ( ! prioritizePrefix )
			return 0;

		for(const type of [MATCH.EXACT_PREFIX, MATCH.CASE_INSENSITIVE_PREFIX]) {
			const a_is = a.match_type === type,
				b_is = b.match_type === type;

			if ( a_is && b_is )
				return (type === MATCH.EXACT_PREFIX ? locale : localeCaseInsensitive).compare(a.token, b.token);
			if ( a_is )
				return -1;
			if ( b_is )
				return 1;
		}

		return locale.compare(a.token, b.token);
	});

	return limit ? results.slice(0, limit) : results;
}

// Merge FFZ tab-completion caches ({emotes: [...]}) in priority order.
export function buildEmoteIndex(caches) {
	const entries = [],
		lookup = new Map;

	for(const cache of caches)
		for(const emote of cache?.emotes ?? []) {
			if ( ! emote?.token || ! emote.srcSet || lookup.has(emote.token) )
				continue;

			lookup.set(emote.token, emote.srcSet);
			entries.push({
				token: emote.token,
				srcSet: emote.srcSet,
				source: emote.source,
				extra: emote.extra,
				favorite: !! emote.favorite
			});
		}

	return { entries, lookup };
}

// The emote search term at the caret, or null. `:term` needs 2+ characters; a bare
// word only counts when no-colon tab completion is on and Tab was pressed.
export function emoteQuery(value, caret, { withoutColon = false, pressedTab = false } = {}) {
	const word = /\S+$/.exec(value.slice(0, caret));
	if ( ! word )
		return null;

	if ( word[0].startsWith(':') )
		return word[0].length >= 3 ? { start: word.index, term: word[0].slice(1) } : null;

	if ( withoutColon && pressedTab && word[0].length >= 2 )
		return { start: word.index, term: word[0] };

	return null;
}

// Label for an emote's origin, following FFZ's chat.tab-complete.show-source
// setting: 0 = none, 1 = short provider name, 2 = channel / set name.
export function sourceLabel(entry, mode) {
	if ( ! mode )
		return null;

	const source = entry?.source,
		short = typeof source === 'string' && source.startsWith('twitch')
			? 'Twitch'
			: source === 'ffz' ? 'FFZ' : (source || null);

	return mode === 2 ? (entry?.extra || short) : short;
}
