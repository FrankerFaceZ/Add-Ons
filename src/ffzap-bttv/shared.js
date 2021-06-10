export const PREFIX = 'addon--ffzap.betterttv';
export const ICON = 'https://cdn.betterttv.net/tags/developer.png';

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