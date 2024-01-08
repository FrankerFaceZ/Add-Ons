'use strict';

const { FFZWaitableEvent } = FrankerFaceZ.utilities.events;

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


export function getVideoPreviewURL(login) {
	const stuff = new URLSearchParams({
		channel: login,
		enableExtensions: false,
		parent: 'twitch.tv',
		player: 'popout',
		quality: '160p30',
		muted: true,
		controls: false,
		disable_frankerfacez: true
	});

	return `https://player.twitch.tv/?${stuff}`;
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


export function checkCosmetics(user, callback) {
	const ffz = FrankerFaceZ.get(),
		event = new FFZWaitableEvent({
			user,
			url: user.profileImageURL
		});

	ffz.emit('common:update-avatar', event);

	user.profileImageURL = event.url;

	const result = event._wait();
	if ( result )
		result.then(() => {
			user.profileImageURL = event.url;
			if ( callback )
				callback(event.url, user);
		});

	else if ( callback )
		callback(event.url, user);
	
	return event.url;
}


export function cleanTags(item) {
	if ( Array.isArray(item.freeformTags) )
		item.freeformTags = item.freeformTags.map(tag => {
			if ( typeof tag === 'string' )
				return tag;
			else if ( tag?.name )
				return tag.name;
			return undefined;
		}).filter(tag => tag);

	else if ( item.freeformTags )
		item.freeformTags = [];
}


export function reduceTags(tags, count, required) {
	if ( ! Array.isArray(tags) || ! count )
		return null;

	const out = [],
		skipped = [];

	let i = 0;

	const req_lower = required && required.map(x => x.toLowerCase());

	for(const tag of tags) {
		if ( ! tag || (req_lower && req_lower.includes(tag.toLowerCase())) ) {
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

// TODO: Determine how to populate languages at runtime.
export const Languages = {
	en: "English",
	id: "Bahasa Indonesia",
	ca: "Català",
	da: "Dansk",
	de: "Deutsch",
	es: "Español",
	fr: "Français",
	it: "Italiano",
	hu: "Magyar",
	nl: "Nederlands",
	no: "Norsk",
	pl: "Polski",
	pt: "Português",
	ro: "Română",
	sk: "Slovenčina",
	fi: "Suomi",
	sv: "Svenska",
	tl: "Tagalog",
	vi: "Tiếng Việt",
	tr: "Türkçe",
	cs: "Čeština",
	el: "Ελληνικά",
	bg: "Български",
	ru: "Русский",
	uk: "Українська",
	ar: "العربية",
	ms: "بهاس ملايو",
	hi: "मानक हिन्दी",
	th: "ภาษาไทย",
	zh: "中文",
	ja: "日本語",
	ko: "한국어",
	asl: "American Sign Language",
	other: "Other",
};

Object.freeze(Languages);