'use strict';

export function getLoader() {
	const ffz = FrankerFaceZ.get();
	return ffz.resolve('site.twitch_data');
}

export function getTheme() {
	const ffz = FrankerFaceZ.get();
	return ffz.resolve('site.theme');
}

export function getLanguageCode() {
	return getLoader().languageCode;
}

export function getLocale() {
	return getLoader().locale;
}


const thing = {};

export function cleanTooltips() {
	if ( thing.frame )
		return;

	thing.frame = requestAnimationFrame(() => {
		thing.frame = null;
		const ffz = FrankerFaceZ.get();
		if ( ffz )
			ffz.emit('tooltips:cleanup');
	});
}


export function cleanViewersCount(copy, original) {
	if( copy.viewersCount !== original.viewersCount )
		copy.viewersCount = Number(original.viewersCount);
}


export function reduceTags(tags, count, required) {
	if ( ! Array.isArray(tags) || ! count )
		return null;

	const out = [],
		skipped = [];

	let i = 0;

	for(const tag of tags) {
		if ( ! tag || ! tag.id || (required && required.includes(tag.id)) ) {
			skipped.push(tag);
			continue;
		}

		out.push(tag);
		i += 1;
		if ( i >= count )
			break;
	}

	if ( out.length < count && skipped.length )
		return [...out, ...skipped.slice(0, count - out.length)];

	return out;
}


export const VideoTypes = {
	ARCHIVE: {i18n: 'addon.deck.video-type.archive', text: 'Past Broadcasts'},
	HIGHLIGHT: {i18n: 'addon.deck.video-type.highlight', text: 'Highlights'},
	UPLOAD: {i18n: 'addon.deck.video-type.upload', text: 'Uploads'},
	//PREMIERE_UPLOAD: {i18n: 'addon.deck.video-type.premiere_upload', text: 'Premiere'},
	PAST_PREMIERE: {i18n: 'addon.deck.video-type.past_premiere', text: 'Past Premieres'}
};

Object.freeze(VideoTypes);