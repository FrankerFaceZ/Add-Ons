import {getContrastingShade, pushContrastToMinimum} from './contrast';

const API_URL = 'https://api.streamerly.tv/_elysia_/v1/ffz';
const SITE_URL = 'https://communityapp.stream';

const PROVIDER = 'addon.community';
const FLAIR_BADGE = 'addon-community-flair';
const FLAIR_COLORED_BADGE = 'addon-community-flair-colored';
const TEAM_BADGE = 'addon-community-team';

// FFZ's "Transparent" badge style drops every badge's fill.
const TRANSPARENT_BADGE_STYLE = 5;
// Twitch's backgrounds aren't pure black or white, so colored text aims above the usual 4.5:1.
const TEXT_CONTRAST = 6;

const SLOT_TEAM = 98;
const SLOT_FLAIR = 99;

// Badges are a fixed 1.8rem tall, so flair text has to stay well under that. Values in rem.
const FLAIR_SIZES = {
	small: {font: 0.9, padding: 0.2},
	medium: {font: 1, padding: 0.3},
	large: {font: 1.2, padding: 0.4}
};

const CHANNEL_CACHE_TIME = 1000 * 60 * 15; // 15 minutes
const USER_CACHE_TIME = 1000 * 60 * 5; // 5 minutes
const RETRY_TIME = 1000 * 60; // 1 minute
const BATCH_DELAY = 250;
const BATCH_SIZE = 100; // The most ids the API accepts per request.

// Counts what a viewer sees as one character, so an emoji is never cut in half.
const segmenter = new Intl.Segmenter();

function shorten(text, max) {
	if ( ! max )
		return text;

	const chars = Array.from(segmenter.segment(text), part => part.segment);
	return chars.length > max
		? `${chars.slice(0, max).join('').trimEnd()}…`
		: text;
}

// FFZ calls a function `content` with its own createElement, which suits both of its renderers.
// FFZ only opens a tooltip when the hovered element itself is the badge, so the
// inner span must let the mouse through to it.
function coloredText(text, color) {
	return (data, msg, createElement) => createElement('span', {style: {color, pointerEvents: 'none'}}, text);
}

function fetchJSON(url) {
	return fetch(url).then(resp => {
		if ( ! resp.ok )
			throw new Error(`HTTP ${resp.status}`);
		return resp.json();
	});
}

class Community extends Addon {
	constructor(...args) {
		super(...args);

		this.inject('chat');
		this.inject('chat.badges');

		this.channels = new Map;
		this.channel_loads = new Map;
		this.users = new Map;
		this.pending = new Map;
		this.timers = new Map;
		this.team_badges = new Set;
	}

	onEnable() {
		this.settings.add('addon.community.flairs', {
			default: true,
			ui: {
				path: 'Add-Ons > Community >> Flairs',
				sort: 0,
				title: 'Show chat flairs',
				component: 'setting-check-box'
			},
			changed: () => this.reapplyAll()
		});

		this.settings.add('addon.community.flair-colors', {
			default: true,
			ui: {
				path: 'Add-Ons > Community >> Flairs',
				sort: 1,
				title: 'Show flair colors',
				component: 'setting-check-box'
			},
			changed: () => this.reapplyAll()
		});

		this.settings.add('addon.community.flair-text', {
			default: 'short',
			ui: {
				path: 'Add-Ons > Community >> Flairs',
				sort: 2,
				title: 'Flair text',
				description: 'Some flairs have a shorter version for tight spaces. Hover one to see the full version.',
				component: 'setting-select-box',
				data: [
					{value: 'full', title: 'Full'},
					{value: 'short', title: 'Short when available'}
				]
			},
			changed: () => this.reapplyAll()
		});

		this.settings.add('addon.community.flair-size', {
			default: 'medium',
			ui: {
				path: 'Add-Ons > Community >> Flairs',
				sort: 3,
				title: 'Flair text size',
				component: 'setting-select-box',
				data: [
					{value: 'small', title: 'Small'},
					{value: 'medium', title: 'Medium'},
					{value: 'large', title: 'Large'}
				]
			},
			changed: () => this.loadFlairBadge()
		});

		this.settings.add('addon.community.flair-length', {
			default: 15,
			ui: {
				path: 'Add-Ons > Community >> Flairs',
				sort: 4,
				title: 'Maximum flair length',
				description: 'Hover a shortened flair to read all of it.',
				component: 'setting-select-box',
				data: [
					{value: 0, title: 'No limit'},
					{value: 10, title: '10 characters'},
					{value: 15, title: '15 characters'},
					{value: 20, title: '20 characters'},
					{value: 25, title: '25 characters'},
					{value: 30, title: '30 characters'}
				]
			},
			changed: () => this.reapplyAll()
		});

		this.settings.add('addon.community.teams', {
			default: true,
			ui: {
				path: 'Add-Ons > Community >> Teams',
				title: 'Show team badges',
				component: 'setting-check-box'
			},
			changed: () => this.reapplyAll()
		});

		this.loadFlairBadge();

		// Colored text is picked for the theme, and filled flairs change shape in the
		// Transparent badge style, so both settings re-draw every flair.
		this.on('settings:changed:theme.is-dark', this.reapplyAll, this);
		this.on('settings:changed:chat.badges.style', this.reapplyAll, this);

		this.chat.addTokenizer({
			type: 'community-flair',
			process: this.onMessage.bind(this)
		});

		this.emit('chat:update-lines');
	}

	onDisable() {
		this.chat.removeTokenizer('community-flair');
		this.off('settings:changed:theme.is-dark', this.reapplyAll, this);
		this.off('settings:changed:chat.badges.style', this.reapplyAll, this);

		for(const timer of this.timers.values())
			clearTimeout(timer);

		this.timers.clear();
		this.pending.clear();
		this.users.clear();
		this.channels.clear();
		this.channel_loads.clear();

		for(const room of this.chat.iterateRooms())
			for(const user of room.iterateUsers())
				user.removeAllBadges(PROVIDER);

		this.badges.removeBadge(FLAIR_BADGE, false);
		this.badges.removeBadge(FLAIR_COLORED_BADGE, false);
		for(const badge_id of this.team_badges)
			this.badges.removeBadge(badge_id, false);
		this.team_badges.clear();
		this.badges.buildBadgeCSS();

		this.emit('chat:update-lines');
	}

	onMessage(tokens, msg) {
		const user = msg?.user,
			login = user?.login,
			// Shared Chat: FFZ reads badges from the room the message came from.
			streamer_id = msg?.sourceRoomID ?? msg?.roomID,
			room_login = msg?.sourceRoomID ? null : msg?.roomLogin;

		if ( ! login || ! user.id || ! streamer_id )
			return tokens;

		const now = Date.now(),
			channel = this.channels.get(streamer_id);

		if ( channel && ! channel.has_badges && now < channel.expires )
			return tokens;

		const cache = this.users.get(`${streamer_id}-${user.id}`);
		if ( cache?.loading )
			return tokens;

		if ( cache && now < cache.expires ) {
			// FFZ destroys a room's users a few seconds after you leave a channel,
			// so a cached result may need applying again to the new room's user.
			if ( cache.value ) {
				const room_user = this.chat.getRoom(streamer_id, room_login, true)?.getUser(user.id, login);
				if ( room_user && this.isMissingBadges(streamer_id, room_user, cache.value) )
					queueMicrotask(() => this.enabled && this.apply(streamer_id, room_user, cache.value));
			}

			return tokens;
		}

		this.queue(streamer_id, room_login, user.id, login);
		return tokens;
	}

	queue(streamer_id, room_login, user_id, login) {
		let batch = this.pending.get(streamer_id);
		if ( ! batch ) {
			batch = {room_login, users: new Map};
			this.pending.set(streamer_id, batch);
			this.timers.set(streamer_id, setTimeout(() => this.flush(streamer_id), BATCH_DELAY));
		}

		batch.users.set(user_id, login);
		if ( batch.users.size >= BATCH_SIZE )
			this.flush(streamer_id);
	}

	async flush(streamer_id) {
		clearTimeout(this.timers.get(streamer_id));
		this.timers.delete(streamer_id);

		const batch = this.pending.get(streamer_id);
		if ( ! batch )
			return;

		this.pending.delete(streamer_id);

		// Mark the batch as loading so a fast chatter isn't looked up twice.
		for(const user_id of batch.users.keys()) {
			const key = `${streamer_id}-${user_id}`;
			this.users.set(key, {loading: true, value: this.users.get(key)?.value ?? null});
		}

		const channel = await this.getChannel(streamer_id);
		if ( ! this.enabled )
			return;

		let data = {};
		if ( channel.failed )
			data = null;

		else if ( channel.has_badges )
			try {
				data = await fetchJSON(`${API_URL}/user?streamer=${streamer_id}&users=${[...batch.users.keys()].join(',')}`);
			} catch(err) {
				data = null;
			}

		if ( ! this.enabled )
			return;

		const now = Date.now();

		// A failed request says nothing about who has a flair. Keep every badge
		// as it is and try these users again soon.
		if ( ! data ) {
			for(const user_id of batch.users.keys()) {
				const key = `${streamer_id}-${user_id}`;
				this.users.set(key, {value: this.users.get(key)?.value ?? null, expires: now + RETRY_TIME});
			}
			return;
		}

		const room = this.chat.getRoom(streamer_id, batch.room_login, true);
		let unknown_team = false;

		for(const [user_id, login] of batch.users) {
			const entry = data[user_id],
				value = entry && (entry.flair || entry.team_id)
					? {
						flair: entry.flair || null,
						flair_short: entry.flair_short ?? null,
						flair_color: entry.flair_color ?? null,
						flair_style: entry.flair_style ?? 'fill',
						team_id: entry.team_id ?? null
					}
					: null;

			if ( value?.team_id && ! channel.teams.has(value.team_id) )
				unknown_team = true;

			this.users.set(`${streamer_id}-${user_id}`, {value, expires: now + USER_CACHE_TIME});

			const room_user = room?.getUser(user_id, login);
			if ( room_user )
				this.apply(streamer_id, room_user, value);
		}

		// A team created since this channel was loaded has no badge definition yet.
		if ( unknown_team && now - channel.loaded > RETRY_TIME ) {
			await (this.channel_loads.get(streamer_id) ?? this.loadChannel(streamer_id));
			if ( this.enabled )
				this.reapplyRoom(streamer_id);
		}
	}

	getChannel(streamer_id) {
		const channel = this.channels.get(streamer_id);
		if ( channel && Date.now() < channel.expires )
			return channel;

		return this.channel_loads.get(streamer_id) ?? this.loadChannel(streamer_id);
	}

	loadChannel(streamer_id) {
		const load = fetchJSON(`${API_URL}/streamer?streamer=${streamer_id}`)
			.then(data => data, () => null)
			.then(data => {
				this.channel_loads.delete(streamer_id);

				const previous = this.channels.get(streamer_id),
					now = Date.now();

				let channel;
				if ( ! this.enabled )
					channel = {has_badges: false, failed: true, teams: new Map};

				else if ( ! data )
					// Keep what we knew through an outage, and ask again soon.
					channel = previous
						? {...previous, expires: now + RETRY_TIME}
						: {has_badges: false, failed: true, teams: new Map, loaded: now, expires: now + RETRY_TIME};

				else {
					channel = {
						has_badges: data.has_badges,
						teams: new Map,
						loaded: now,
						expires: now + CHANNEL_CACHE_TIME
					};

					// Every team is remembered, so its members never look like an unknown team,
					// but only teams with a thumbnail get a badge.
					let loaded = false;
					for(const team of data.teams) {
						channel.teams.set(team.team_id, team);
						if ( team.team_icon_small ) {
							this.loadTeamBadge(team);
							loaded = true;
						}
					}

					if ( loaded )
						this.badges.buildBadgeCSS();
				}

				if ( this.enabled ) {
					this.channels.set(streamer_id, channel);

					// The channel's last flair or team is gone, so its badges must go too.
					if ( previous?.has_badges && ! channel.has_badges && ! channel.failed )
						this.reapplyRoom(streamer_id);
				}

				return channel;
			});

		this.channel_loads.set(streamer_id, load);
		return load;
	}

	// Two definitions serve every flair: the outlined plain one, and a borderless one for
	// colored flairs (the border follows FFZ's theme text color, so it would ring a fill).
	// Each user's text, and fill color, is passed in with their badge.
	// FFZ's badge visibility list can't draw a text-only badge, so flairs are hidden
	// from it and the add-on's settings control them instead.
	loadFlairBadge() {
		const size = FLAIR_SIZES[this.settings.get('addon.community.flair-size')] ?? FLAIR_SIZES.medium,
			definition = {
				no_visibility: true,
				title: this.i18n.t('addon.community.flair-base', 'Community Flair'),
				click_url: SITE_URL,
				slot: SLOT_FLAIR
			},
			// FFZ pads text badges with `tw-pd-x-05` (0.5rem !important), so ours needs !important to win.
			box = `display:inline-flex;align-items:center;border-radius:0.25rem;font-size:${size.font}rem;padding-left:${size.padding}rem !important;padding-right:${size.padding}rem !important`;

		this.badges.loadBadgeData(FLAIR_BADGE, {...definition, css: `${box};border:0.1rem solid`}, false);
		this.badges.loadBadgeData(FLAIR_COLORED_BADGE, {...definition, css: box}, false);
		this.badges.buildBadgeCSS();
	}

	loadTeamBadge(team) {
		const badge_id = `${TEAM_BADGE}-${team.team_id}`,
			icon = team.team_icon_small;

		this.team_badges.add(badge_id);

		// Without `urls`, FFZ treats `image` as a folder and appends `1.png`/`2.png`/`4.png`.
		// The API has one thumbnail, sized for the largest scale, so it serves every scale.
		this.badges.loadBadgeData(badge_id, {
			base_id: TEAM_BADGE,
			title: this.i18n.t('addon.community.team-base', 'Community Team'),
			image: icon,
			urls: {1: icon, 2: icon, 4: icon},
			click_url: SITE_URL,
			slot: SLOT_TEAM
		}, false);
	}

	// Flairs and teams belong to one channel, so these always take the room's user,
	// never the global one.
	apply(streamer_id, room_user, value) {
		let changed = room_user.removeAllBadges(PROVIDER);

		if ( value?.flair && this.settings.get('addon.community.flairs') )
			changed = room_user.addBadge(PROVIDER, this.flairBadgeId(value), this.flairBadgeData(value)) || changed;

		const team = value?.team_id && this.settings.get('addon.community.teams')
			&& this.channels.get(streamer_id)?.teams.get(value.team_id);
		if ( team?.team_icon_small )
			// FFZ reads the hide toggle from the user's badge, not the definition.
			changed = room_user.addBadge(PROVIDER, `${TEAM_BADGE}-${team.team_id}`, {
				base_id: TEAM_BADGE,
				title: this.i18n.t('addon.community.team', 'Community Team: {value}', {
					value: team.team_name
				})
			}) || changed;

		if ( changed )
			this.emit('chat:update-lines-by-user', room_user.id, room_user.login, false, true);
	}

	flairBadgeId(value) {
		return value.flair_color && this.settings.get('addon.community.flair-colors')
			? FLAIR_COLORED_BADGE
			: FLAIR_BADGE;
	}

	// A flair is drawn plain (no color), filled, or as colored text. The API only
	// sends validated #rrggbb colors.
	flairBadgeData(value) {
		const text = shorten(
				this.settings.get('addon.community.flair-text') === 'short' && value.flair_short || value.flair,
				this.settings.get('addon.community.flair-length')
			),
			// The tooltip always shows the whole flair.
			title = this.i18n.t('addon.community.flair', 'Community Flair: {value}', {
				value: value.flair
			});

		if ( this.flairBadgeId(value) === FLAIR_BADGE )
			return {content: text, title};

		const color = value.flair_color,
			is_dark = this.settings.get('theme.is-dark'),
			as_text = value.flair_style === 'text'
				|| this.settings.get('chat.badges.style') === TRANSPARENT_BADGE_STYLE;

		// Colored text needs the theme to stay readable; without it, fall back to a fill.
		if ( as_text && typeof is_dark === 'boolean' )
			return {
				content: coloredText(text, pushContrastToMinimum(color, is_dark ? '#000000' : '#FFFFFF', TEXT_CONTRAST)),
				title
			};

		return {color, content: coloredText(text, getContrastingShade(color)), title};
	}

	isMissingBadges(streamer_id, room_user, value) {
		if ( value.flair && this.settings.get('addon.community.flairs') && ! room_user.getBadge(this.flairBadgeId(value)) )
			return true;

		return !! value.team_id
			&& this.settings.get('addon.community.teams')
			&& !! this.channels.get(streamer_id)?.teams.get(value.team_id)?.team_icon_small
			&& ! room_user.getBadge(`${TEAM_BADGE}-${value.team_id}`);
	}

	reapplyAll() {
		for(const room of this.chat.iterateRooms())
			this.reapplyRoom(room.id);
	}

	reapplyRoom(streamer_id) {
		const room = this.chat.getRoom(streamer_id, null, true);
		if ( ! room )
			return;

		const has_badges = this.channels.get(streamer_id)?.has_badges;
		for(const room_user of room.iterateUsers()) {
			const value = has_badges ? this.users.get(`${streamer_id}-${room_user.id}`)?.value : null;
			this.apply(streamer_id, room_user, value ?? null);
		}
	}
}

Community.register();
