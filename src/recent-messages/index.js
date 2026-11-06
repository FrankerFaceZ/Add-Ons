import {
	COLOURS,
	COPY,
	DEFAULT_API,
	DIVIDER_CSS,
	DIVIDER_STYLE_ID,
	KEYS,
	SCROLLBACK_FALLBACK,
	SCROLLBACK_SETTING,
	SETTINGS_PAGE,
	TIMING
} from './constants';
import {
	isBackfillLine,
	parseHistoryLine
} from './irc';
import {
	backfillNoticeIndex,
	bufferMessages,
	defaultUserColour,
	delayedEvent,
	historyNoticeIndex,
	historyUrl,
	insertAt,
	mergeHistory,
	messageId,
	messageText,
	messageTime,
	normalizeApiBase,
	sleep
} from './messages';

class RecentMessages extends Addon {
	constructor(...args) {
		super(...args);
		this.inject('chat');
		this.inject('site');
		this.inject('site.fine');
		this._loading = new Set();
		this.registerSettings();
	}

	registerSettings() {
		const page = SETTINGS_PAGE;
		this.settings.add(KEYS.limit, {
			default: 0,
			ui: {
				path: page,
				title: 'Message Load Limit',
				description: 'How many messages to ask for. 0 follows [Chat > Behavior > Scrollback Length](~chat.behavior.general). Any other value is still capped by that, because chat discards lines past it.',
				component: 'setting-text-box'
			}
		});
		this.settings.add(KEYS.api, {
			default: DEFAULT_API,
			ui: {
				path: page,
				title: 'History API',
				description: 'The API used to get messages. It must return raw IRC lines in the [recent-messages](https://recent-messages.robotty.de/api) format. Default is [Best Logs](https://logs.zonian.dev).',
				component: 'setting-text-box'
			}
		});
		this.settings.add(KEYS.rmOnly, {
			default: false,
			ui: {
				path: page,
				title: 'Recent messages only',
				description: 'Only use the newest messages still in the live buffer. This is faster, but the history is shorter. Leave this off to also fill in older messages from saved logs. APIs that do not support this behave as if it were set to true. Parameter: `rm_only`.',
				component: 'setting-check-box'
			}
		});
		this.settings.add(KEYS.maxAge, {
			default: 0,
			ui: {
				path: page,
				title: 'Maximum message age (minutes)',
				description: 'Do not load messages older than this. Also drops historical messages Twitch already put in chat. 0 means no limit.',
				component: 'setting-text-box'
			}
		});
	}

	onEnable() {
		this.log.debug('Recent messages addon enabled.');
		this.installDivider();
		this.on('chat:room-add', this.roomAdd);
		try {
			this.chat.context.on('changed:context.channel', this.onChannel, this);
			this.chat.context.on('changed:context.channelID', this.onChannel, this);
		} catch {
			/* history still loads from room-add */
		}

		for (const room of this.chat.iterateRooms()) {
			if (room)
				this.roomAdd(room);
		}
		this.onChannel();
	}

	onChannel() {
		const channel = this.currentChannel();
		if (!channel.login && !channel.id)
			return;
		const room = this.roomForChannel(channel);
		if (room)
			this.roomAdd(room);
	}

	currentChannel() {
		let login = '';
		let id = '';
		try {
			login = String(this.chat.context.get('context.channel') || '').toLowerCase();
			const raw = this.chat.context.get('context.channelID');
			id = raw == null ? '' : String(raw);
		} catch {
			/* no channel yet */
		}
		return {login, id};
	}

	roomForChannel(channel) {
		try {
			if (typeof this.chat.getRoom === 'function') {
				const room = this.chat.getRoom(channel.id || null, channel.login || null, true);
				if (room)
					return room;
			}
		} catch {
			/* fall through to the room list */
		}

		if (!channel.login)
			return null;
		for (const room of this.chat.iterateRooms()) {
			if (room && String(room.login || '').toLowerCase() === channel.login)
				return room;
		}
		return null;
	}

	// Shared-chat participants are real FFZ rooms, but they do not have their
	// own chat. Loading their logs would paste another channel's history here.
	roomIsShared(room) {
		const site = this.siteChat();
		const shared = site && site.shared_rooms;
		if (!shared || !room)
			return false;

		const id = roomId(room);
		const login = roomLogin(room);
		const entries = shared instanceof Map ? shared.entries() : Object.entries(shared);
		for (const [sharedId, other] of entries) {
			if (id && String(sharedId) === id)
				return true;
			if (id && other && other.id != null && String(other.id) === id)
				return true;
			if (login && other && String(other.login || '').toLowerCase() === login)
				return true;
		}
		return false;
	}

	// The channel on screen is not a guest, even when it is part of the session.
	// A buffer means this room is the one on screen.
	isSharedGuest(room) {
		if (!room || !this.roomIsShared(room) || this.bufferFor(room))
			return false;

		const channel = this.currentChannel();
		const id = roomId(room);
		const login = roomLogin(room);
		if (channel.id && id && channel.id === id)
			return false;
		if (channel.login && login && channel.login === login)
			return false;
		if (!channel.id && !channel.login)
			return false;
		return true;
	}

	roomAdd(room) {
		const key = room && (room.id || room.login);
		if (!key || this._loading.has(key))
			return;

		this._loading.add(key);
		// room-add for a shared participant runs before FFZ records the room
		// in shared_rooms. Decide on the next turn.
		Promise.resolve().then(() => {
			if (this.isSharedGuest(room)) {
				this.log.debug('Skipping shared-chat guest', room.login || room.id);
				return;
			}
			this.log.debug('Loading history for', room.login || room.id);
			return this.loadHistory(room);
		}).catch(err => {
			this.log.debug('History load failed', room.login || room.id, err);
		}).finally(() => {
			this._loading.delete(key);
		});
	}

	async loadHistory(room) {
		if (!room || !room.login) {
			this.log.debug('Room has no login, skipping history.');
			return;
		}

		this.log.debug('Waiting for Twitch chat', room.login);
		const buffer = await this.waitForTwitchBuffer(room);
		if (!buffer)
			return;

		const noticeId = `ffz-msg-history-${room.login}`;
		if ((buffer.buffer || []).some(msg => msg && msg.id === noticeId)) {
			this.log.debug('History already loaded for', room.login);
			return;
		}

		const cutoff = this.historyAfter();
		const url = this.historyRequest(room.login, cutoff);
		this.log.debug('Fetching history', url);
		const data = await this.fetchHistory(url, room.login);
		if (!data)
			return;

		const {history, skipped} = this.collectHistory(data.messages, room, cutoff);
		this.log.debug('Parsed history', room.login, history.length, 'kept,', skipped, 'unparsed, of', data.messages.length);
		this.mergeIntoBuffer(this.bufferFor(room) || buffer, history, cutoff, room, noticeId);
	}

	mergeIntoBuffer(buffer, history, cutoff, room, noticeId) {
		const before = (buffer.buffer || []).length;
		const removed = this.stripOldTwitchHistory(buffer, cutoff);
		if (removed)
			this.log.debug('Dropped Twitch historical lines older than the age limit', room.login, removed);

		const existing = Array.isArray(buffer.buffer) ? buffer.buffer.slice() : [];
		// Lines waiting in the delay buffer are not visible yet. Count them so
		// a matching log line is dropped, but leave them for Twitch to show.
		const pending = bufferMessages(buffer).filter(msg => !existing.includes(msg));
		const {merged, inserted} = mergeHistory(existing.concat(pending), history);
		const pendingSet = new Set(pending);
		const timeline = merged.filter(msg => !pendingSet.has(msg));

		if (!inserted.length) {
			this.log.debug('History overlapped Twitch chat; kept Twitch\'s copies.', room.login);
			if (cutoff && (buffer.buffer || []).length !== before)
				this.notifyBuffer(buffer);
			return;
		}

		this.rememberInserted(buffer, inserted);
		this.log.debug('Replaying', inserted.length, 'history lines into', room.login);
		this.replay(buffer, timeline);
		this.placeNotices(buffer, room.login, noticeId);
		this.trimScrollback(buffer);
		this.notifyBuffer(buffer);
		this.log.debug('History merged', room.login, 'buffer', buffer.buffer.length, 'inserted', inserted.length);
	}

	historyRequest(login, cutoff) {
		const params = new URLSearchParams();
		params.set('limit', String(this.historyLimit()));
		params.set('rm_only', this.setting(KEYS.rmOnly) ? 'true' : 'false');
		if (cutoff)
			params.set('after', String(cutoff));
		return historyUrl(this.apiBase(), login, params.toString());
	}

	async fetchHistory(url, login) {
		let response;
		try {
			response = await fetch(url);
		} catch (err) {
			this.log.debug('History request failed', login, err);
			return null;
		}
		if (!response || !response.ok) {
			this.log.debug('History request rejected', login, response && response.status);
			return null;
		}

		let data;
		try {
			data = await response.json();
		} catch (err) {
			this.log.debug('History response was not JSON', login, err);
			return null;
		}
		if (data && data.error)
			this.log.debug('History API warning', login, data.error);
		if (!data || !Array.isArray(data.messages) || !data.messages.length) {
			this.log.debug('No history lines returned', login);
			return null;
		}
		return data;
	}

	collectHistory(lines, room, cutoff) {
		const history = [];
		let skipped = 0;
		for (const rawLine of lines) {
			const msg = this.parseLine(rawLine, room);
			if (!msg) {
				skipped++;
				continue;
			}
			const when = messageTime(msg);
			if (cutoff && when > 0 && when < cutoff)
				continue;
			if (isBackfillLine(rawLine))
				msg._backfill = true;
			if (msg.user) {
				try {
					this.tokenize(msg);
				} catch (err) {
					this.log.debug('Skipped a history line', err);
					skipped++;
					continue;
				}
				if (msg.ffz_removed)
					continue;
			}
			history.push(msg);
		}
		return {history, skipped};
	}

	rememberInserted(buffer, inserted) {
		const ids = this.watchForTwitchCopies(buffer);
		for (const msg of inserted) {
			const id = messageId(msg);
			if (id)
				ids.add(id);
		}
	}

	// If Twitch delivers a line we already inserted, drop our copy first so
	// Twitch's object (replies, bits, moderation) is the one that stays.
	watchForTwitchCopies(buffer) {
		if (buffer._historyIds)
			return buffer._historyIds;

		const ids = new Set();
		buffer._historyIds = ids;
		const original = buffer.handleMessage;
		if (typeof original !== 'function')
			return ids;

		const addon = this;
		buffer.handleMessage = function(msg) {
			try {
				addon.dropHistoryCopy(buffer, ids, msg);
			} catch {
				/* keep Twitch's message flowing */
			}
			return original.call(buffer, msg);
		};
		return ids;
	}

	dropHistoryCopy(buffer, ids, msg) {
		const id = messageId(msg);
		if (!id || !ids.has(id) || !Array.isArray(buffer.buffer))
			return;
		const index = buffer.buffer.findIndex(line => line && line._fromHistory && messageId(line) === id);
		if (index === -1)
			return;
		buffer.buffer.splice(index, 1);
		if (typeof buffer.slidingWindowEnd === 'number' && buffer.slidingWindowEnd > index)
			buffer.slidingWindowEnd--;
		ids.delete(id);
		this.notifyBuffer(buffer);
	}

	// Clears, timeouts, bans, and deletes go through the chat buffer so FFZ
	// applies the viewer's own moderation settings. Lines Twitch already
	// processed are put back and are not handled a second time.
	replay(buffer, timeline) {
		// Live lines still waiting out the artificial delay are newer than the
		// log. Hold them aside; resetBuffer wipes the delay queue.
		const pending = Array.isArray(buffer.delayedMessageBuffer) ? buffer.delayedMessageBuffer.slice() : [];
		const messageType = this.chatTypes().Message;
		this.resetBuffer(buffer);

		let failed = 0;
		for (const msg of timeline) {
			if (!msg)
				continue;
			if (msg._fromHistory && typeof buffer.handleMessage === 'function')
				failed += this.replayHistoryLine(buffer, msg, messageType) ? 0 : 1;
			else
				buffer.buffer.push(msg);
		}
		if (failed)
			this.log.debug('History lines the chat handler rejected', failed);

		buffer.delayedMessageBuffer = (buffer.delayedMessageBuffer || []).concat(pending);
		buffer.slidingWindowEnd = buffer.buffer.length;
	}

	replayHistoryLine(buffer, msg, messageType) {
		let accepted = true;
		try {
			buffer.handleMessage(msg);
		} catch {
			accepted = false;
		}
		this.releaseDelayed(buffer, msg);
		const held = (buffer.delayedMessageBuffer || []).some(entry => entry === msg || (entry && entry.event === msg));
		if (msg.type === messageType && !msg.ffz_removed && buffer.buffer.indexOf(msg) === -1 && !held)
			buffer.buffer.push(msg);
		return accepted;
	}

	// clear(0) is not a moderation CLEARCHAT, so "Do not Clear Chat when
	// commanded to" does not apply and will not block it.
	resetBuffer(buffer) {
		const paused = typeof buffer.isPaused === 'function' ? buffer.isPaused() : !!buffer.paused;
		if (typeof buffer.clear === 'function')
			buffer.clear(0);
		else {
			buffer.buffer = [];
			buffer.delayedMessageBuffer = [];
			buffer.ffz_extra = 0;
		}
		buffer.paused = paused;
		buffer.slidingWindowEnd = 0;
	}

	// handleMessage parks lines in the delay queue and flushes them later,
	// which would append them after the history notice.
	releaseDelayed(buffer, msg) {
		const delay = buffer.delayedMessageBuffer;
		if (!Array.isArray(delay) || !delay.length)
			return;
		const queued = delay.splice(0, delay.length);
		for (const entry of queued) {
			const event = delayedEvent(entry);
			if (!event || event.ffz_removed)
				continue;
			if (buffer.buffer.indexOf(event) === -1)
				buffer.buffer.push(event);
		}
		const messageType = this.chatTypes().Message;
		const alreadyQueued = queued.some(entry => delayedEvent(entry) === msg);
		if (msg && msg.type === messageType && !msg.ffz_removed && buffer.buffer.indexOf(msg) === -1 && !alreadyQueued)
			buffer.buffer.push(msg);
	}

	placeNotices(buffer, login, noticeId) {
		const lines = buffer.buffer.slice();
		const gapAt = backfillNoticeIndex(lines);
		if (gapAt !== -1) {
			const boundary = messageTime(lines[gapAt]) || messageTime(lines[gapAt - 1]) || Date.now();
			insertAt(lines, gapAt, {
				type: this.chatTypes().Notice,
				message: COPY.gap,
				id: `ffz-msg-history-gap-${login}`,
				timestamp: boundary
			});
		}
		insertAt(lines, historyNoticeIndex(lines), {
			type: this.chatTypes().Notice,
			message: COPY.history,
			_historyDivider: true,
			_historyLabel: COPY.label,
			_historyTitle: COPY.title,
			id: noticeId,
			timestamp: Date.now()
		});
		buffer.buffer = lines;
	}

	// Notices count toward scrollback. This runs once, after history is
	// inserted, because that write does not go through FFZ's own flush.
	trimScrollback(buffer) {
		const scrollback = this.scrollbackLimit();
		if (buffer.buffer.length > scrollback && typeof buffer.clear === 'function')
			buffer.clear(scrollback);
		buffer.slidingWindowEnd = buffer.buffer.length;
	}

	notifyBuffer(buffer) {
		if (!buffer || (buffer.props && buffer.props.isBackground))
			return;
		if (typeof buffer.notifySubscribers === 'function')
			buffer.notifySubscribers();
	}

	// Historical lines Twitch loaded sit before the live separator. Without
	// one, the buffer is still that initial dump.
	stripOldTwitchHistory(buffer, cutoff) {
		if (!cutoff || !buffer || !Array.isArray(buffer.buffer))
			return 0;
		const end = this.twitchHistoryEnd(buffer);
		const before = buffer.buffer.length;
		buffer.buffer = buffer.buffer.filter((msg, index) => {
			if (index >= end)
				return true;
			const when = messageTime(msg);
			return !(when > 0 && when < cutoff);
		});
		if (typeof buffer.slidingWindowEnd === 'number')
			buffer.slidingWindowEnd = Math.min(buffer.slidingWindowEnd, buffer.buffer.length);
		return before - buffer.buffer.length;
	}

	twitchHistoryEnd(buffer) {
		const separator = this.chatTypes().LiveMessageSeparator;
		if (separator == null)
			return buffer.buffer.length;
		const at = buffer.buffer.findIndex(msg => msg && msg.type === separator);
		return at === -1 ? buffer.buffer.length : at;
	}

	// The buffer mounts, then Twitch dumps recent chat into it on its own
	// schedule. After the first chat line it waits out the burst, then gives
	// up once new lines are only trickling in.
	async waitForTwitchBuffer(room) {
		let buffer = await this.pollBuffer(room, Date.now() + TIMING.bufferMs, 0);
		buffer = this.bufferFor(room) || buffer;
		if (!buffer) {
			this.log.debug('No chat buffer for', room && room.login);
			return null;
		}
		if (!this.hasChatMessage(buffer))
			return buffer;

		buffer = await this.waitForBurst(room, buffer, 0);
		this.log.debug('Twitch buffer ready', room && room.login, 'lines', buffer ? bufferMessages(buffer).length : 0);
		return buffer;
	}

	async pollBuffer(room, deadline, sawBufferAt) {
		const buffer = this.bufferFor(room);
		const seen = sawBufferAt || (buffer ? Date.now() : 0);
		if (buffer && this.bufferSettled(buffer, seen))
			return buffer;
		if (Date.now() >= deadline)
			return buffer;
		await sleep(TIMING.pollMs);
		return this.pollBuffer(room, deadline, seen);
	}

	bufferSettled(buffer, sawBufferAt) {
		const loading = !!(buffer.props && buffer.props.isLoadingHistoricalMessages);
		const hasChat = this.hasChatMessage(buffer);
		const emptyLongEnough = !loading && !hasChat && Date.now() - sawBufferAt > TIMING.emptyMs;
		return !loading && (hasChat || emptyLongEnough);
	}

	async waitForBurst(room, buffer, extra) {
		if (extra >= TIMING.burstTries)
			return this.bufferFor(room) || buffer;
		const before = bufferMessages(buffer).length;
		await sleep(TIMING.burstMs);
		const next = this.bufferFor(room) || buffer;
		if (bufferMessages(next).length - before < TIMING.burstGap)
			return this.bufferFor(room) || next;
		return this.waitForBurst(room, next, extra + 1);
	}

	// The connector is the reliable link to the channel. The buffer list is
	// the fallback for the moment before that link is stored.
	bufferFor(room) {
		const site = this.siteChat();
		if (!site)
			return null;

		const fromConnector = newestMatch(site.ChatBufferConnector && site.ChatBufferConnector.instances, conn => {
			if (!propsMatchRoom(conn.props, room))
				return null;
			const buffer = conn.props.messageBufferAPI && conn.props.messageBufferAPI._ffz_inst;
			return buffer && Array.isArray(buffer.buffer) ? buffer : null;
		});
		if (fromConnector)
			return fromConnector;

		return newestMatch(site.ChatBuffer && site.ChatBuffer.instances, buffer => {
			const connector = buffer._ffz_connector;
			const props = (connector && connector.props) || buffer.props;
			return propsMatchRoom(props, room) && Array.isArray(buffer.buffer) ? buffer : null;
		});
	}

	hasChatMessage(buffer) {
		return bufferMessages(buffer).some(msg => this.isChatMessage(msg));
	}

	isChatMessage(msg) {
		if (!msg || !msg.user)
			return false;
		const type = this.chatTypes().Message;
		if (type != null && msg.type !== type)
			return false;
		return messageText(msg) !== '' || typeof msg.message === 'string';
	}

	parseLine(rawLine, room) {
		try {
			return parseHistoryLine(rawLine, room, this.chatTypes(), this.modTypes());
		} catch (err) {
			this.log.debug('Skipped a history line', err);
			return null;
		}
	}

	tokenize(msg) {
		const site = this.siteChat();
		const chat = site.chat;
		const types = this.chatTypes();
		if (types.Message != null)
			msg.type = types.Message;
		if (!Array.isArray(msg.messageParts))
			msg.messageParts = [];
		if (msg._action && site.message_types && site.message_types.Action != null)
			msg.messageType = site.message_types.Action;
		this.fillUserColour(chat, msg);

		if (typeof chat.standardizeMessage === 'function')
			chat.standardizeMessage(msg);
		else
			chat.standardizeEmotes(msg);

		msg.ffz_tokens = chat.tokenizeMessage(msg, this.currentUser(), true);
		return msg;
	}

	// A colour tag is used as-is. Otherwise prefer a colour Twitch already
	// showed this session. The preset fallback runs only on a cache miss.
	fillUserColour(chat, msg) {
		if (!msg.user || msg.user.color)
			return;
		let cached = null;
		if (chat && chat.color_cache && msg.user.login)
			cached = chat.color_cache.get(msg.user.login);
		msg.user.color = cached || defaultUserColour(msg.user.login, COLOURS);
	}

	currentUser() {
		try {
			return this.resolve('site').getUser();
		} catch {
			return null;
		}
	}

	setting(key, fallback) {
		try {
			const value = this.settings.get(key);
			return value == null ? fallback : value;
		} catch {
			return fallback;
		}
	}

	scrollbackLimit() {
		try {
			const value = this.chat && this.chat.context && this.chat.context.get(SCROLLBACK_SETTING);
			const limit = parseInt(value, 10);
			if (Number.isFinite(limit) && limit > 0)
				return limit;
		} catch {
			/* default */
		}
		return SCROLLBACK_FALLBACK;
	}

	// 0 follows Scrollback Length, and that length is also the hard cap.
	historyLimit() {
		const raw = parseInt(this.setting(KEYS.limit), 10);
		const scrollback = this.scrollbackLimit();
		if (!Number.isFinite(raw) || raw < 1)
			return scrollback;
		if (scrollback > 0)
			return Math.min(raw, scrollback);
		return raw;
	}

	historyAfter() {
		const minutes = parseInt(this.setting(KEYS.maxAge), 10);
		if (!Number.isFinite(minutes) || minutes < 1)
			return 0;
		return Date.now() - minutes * 60 * 1000;
	}

	apiBase() {
		return normalizeApiBase(this.setting(KEYS.api, ''), DEFAULT_API);
	}

	// Twitch's "New" line ignores the message, so render our own copy when
	// the line is marked as a divider.
	installDivider() {
		if (this._dividerInstalled)
			return;
		const fine = this.resolve('site.fine');
		if (!fine || typeof fine.define !== 'function')
			return;
		this._dividerInstalled = true;
		const def = fine.define(
			'history-event-line',
			cls => typeof cls.renderContent === 'function' && typeof cls.getSharedChatMessageEventProps === 'function'
		);
		def.ready(cls => this.hookDivider(def, cls));
	}

	hookDivider(def, cls) {
		if (cls.prototype._historyDividerHook)
			return;
		cls.prototype._historyDividerHook = true;
		const original = cls.prototype.renderContent;
		const addon = this;
		// The renderer is a Twitch component method. `this` is that component.
		/* eslint-disable no-invalid-this, prefer-rest-params */
		cls.prototype.renderContent = function() {
			const msg = this.props && this.props.message;
			if (msg && msg._historyDivider)
				return addon.renderDivider(msg);
			return original.apply(this, arguments);
		};
		/* eslint-enable no-invalid-this, prefer-rest-params */
		if (typeof def.forceUpdate === 'function')
			def.forceUpdate();
	}

	renderDivider(msg) {
		const React = this.resolve('site').getReact();
		const create = React && React.createElement;
		if (!create)
			return null;
		this.ensureDividerStyle();
		return create('div', {
			className: 'chat-line__message',
			style: {display: 'flex', alignItems: 'center'}
		},
		create('div', {
			className: 'live-message-separator-line__hr',
			style: {flexGrow: 1, marginRight: '0.5rem'}
		}),
		create('span', {
			className: 'ffz-tooltip ffz-msg-history-divider',
			'data-title': msg._historyTitle
		}, msg._historyLabel || COPY.label));
	}

	ensureDividerStyle() {
		if (document.getElementById(DIVIDER_STYLE_ID))
			return;
		const css = document.createElement('style');
		css.id = DIVIDER_STYLE_ID;
		css.textContent = DIVIDER_CSS;
		(document.head || document.documentElement).appendChild(css);
	}

	siteChat() {
		return this.resolve('site.chat');
	}

	chatTypes() {
		const site = this.siteChat();
		return site && site.chat_types || {};
	}

	modTypes() {
		const site = this.siteChat();
		return site && site.mod_types || {};
	}
}

function roomId(room) {
	return room && room.id != null ? String(room.id) : '';
}

function roomLogin(room) {
	return String(room && room.login || '').toLowerCase();
}

function newestMatch(list, pick) {
	let found = null;
	for (const item of list || []) {
		const match = item && pick(item);
		if (match)
			found = match;
	}
	return found;
}

function propsMatchRoom(props, room) {
	if (!props)
		return false;
	const login = roomLogin(room);
	const id = roomId(room);
	const propLogin = String(props.channelLogin || '').toLowerCase();
	const propId = props.channelID != null ? String(props.channelID) : '';
	return (id && propId === id) || (login && propLogin === login);
}

RecentMessages.register();
