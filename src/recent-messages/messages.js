// Identity, ordering, and request URL. None of this talks to FFZ.

export function messageId(msg) {
	if (!msg)
		return '';
	const id = msg.id || msg.messageID || msg.messageId;
	return id == null || id === '' ? '' : String(id);
}

export function messageTime(msg) {
	if (!msg)
		return 0;
	const stamp = msg.timestamp instanceof Date ? msg.timestamp.getTime() : Number(msg.timestamp);
	if (Number.isFinite(stamp) && stamp > 0)
		return stamp;
	if (msg.sentAt) {
		const sent = new Date(msg.sentAt).getTime();
		if (Number.isFinite(sent))
			return sent;
	}
	return Number.isFinite(stamp) ? stamp : 0;
}

export function messageLogin(msg) {
	const user = msg && msg.user || {};
	return String(user.login || user.userLogin || '').toLowerCase();
}

export function messageText(msg) {
	if (!msg)
		return '';
	if (typeof msg.message === 'string')
		return msg.message;
	if (typeof msg.messageBody === 'string')
		return msg.messageBody;
	if (msg.message && typeof msg.message.body === 'string')
		return msg.message.body;
	return '';
}

// Same login, timestamp, and text. Used when a line has no message id.
export function fallbackKey(msg) {
	const login = messageLogin(msg);
	const text = messageText(msg);
	const when = messageTime(msg);
	if (!login || !text || !when)
		return '';
	return `${login}\n${when}\n${text}`;
}

// FFZ stamps a live raid with Date.now() as the viewer arrives. The log line
// keeps tmi-sent-ts from when the raid was sent. Thirty seconds covers the
// redirect and the chat connect.
const RAID_MATCH_MS = 30 * 1000;

function isRaidNotice(msg) {
	if (!msg)
		return false;
	if (msg.ffz_type === 'raid_notice' || msg._noticeKind === 'Raid')
		return true;
	const params = msg.params;
	const kind = params && (params.msgId || params.msgid || params['msg-id']);
	return kind === 'raid';
}

// Twitch's own raid line keeps the raider on params, not user.
function raidLogin(msg) {
	const login = messageLogin(msg);
	if (login)
		return login;
	const params = msg && msg.params;
	return String(params && (params.login || params.userLogin) || '').toLowerCase();
}

function raidViewers(msg) {
	if (msg && msg.raid_viewer_count != null && msg.raid_viewer_count !== '') {
		const count = Number(msg.raid_viewer_count);
		if (Number.isFinite(count))
			return count;
	}
	const params = msg && msg.params;
	if (!params)
		return null;
	const raw = params.viewerCount != null ? params.viewerCount : params.viewer_count;
	if (raw == null || raw === '')
		return null;
	const count = Number(raw);
	return Number.isFinite(count) ? count : null;
}

function raidIdentity(msg) {
	if (!isRaidNotice(msg))
		return null;
	const login = raidLogin(msg);
	const viewers = raidViewers(msg);
	if (!login || viewers == null)
		return null;
	return {login, viewers, time: messageTime(msg)};
}

// Same raider and party size, close enough in time to be one raid.
export function sameRaid(a, b) {
	const left = raidIdentity(a);
	const right = raidIdentity(b);
	if (!left || !right)
		return false;
	if (left.login !== right.login || left.viewers !== right.viewers)
		return false;
	if (!left.time || !right.time)
		return false;
	return Math.abs(left.time - right.time) <= RAID_MATCH_MS;
}

// Closest loaded raid that is this same event. -1 when the line is ours
// or there is no match inside the window.
export function matchingRaidIndex(lines, msg) {
	if (!Array.isArray(lines) || (msg && msg._fromHistory))
		return -1;
	const incoming = raidIdentity(msg);
	if (!incoming || !incoming.time)
		return -1;
	let best = -1;
	let bestGap = RAID_MATCH_MS + 1;
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (!line || !line._fromHistory)
			continue;
		const other = raidIdentity(line);
		if (!other || !other.time || other.login !== incoming.login || other.viewers !== incoming.viewers)
			continue;
		const gap = Math.abs(other.time - incoming.time);
		if (gap > RAID_MATCH_MS || gap >= bestGap)
			continue;
		bestGap = gap;
		best = i;
	}
	return best;
}

function markSeen(ids, keys, raids, msg) {
	const id = messageId(msg);
	const key = fallbackKey(msg);
	if (id)
		ids.add(id);
	if (key)
		keys.add(key);
	if (isRaidNotice(msg))
		raids.push(msg);
}

function alreadySeen(ids, keys, raids, msg) {
	const id = messageId(msg);
	const key = fallbackKey(msg);
	if ((id && ids.has(id)) || (key && keys.has(key)))
		return true;
	return raids.some(other => sameRaid(other, msg));
}

// existing stays in its original order. history lines already covered by
// existing are dropped; the rest are inserted by timestamp.
export function mergeHistory(existing, history) {
	const ids = new Set();
	const keys = new Set();
	const raids = [];
	for (const msg of existing)
		markSeen(ids, keys, raids, msg);

	const fresh = [];
	for (const msg of history) {
		if (alreadySeen(ids, keys, raids, msg))
			continue;
		fresh.push(msg);
		markSeen(ids, keys, raids, msg);
	}
	fresh.sort((a, b) => messageTime(a) - messageTime(b));

	const merged = [];
	let index = 0;
	for (const live of existing) {
		const when = messageTime(live);
		while (index < fresh.length && messageTime(fresh[index]) <= when)
			merged.push(fresh[index++]);
		merged.push(live);
	}
	while (index < fresh.length)
		merged.push(fresh[index++]);
	return {merged, inserted: fresh};
}

// After the last loaded history line. Twitch's welcome notice has no history
// flag, so it stays above the block and the divider stays below it.
export function historyNoticeIndex(lines) {
	let at = -1;
	for (let i = 0; i < lines.length; i++) {
		if (lines[i] && lines[i]._fromHistory)
			at = i + 1;
	}
	return at;
}

// Index of the first newer history line after an older backfilled one.
export function backfillNoticeIndex(lines) {
	let seenBackfill = false;
	for (let i = 0; i < lines.length; i++) {
		const msg = lines[i];
		if (msg && msg._backfill)
			seenBackfill = true;
		else if (seenBackfill && msg && msg._fromHistory)
			return i;
	}
	return -1;
}

export function insertAt(lines, index, item) {
	if (index === -1)
		lines.push(item);
	else
		lines.splice(index, 0, item);
}

export function endsWithNamedParam(url) {
	return /[?&][^?&=]+=$/.test(url);
}

// A trailing named parameter, such as ?user=, takes the channel name as its
// value. A trailing / is already a separator. Anything else gets a /.
export function normalizeApiBase(raw, fallback) {
	const trimmed = String(raw || '').trim() || fallback;
	if (endsWithNamedParam(trimmed) || trimmed.endsWith('/'))
		return trimmed;
	return `${trimmed}/`;
}

export function historyUrl(base, login, params) {
	const name = encodeURIComponent(String(login).toLowerCase());
	const joiner = endsWithNamedParam(base) ? '&' : '?';
	return `${base}${name}${joiner}${params}`;
}

export function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

export function defaultUserColour(name, colours) {
	if (!name)
		return colours[0];
	const hash = name.charCodeAt(0) + name.charCodeAt(name.length - 1);
	if (!Number.isFinite(hash))
		return colours[0];
	return colours[hash % colours.length];
}

export function hiddenNotice(msg, blocked, subsShow) {
	const kind = msg && msg._noticeKind;
	if (!kind)
		return false;
	if (blocked && typeof blocked.has === 'function' && blocked.has(kind))
		return true;
	// Same gates as FFZ's live sub handlers. The line renderer still hides
	// the notice text for the other Display Subs choices.
	if (kind === 'Subscription' && subsShow < 3)
		return true;
	if (kind === 'Resubscription' && subsShow < 2 && !msg.message)
		return true;
	return false;
}

export function bufferMessages(buffer) {
	const out = [];
	if (buffer && Array.isArray(buffer.buffer))
		out.push(...buffer.buffer);
	if (buffer && Array.isArray(buffer.delayedMessageBuffer)) {
		for (const raw of buffer.delayedMessageBuffer) {
			if (raw && raw.event)
				out.push(raw.event);
		}
	}
	return out;
}

export function delayedEvent(entry) {
	return entry && entry.event ? entry.event : entry;
}
