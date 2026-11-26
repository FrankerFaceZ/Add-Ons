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

// Per-row problems for the settings editor: null for a valid (or fully blank) row,
// otherwise a short message. Mirrors what parseShortcuts() will skip.
export function validateShortcuts(list, prefix) {
	if ( ! Array.isArray(list) )
		return [];

	const seen = new Set;

	return list.map(entry => {
		const name = typeof entry?.name === 'string' ? entry.name.trim() : '',
			text = typeof entry?.text === 'string' ? entry.text : '';

		if ( ! name && ! text )
			return null;
		if ( ! name )
			return 'Missing name.';
		if ( ! text )
			return 'Missing text.';
		if ( /\s/.test(name) )
			return 'Names can\'t contain spaces.';
		if ( seen.has(name) )
			return 'Duplicate name — the earlier one is used.';

		seen.add(name);

		if ( prefix && name.startsWith(prefix) )
			return `Don't include the prefix "${prefix}" in the name — this would need ${prefix}${name}.`;

		return null;
	});
}

// Expand the shortcut word ending at `caret`. Returns {value, caret} or null.
// With addSpace, a space follows the expansion unless one is already there, in
// which case the caret moves past it.
export function expandAt(value, caret, prefix, shortcuts, addSpace) {
	if ( typeof value !== 'string' || ! prefix )
		return null;

	const before = value.slice(0, caret),
		after = value.slice(caret),
		word = /\S+$/.exec(before);

	if ( ! word || ! word[0].startsWith(prefix) )
		return null;

	const text = findExact(shortcuts, word[0].slice(prefix.length));
	if ( text == null )
		return null;

	const head = before.slice(0, word.index) + text;

	if ( ! addSpace )
		return { value: head + after, caret: head.length };

	if ( /^\s/.test(after) )
		return { value: head + after, caret: head.length + 1 };

	return { value: `${head} ${after}`, caret: head.length + 1 };
}
