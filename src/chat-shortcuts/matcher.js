// Pure shortcut matching. No FFZ / DOM dependencies so it can be unit tested with node.

export const DEFAULT_LIMIT = 25;

export function parseShortcuts(list) {
	if ( ! Array.isArray(list) )
		return [];

	const seen = new Set,
		out = [];

	for(const entry of list) {
		const name = typeof entry?.name === 'string' ? entry.name.trim() : '',
			text = typeof entry?.text === 'string' ? entry.text : '';

		if ( ! name || ! text || /\s/.test(name) || seen.has(name) )
			continue;

		seen.add(name);
		out.push({ name, text });
	}

	return out;
}

export function findExact(shortcuts, name) {
	if ( ! name )
		return null;

	const exact = shortcuts.find(s => s.name === name);
	if ( exact )
		return exact.text;

	const lower = name.toLowerCase(),
		loose = shortcuts.find(s => s.name.toLowerCase() === lower);

	return loose ? loose.text : null;
}

export function findMatches(shortcuts, partial, limit = DEFAULT_LIMIT) {
	if ( ! partial )
		return [];

	const term = partial.toLowerCase(),
		groups = [[], [], []];

	for(const s of shortcuts) {
		const name = s.name.toLowerCase();
		if ( name === term )
			groups[0].push(s);
		else if ( name.startsWith(term) )
			groups[1].push(s);
		else if ( name.includes(term) )
			groups[2].push(s);
	}

	const byName = (a, b) => a.name.localeCompare(b.name);

	return groups
		.flatMap(group => group.sort(byName))
		.slice(0, limit)
		.map(({ name, text }) => ({ name, text }));
}
