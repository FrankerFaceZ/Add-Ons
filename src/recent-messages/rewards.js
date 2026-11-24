// Highlighted message rewards. The chat site is passed in. This file does not inject FFZ.

const rewardMapsByRoom = new Map();

export function isHighlightReward(reward) {
	return !!reward
		&& reward.__typename === 'CommunityPointsAutomaticReward'
		&& reward.type === 'SEND_HIGHLIGHTED_MESSAGE';
}

// The number FFZ formats next to "Highlight My Message". Null when that
// format would not be a finite number.
export function highlightRewardCost(reward) {
	if (!isHighlightReward(reward))
		return null;
	const bits = reward.pricingType === 'BITS';
	const raw = bits
		? (reward.bitsCost || reward.defaultBitsCost)
		: (reward.cost || reward.defaultCost);
	const cost = Number(raw);
	return Number.isFinite(cost) ? cost : null;
}

// siteChat is called the first time this room has a highlighted line.
export function attachHighlightedReward(msg, room, siteChat) {
	if (!msg || !msg.ffz_reward_highlight || msg.ffz_reward)
		return;
	let reward = null;
	try {
		reward = highlightedReward(cachedRewardMaps(room, siteChat), room, msg._customRewardId);
	} catch {
		/* a failed lookup still gets the unknown-cost reward below */
	}
	// FFZ formats a missing cost as NaN. -1 stays finite and reads as unknown.
	// The live reward-map object is left unchanged.
	if (highlightRewardCost(reward) === null) {
		reward = {
			__typename: 'CommunityPointsAutomaticReward',
			type: 'SEND_HIGHLIGHTED_MESSAGE',
			cost: -1
		};
	}
	msg.ffz_reward = reward;
}

function cachedRewardMaps(room, siteChat) {
	const key = rewardMapCacheKey(room);
	if (rewardMapsByRoom.has(key))
		return rewardMapsByRoom.get(key);
	let maps = [];
	try {
		maps = rewardMapsFor(siteChat, room);
	} catch {
		/* later highlighted lines reuse this empty read */
	}
	rewardMapsByRoom.set(key, maps);
	return maps;
}

function highlightedReward(maps, room, rewardId) {
	const id = roomId(room);
	const automaticKey = id ? `${id}:SEND_HIGHLIGHTED_MESSAGE` : '';
	for (const map of maps || []) {
		const candidates = [
			rewardMapGet(map, rewardId),
			rewardMapGet(map, automaticKey),
			...rewardMapValues(map)
		];
		for (const reward of candidates) {
			if (isHighlightReward(reward))
				return reward;
		}
	}
	return null;
}

function rewardMapsFor(siteChat, room) {
	const site = typeof siteChat === 'function' ? siteChat() : null;
	if (!site)
		return [];
	const maps = [];
	const groups = [
		site.ChatService && site.ChatService.instances,
		site.ChatRewardEventHandler && site.ChatRewardEventHandler.instances
	];
	for (const group of groups) {
		for (const inst of group || []) {
			const props = inst && inst.props;
			if (!props || !props.rewardMap || !propsMatchRoom(props, room))
				continue;
			maps.push(props.rewardMap);
		}
	}
	return maps;
}

function rewardMapCacheKey(room) {
	return roomId(room) || roomLogin(room);
}

function roomId(room) {
	return room && room.id != null ? String(room.id) : '';
}

function roomLogin(room) {
	return String(room && room.login || '').toLowerCase();
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

function rewardMapGet(map, key) {
	if (!map || !key)
		return null;
	try {
		if (typeof map.get === 'function') {
			const value = map.get(key);
			if (value)
				return value;
		}
	} catch {
		/* unreadable reward map */
	}
	if (Object.prototype.hasOwnProperty.call(map, key))
		return map[key];
	return null;
}

function rewardMapValues(map) {
	if (!map || typeof map !== 'object')
		return [];
	// A reward stored under the key "values" is not a map iterator.
	if (typeof map.get === 'function' && typeof map.values === 'function') {
		try {
			return Array.from(map.values());
		} catch {
			/* unreadable reward map */
		}
	}
	return Object.values(map);
}
