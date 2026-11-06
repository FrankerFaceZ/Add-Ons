// Raw recent-messages lines are IRC. These helpers do not touch FFZ.

const TAG_ESCAPES = {
	s: ' ',
	':': ';',
	'\\': '\\',
	r: '\r',
	n: '\n'
};

export function unescapeTag(value) {
	if (!value)
		return value;
	let out = '';
	for (let i = 0; i < value.length; i++) {
		if (value[i] !== '\\' || i + 1 >= value.length) {
			out += value[i];
			continue;
		}
		const next = value[++i];
		out += Object.prototype.hasOwnProperty.call(TAG_ESCAPES, next) ? TAG_ESCAPES[next] : next;
	}
	return out;
}

export function parseTags(raw) {
	const tags = {};
	if (!raw || !raw.startsWith('@'))
		return tags;
	for (const part of raw.split(';')) {
		const pieces = part.split('=');
		tags[pieces[0].replace(/^@/, '')] = unescapeTag(pieces.slice(1).join('='));
	}
	return tags;
}

// Best Logs marks lines filled in from a rustlog day with this first tag.
// Recent-messages also sets historical=1, but never as the first tag.
export function isBackfillLine(raw) {
	return String(raw || '').startsWith('@historical=1;');
}

export function trailingText(parts) {
	let text = parts.slice(4).join(' ');
	if (text[0] === ':')
		text = text.slice(1);
	return text;
}

// /me is an ACTION CTCP. Twitch's emote indexes include the SOH prefix.
export function stripAction(text) {
	if (!text)
		return {text: text || '', prefix: 0, action: false};
	if (text.charCodeAt(0) !== 1)
		return {text, prefix: 0, action: false};
	let end = text.length;
	if (text.charCodeAt(end - 1) === 1)
		end--;
	const inner = text.slice(1, end);
	if (!inner.startsWith('ACTION'))
		return {text, prefix: 0, action: false};
	const cut = inner.startsWith('ACTION ') ? 'ACTION '.length : 'ACTION'.length;
	return {text: inner.slice(cut), prefix: 1 + cut, action: true};
}

export function parseBadges(raw) {
	const badges = {};
	if (!raw)
		return badges;
	for (const entry of String(raw).split(',')) {
		const parts = entry.split('/');
		if (parts[0])
			badges[parts[0]] = parts[1];
	}
	return badges;
}

export function badgeSource(tags) {
	const sourceRoom = tags['source-room-id'];
	const taggedRoom = tags['room-id'];
	const mirrored = !!(sourceRoom && taggedRoom && sourceRoom !== taggedRoom);
	return mirrored && tags['source-badges'] ? tags['source-badges'] : tags.badges;
}

export function parseEmotes(raw, prefix) {
	const emotes = {};
	for (const piece of String(raw).split('/')) {
		const parts = piece.split(':');
		if (!parts[1])
			continue;
		for (const range of parts[1].split(',')) {
			let start = Number(range.split('-')[0]);
			if (!Number.isFinite(start))
				continue;
			start -= prefix;
			if (start < 0)
				continue;
			emotes[start] = {startIndex: start, id: parts[0]};
		}
	}
	return emotes;
}

export function parseUser(login, tags) {
	const user = {login, userLogin: login, color: tags.color || null};
	const id = tags['user-id'];
	if (id) {
		user.id = id;
		user.userID = id;
	}
	const displayName = tags['display-name'];
	if (displayName) {
		user.displayName = displayName;
		user.userDisplayName = displayName;
	}
	return user;
}

function historyEvent(type, tags, when, extra) {
	return {
		type,
		id: tags.id || undefined,
		timestamp: when,
		_fromHistory: true,
		...extra
	};
}

// CLEARCHAT with no target wipes the room. A target without ban-duration is
// a ban; ban-duration is a timeout. moderationType must be Twitch's enum.
function parseClear(parts, tags, when, types, mods) {
	const target = trailingText(parts).trim();
	if (!target)
		return historyEvent(types.Clear, tags, when);

	const duration = parseInt(tags['ban-duration'], 10);
	const timed = Number.isFinite(duration) && duration > 0;
	return historyEvent(types.Moderation, tags, when, {
		moderationType: timed ? mods.Timeout : mods.Ban,
		moderationActionType: timed ? 'timeout' : 'ban',
		userLogin: target,
		userID: tags['target-user-id'] || undefined,
		duration: timed ? duration : undefined
	});
}

// id must not be target-msg-id. That id belongs to the deleted message.
function parseClearMsg(tags, when, types, mods) {
	return historyEvent(types.Moderation, tags, when, {
		moderationType: mods.Delete,
		moderationActionType: 'delete',
		userLogin: tags.login || '',
		targetMessageID: tags['target-msg-id']
	});
}

function parseNotice(parts, tags, when, types) {
	const text = tags['system-msg'] || trailingText(parts);
	if (!text)
		return null;
	return historyEvent(types.Notice, tags, when, {message: text});
}

function attachRoom(msg, room, sourceRoom) {
	if (room) {
		msg.roomID = room.id;
		msg.roomId = room.id;
		msg.roomLogin = room.login;
		if (room.login)
			msg.channel = `#${room.login}`;
	}
	if (sourceRoom)
		msg.sourceRoomID = sourceRoom;
}

function parsePrivmsg(parts, tags, room, types) {
	const login = parts[1].split('!')[0].replace(/^:/, '');
	if (!login)
		return null;

	const action = stripAction(trailingText(parts));
	const msg = historyEvent(types.Message, tags, Number(tags['tmi-sent-ts']), {
		user: parseUser(login, tags),
		message: action.text,
		messageBody: action.text,
		_action: action.action,
		// Twitch's line renderer calls messageParts.some() for highlights.
		messageParts: [],
		badges: parseBadges(badgeSource(tags))
	});
	if (tags.emotes)
		msg.emotes = parseEmotes(tags.emotes, action.prefix);
	attachRoom(msg, room, tags['source-room-id']);
	return msg;
}

export function parseHistoryLine(rawLine, room, types, mods) {
	const parts = String(rawLine || '').replace(/\r$/, '').split(' ');
	if (parts.length < 3 || parts[2] == null)
		return null;

	const tags = parseTags(parts[0]);
	const command = parts[2];
	const when = Number(tags['tmi-sent-ts']);
	if (command === 'CLEARCHAT')
		return parseClear(parts, tags, when, types, mods);
	if (command === 'CLEARMSG')
		return parseClearMsg(tags, when, types, mods);
	if (command === 'NOTICE' || command === 'USERNOTICE')
		return parseNotice(parts, tags, when, types);
	if (command !== 'PRIVMSG' || parts.length < 4)
		return null;
	return parsePrivmsg(parts, tags, room, types);
}
