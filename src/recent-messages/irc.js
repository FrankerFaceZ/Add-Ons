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

function tagInt(tags, key) {
	const value = parseInt(tags[key], 10);
	return Number.isFinite(value) ? value : 0;
}

function subPlan(tags) {
	const plan = tags['msg-param-sub-plan'] || '';
	return {
		plan,
		prime: plan === 'Prime',
		planName: tags['msg-param-sub-plan-name'] || ''
	};
}

function multiMonth(tags) {
	const count = tagInt(tags, 'msg-param-multimonth-duration');
	if (!count)
		return null;
	return {count, tenure: tagInt(tags, 'msg-param-multimonth-tenure')};
}

function isAnonGifter(tags, msgId) {
	return msgId.startsWith('anon') || tags.login === 'ananonymousgifter';
}

function blankMessage(msg) {
	msg.message = '';
	msg.messageBody = '';
	msg._action = false;
	delete msg.emotes;
	return msg;
}

// USERNOTICE is sent by tmi.twitch.tv. The person is the login tag.
function chatLine(parts, tags, when, room, types, extra) {
	const login = tags.login || tags['msg-param-login'];
	if (!login)
		return null;

	const action = stripAction(trailingText(parts));
	const user = parseUser(login, tags);
	if (!user.displayName && tags['msg-param-displayName']) {
		user.displayName = tags['msg-param-displayName'];
		user.userDisplayName = tags['msg-param-displayName'];
	}

	const msg = historyEvent(types.Message, tags, when, {
		user,
		message: action.text,
		messageBody: action.text,
		_action: action.action,
		messageParts: [],
		badges: parseBadges(badgeSource(tags)),
		...extra
	});
	if (tags.emotes)
		msg.emotes = parseEmotes(tags.emotes, action.prefix);
	attachRoom(msg, room, tags['source-room-id']);
	return msg;
}

function subRecipient(tags) {
	const login = tags['msg-param-recipient-user-name'] || '';
	return {
		id: tags['msg-param-recipient-id'],
		login,
		displayName: tags['msg-param-recipient-display-name'] || login
	};
}

// FFZ draws these itself. _noticeKind is the blocked-types name it checks.
function parseUserNotice(parts, tags, when, room, types) {
	const id = tags['msg-id'] || '';

	if (id === 'announcement') {
		return chatLine(parts, tags, when, room, types, {
			ffz_type: 'announcement',
			announcement_color: tags['msg-param-color'] || 'PRIMARY',
			_noticeKind: 'AnnouncementMessage'
		});
	}

	if (id === 'sub' || id === 'resub') {
		const msg = chatLine(parts, tags, when, room, types, {
			ffz_type: 'resub',
			sub_plan: subPlan(tags),
			sub_months: tagInt(tags, 'msg-param-months') || (id === 'sub' ? 1 : 0),
			sub_cumulative: tagInt(tags, 'msg-param-cumulative-months'),
			sub_streak: tagInt(tags, 'msg-param-streak-months'),
			sub_share_streak: tags['msg-param-should-share-streak'] === '1',
			sub_multi: multiMonth(tags),
			_noticeKind: id === 'sub' ? 'Subscription' : 'Resubscription'
		});
		// A new sub has no user message. FFZ clears the body.
		if (msg && id === 'sub')
			blankMessage(msg);
		return msg;
	}

	if (id === 'subgift' || id === 'anonsubgift') {
		const anon = isAnonGifter(tags, id);
		const msg = chatLine(parts, tags, when, room, types, {
			ffz_type: 'sub_gift',
			sub_anon: anon,
			sub_plan: subPlan(tags),
			sub_months: tagInt(tags, 'msg-param-gift-months') || 1,
			sub_total: tagInt(tags, 'msg-param-sender-count'),
			sub_recipient: subRecipient(tags),
			_noticeKind: anon ? 'AnonSubGift' : 'SubGift'
		});
		if (msg)
			blankMessage(msg);
		return msg;
	}

	if (id === 'submysterygift' || id === 'anonsubmysterygift') {
		const anon = isAnonGifter(tags, id);
		const msg = chatLine(parts, tags, when, room, types, {
			ffz_type: 'sub_mystery',
			sub_anon: anon,
			// The mystery renderer reads the plan string, not the plan object.
			sub_plan: tags['msg-param-sub-plan'] || '',
			sub_count: tagInt(tags, 'msg-param-mass-gift-count'),
			sub_total: tagInt(tags, 'msg-param-sender-count'),
			_noticeKind: anon ? 'AnonSubMysteryGift' : 'SubMysteryGift'
		});
		if (msg)
			blankMessage(msg);
		return msg;
	}

	if (id === 'raid') {
		const msg = chatLine(parts, tags, when, room, types, {
			ffz_type: 'raid_notice',
			raid_viewer_count: tagInt(tags, 'msg-param-viewerCount'),
			_noticeKind: 'Raid'
		});
		if (msg)
			blankMessage(msg);
		return msg;
	}

	if (id === 'ritual') {
		return chatLine(parts, tags, when, room, types, {
			ffz_type: 'ritual',
			ritual: tags['msg-param-ritual-name'] || '',
			_noticeKind: 'Ritual'
		});
	}

	if (id === 'viewermilestone') {
		const msg = chatLine(parts, tags, when, room, types, {
			ffz_type: 'watch_streak',
			watch_streak: tagInt(tags, 'msg-param-value'),
			copo_reward: tagInt(tags, 'msg-param-copoReward'),
			_noticeKind: 'ViewerMilestone'
		});
		if (msg && !msg.message)
			msg.ffz_no_actions = true;
		return msg;
	}

	// Paid upgrades, bits badges, modiversaries, raids ending, and shared-chat
	// notices have no FFZ line type. Twitch shows system-msg, so we do too.
	return parseNotice(parts, tags, when, types);
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
	if (command === 'USERNOTICE')
		return parseUserNotice(parts, tags, when, room, types);
	if (command === 'NOTICE')
		return parseNotice(parts, tags, when, types);
	if (command !== 'PRIVMSG' || parts.length < 4)
		return null;
	return parsePrivmsg(parts, tags, room, types);
}
