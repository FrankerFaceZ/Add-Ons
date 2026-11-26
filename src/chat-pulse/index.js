// Chat Pulse

const { createElement } = FrankerFaceZ.utilities.dom;

// Resolution of the activity timeline, and how much of it we keep.
const BUCKET_MS = 5000;
const MAX_BUCKETS = 120;

// How many buckets the popup's sparkline shows (five minutes).
const SERIES_LENGTH = 60;

const NON_PRINTABLE = /^(\s|[^\x20-\x7E])+$/;


function formatRate(rate) {
	return rate < 10
		? Math.round(rate * 10) / 10
		: Math.round(rate);
}


function topEntries(map, count, toRow) {
	const rows = [];
	for(const [key, value] of map)
		rows.push(toRow(key, value));

	rows.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
	return rows.slice(0, count);
}


class RoomStats {
	constructor() {
		this.reset();
	}

	reset() {
		this.started = Date.now();
		this.messages = 0;
		this.emote_only = 0;
		this.chatters = new Map(); // login -> { name, count }
		this.emotes = new Map();   // emote name -> count
		this.buckets = [];         // { time, count }, oldest first
	}

	record(msg, tokens, now) {
		this.messages++;

		const user = msg.user,
			chatter = this.chatters.get(user.login);

		if ( chatter ) {
			chatter.count++;
			if ( user.displayName )
				chatter.name = user.displayName;

		} else
			this.chatters.set(user.login, {
				name: user.displayName || user.login,
				count: 1
			});

		let only_emotes = tokens.length > 0;
		for(const token of tokens) {
			if ( token.type === 'emote' ) {
				const name = token.text || token.code;
				if ( name )
					this.emotes.set(name, (this.emotes.get(name) || 0) + 1);

			} else if ( ! (token.type === 'text' && NON_PRINTABLE.test(token.text)) )
				only_emotes = false;
		}

		if ( only_emotes )
			this.emote_only++;

		const time = Math.floor(now / BUCKET_MS) * BUCKET_MS,
			last = this.buckets[this.buckets.length - 1];

		if ( last && last.time === time )
			last.count++;

		else if ( ! last || time > last.time ) {
			this.buckets.push({ time, count: 1 });
			if ( this.buckets.length > MAX_BUCKETS )
				this.buckets.splice(0, this.buckets.length - MAX_BUCKETS);
		}

		// A message older than the newest bucket (history that loaded late)
		// still counts toward the totals above; it just stays off the timeline.
	}

	// Messages per minute over the trailing window. Early in a session the
	// window shrinks to the time elapsed so the figure is not diluted.
	rate(window_ms, now) {
		const span = Math.max(BUCKET_MS, Math.min(window_ms, now - this.started)),
			since = now - span;

		let count = 0;
		for(let i = this.buckets.length - 1; i >= 0; i--) {
			const bucket = this.buckets[i];
			if ( bucket.time + BUCKET_MS <= since )
				break;

			count += bucket.count;
		}

		return count * 60000 / span;
	}

	// Message counts for the most recent `length` buckets, oldest first,
	// with zeros where nothing happened.
	series(length, now) {
		const out = new Array(length).fill(0),
			newest = Math.floor(now / BUCKET_MS) * BUCKET_MS,
			oldest = newest - (length - 1) * BUCKET_MS;

		for(const bucket of this.buckets) {
			const index = (bucket.time - oldest) / BUCKET_MS;
			if ( index >= 0 && index < length )
				out[index] = bucket.count;
		}

		return out;
	}
}


class ChatPulse extends Addon {
	constructor(...args) {
		super(...args);

		this.inject('chat');
		this.inject('metadata');

		this.rooms = new Map(); // room login -> RoomStats

		this.settings.add('chat_pulse.show_badge', {
			default: true,
			ui: {
				sort: 0,
				path: 'Add-Ons > Chat Pulse >> Badge',
				title: 'Show the badge under the player',
				description: 'Statistics are still collected while the badge is hidden, but the badge is the only way to open the popup.',
				component: 'setting-check-box'
			},
			changed: () => this.updateBadge()
		});

		this.settings.add('chat_pulse.window', {
			default: 60,
			ui: {
				sort: 1,
				path: 'Add-Ons > Chat Pulse >> Badge',
				title: 'Rate window',
				description: 'Messages per minute is averaged over this much recent chat.',
				component: 'setting-select-box',
				data: [
					{ value: 30, title: '30 seconds' },
					{ value: 60, title: '1 minute' },
					{ value: 120, title: '2 minutes' },
					{ value: 300, title: '5 minutes' }
				]
			}
		});

		this.settings.add('chat_pulse.count_historical', {
			default: false,
			ui: {
				sort: 0,
				path: 'Add-Ons > Chat Pulse >> Counting',
				title: 'Count messages from before you joined',
				description: 'Include the recent history Twitch loads when a chat opens. These messages count toward the totals but not the rate.',
				component: 'setting-check-box'
			}
		});

		this.settings.add('chat_pulse.top_count', {
			default: 5,
			ui: {
				sort: 0,
				path: 'Add-Ons > Chat Pulse >> Popup',
				title: 'Length of the top chatters and top emotes lists',
				component: 'setting-select-box',
				data: [
					{ value: 3, title: '3' },
					{ value: 5, title: '5' },
					{ value: 10, title: '10' }
				]
			}
		});

		const self = this;
		this.tokenizer = {
			type: 'chat_pulse',
			priority: 0,

			process(tokens, msg) {
				self.recordMessage(tokens, msg);
				return tokens;
			}
		};
	}

	onEnable() {
		this.chat.addTokenizer(this.tokenizer);
		this.updateBadge();
	}

	onDisable() {
		this.chat.removeTokenizer(this.tokenizer);
		this.metadata.define('chat-pulse', null);
		this.rooms.clear();
	}


	// Counting

	getRoomLogin(msg) {
		const room = msg.roomLogin || (msg.channel ? msg.channel.replace(/^#/, '') : '');
		return room.trim().toLowerCase();
	}

	getStats(login, create = false) {
		let stats = this.rooms.get(login);
		if ( ! stats && create ) {
			stats = new RoomStats;
			this.rooms.set(login, stats);
		}

		return stats;
	}

	recordMessage(tokens, msg) {
		// Tokenizers run again whenever chat lines re-render, so make sure
		// each message object is only counted once.
		if ( ! msg || msg.chat_pulse_seen || ! msg.user?.login )
			return;

		if ( msg.isHistorical && ! this.settings.get('chat_pulse.count_historical') )
			return;

		const room = this.getRoomLogin(msg);
		if ( ! room )
			return;

		msg.chat_pulse_seen = true;
		this.getStats(room, true).record(
			msg,
			tokens,
			msg.isHistorical && msg.timestamp ? msg.timestamp : Date.now()
		);
	}

	resetRoom(login) {
		const stats = this.getStats(login);
		if ( stats )
			stats.reset();
	}

	snapshot(login) {
		const stats = this.getStats(login),
			now = Date.now(),
			window_ms = this.settings.get('chat_pulse.window') * 1000,
			top = this.settings.get('chat_pulse.top_count');

		if ( ! stats )
			return {
				messages: 0,
				chatters: 0,
				emote_only: 0,
				emote_only_pct: 0,
				rate: 0,
				elapsed: 0,
				bucket_ms: BUCKET_MS,
				window_sec: window_ms / 1000,
				series: new Array(SERIES_LENGTH).fill(0),
				top_chatters: [],
				top_emotes: []
			};

		return {
			messages: stats.messages,
			chatters: stats.chatters.size,
			emote_only: stats.emote_only,
			emote_only_pct: stats.messages ? Math.round(100 * stats.emote_only / stats.messages) : 0,
			rate: formatRate(stats.rate(window_ms, now)),
			elapsed: now - stats.started,
			bucket_ms: BUCKET_MS,
			window_sec: window_ms / 1000,
			series: stats.series(SERIES_LENGTH, now),
			top_chatters: topEntries(stats.chatters, top, (key, entry) => ({ name: entry.name, count: entry.count })),
			top_emotes: topEntries(stats.emotes, top, (name, count) => ({ name, count }))
		};
	}


	// Badge

	updateBadge() {
		if ( ! this.settings.get('chat_pulse.show_badge') ) {
			this.metadata.define('chat-pulse', null);
			return;
		}

		this.metadata.define('chat-pulse', {
			order: 150,
			button: true,
			icon: 'ffz-i-chat',
			refresh: 1000,

			label: data => {
				const stats = this.getStats(data?.channel?.login ?? ''),
					rate = stats
						? formatRate(stats.rate(this.settings.get('chat_pulse.window') * 1000, Date.now()))
						: 0;

				return this.i18n.t('addon.chat-pulse.badge', '{rate, number} msg/min', { rate });
			},

			tooltip: data => {
				const stats = this.getStats(data?.channel?.login ?? '');
				return this.i18n.t(
					'addon.chat-pulse.badge-tooltip',
					'Chat Pulse: {messages, plural, one {# message} other {# messages}} from {chatters, plural, one {# chatter} other {# chatters}} this session. Click for details.',
					{
						messages: stats?.messages ?? 0,
						chatters: stats?.chatters.size ?? 0
					}
				);
			},

			popup: async (data, tip, refresh, add_close_listener) => {
				await tip.waitForDom();
				tip.element.classList.add('ffz-balloon--lg');
				return this.buildPopup(data?.channel, add_close_listener);
			}
		});
	}

	async buildPopup(channel, add_close_listener) {
		const vue = this.resolve('vue');
		await vue.enable();

		const view = (await import(/* webpackChunkName: "chat-pulse/popup" */ './views/chat-pulse-popup.vue')).default,
			login = channel?.login ?? '';

		let instance = null;
		const destroy = () => {
			if ( instance ) {
				instance.$destroy();
				instance = null;
			}
		};

		instance = new vue.Vue({
			el: createElement('div'),
			components: {
				'chat-pulse-popup': view
			},
			render: h => h('chat-pulse-popup', {
				props: {
					// FFZ currently exposes display_name here; older builds used displayName.
					channel: channel?.display_name || channel?.displayName || login,
					getSnapshot: () => this.snapshot(login),
					reset: () => this.resetRoom(login),
					onDetached: destroy
				}
			})
		});

		// FFZ tells us when the balloon closes. Stop the popup's timer then
		// rather than leaving it to notice its element is gone.
		if ( typeof add_close_listener === 'function' )
			add_close_listener(destroy);

		return instance.$el;
	}
}

ChatPulse.register();
