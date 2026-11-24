// Shared settings, timing, and copy. The folder name is the add-on id.

export const SETTINGS_PAGE = 'Add-Ons > Recent Messages >> Behaviour';

export const KEYS = {
	limit: 'addon.recent-messages.load_limit',
	api: 'addon.recent-messages.api_base',
	rmOnly: 'addon.recent-messages.rm_only',
	maxAge: 'addon.recent-messages.max_age'
};

export const DEFAULT_API = 'https://logs.zonian.dev/rm';
export const SCROLLBACK_SETTING = 'chat.scrollback-length';
export const SCROLLBACK_FALLBACK = 150;

export const DIVIDER_STYLE_ID = 'ffz-msg-history-divider-style';
export const DIVIDER_CSS = '.ffz-msg-history-divider{color:var(--color-text-live)!important;line-height:var(--line-height-body)!important}';

export const TIMING = {
	bufferMs: 20000,
	emptyMs: 8000,
	pollMs: 100,
	burstMs: 700,
	burstTries: 3,
	burstGap: 8
};

// Twitch's named /color presets. Assigned from the first and last character
// of the login when the user has never picked a colour. Not exported by Twitch.
export const COLOURS = [
	'#FF0000', '#0000FF', '#008000', '#B22222', '#FF7F50',
	'#9ACD32', '#FF4500', '#2E8B57', '#DAA520', '#D2691E',
	'#5F9EA0', '#1E90FF', '#FF69B4', '#8A2BE2', '#00FF7F'
];

export const COPY = {
	gap: 'Older log messages above, recent messages below.',
	history: 'Chat history ends here.',
	label: 'History',
	title: 'Chat history ends here. Messages above were loaded from logs.'
};
