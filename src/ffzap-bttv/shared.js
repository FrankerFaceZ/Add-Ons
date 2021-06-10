const { has } = FrankerFaceZ.utilities.object;

export const PREFIX = 'addon--ffzap.betterttv';
export const ICON = 'https://cdn.betterttv.net/tags/developer.png';
export const ARBITRARY_TEST = /[^A-Z0-9]/i;

export function emoteURL(id, scale = 1, proxy = false) {
	return `${proxy ? 'https://cache.ffzap.com/' : ''}https://cdn.betterttv.net/emote/${id}/${scale}x`;
}

export function generateEmoteBlock(id, proxy = false) {
	return {
		1: emoteURL(id, 1, proxy),
		2: emoteURL(id, 2, proxy),
		4: emoteURL(id, 3, proxy)
	};
}

export function generateClickURL(id) {
	return `https://betterttv.com/emotes/${id}`;
}

export function hydrateEmote(data, user = null, modifiers = null) {
	const id = data.id,
		require_spaces = ARBITRARY_TEST.test(data.code),
		is_animated = data.imageType === 'gif';

	user = data.user ?? user;

	return {
		id,
		name: data.code,
		width: data.width ?? 28,
		height: data.height ?? 28,
		owner: user ? {
			display_name: user.displayName || user.display_name || user.name || user.login,
			name: user.name || user.login
		} : null,
		require_spaces,
		modifier: modifiers && has(modifiers, data.code),
		modifier_offset: modifiers && modifiers[data.code],
		click_url: generateClickURL(id),
		urls: generateEmoteBlock(id, is_animated),
		animated: is_animated ? generateEmoteBlock(id) : null
	};
}