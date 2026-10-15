import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseShortcuts, findExact, findMatches, validateShortcuts, expandAt } from './matcher.js';

const LIST = parseShortcuts([
	{ name: 'gg', text: 'good game everyone' },
	{ name: 'GL', text: 'good luck' },
	{ name: 'ggwp', text: 'good game, well played' },
	{ name: 'egg', text: 'EGG EGG EGG' },
	{ name: 'hype', text: 'PogChamp PogChamp' },
]);

test('parseShortcuts trims names and drops entries with empty name or text', () => {
	const out = parseShortcuts([
		{ name: '  hi  ', text: 'hello' },
		{ name: '', text: 'orphan' },
		{ name: 'blank', text: '' },
		{ name: '   ', text: 'spaces' },
	]);
	assert.deepEqual(out, [{ name: 'hi', text: 'hello' }]);
});

test('parseShortcuts keeps the first occurrence of a duplicate name', () => {
	const out = parseShortcuts([
		{ name: 'a', text: 'first' },
		{ name: 'a', text: 'second' },
	]);
	assert.deepEqual(out, [{ name: 'a', text: 'first' }]);
});

test('parseShortcuts tolerates non-array input', () => {
	assert.deepEqual(parseShortcuts(undefined), []);
	assert.deepEqual(parseShortcuts(null), []);
	assert.deepEqual(parseShortcuts('nope'), []);
});

test('parseShortcuts rejects names containing whitespace', () => {
	assert.deepEqual(parseShortcuts([{ name: 'two words', text: 'x' }]), []);
});

test('findExact returns text for an exact name', () => {
	assert.equal(findExact(LIST, 'gg'), 'good game everyone');
});

test('findExact falls back to case-insensitive match', () => {
	assert.equal(findExact(LIST, 'gl'), 'good luck');
	assert.equal(findExact(LIST, 'GG'), 'good game everyone');
});

test('findExact prefers a case-sensitive match over a case-insensitive one', () => {
	const list = parseShortcuts([
		{ name: 'Hi', text: 'upper' },
		{ name: 'hi', text: 'lower' },
	]);
	assert.equal(findExact(list, 'hi'), 'lower');
	assert.equal(findExact(list, 'Hi'), 'upper');
});

test('findExact returns null for unknown or partial names', () => {
	assert.equal(findExact(LIST, 'g'), null);
	assert.equal(findExact(LIST, ')'), null);
	assert.equal(findExact(LIST, ''), null);
});

test('findMatches ranks exact, then prefix, then substring', () => {
	const names = findMatches(LIST, 'gg').map(m => m.name);
	assert.deepEqual(names, ['gg', 'ggwp', 'egg']);
});

test('findMatches is case-insensitive', () => {
	assert.deepEqual(findMatches(LIST, 'HY').map(m => m.name), ['hype']);
});

test('findMatches sorts alphabetically within a group', () => {
	const list = parseShortcuts([
		{ name: 'gz', text: '1' },
		{ name: 'ga', text: '2' },
		{ name: 'gm', text: '3' },
	]);
	assert.deepEqual(findMatches(list, 'g').map(m => m.name), ['ga', 'gm', 'gz']);
});

test('findMatches returns name and text', () => {
	assert.deepEqual(findMatches(LIST, 'hype'), [{ name: 'hype', text: 'PogChamp PogChamp' }]);
});

test('findMatches respects the limit', () => {
	const list = parseShortcuts(Array.from({ length: 40 }, (_, i) => ({ name: `s${i}`, text: 'x' })));
	assert.equal(findMatches(list, 's').length, 25);
	assert.equal(findMatches(list, 's', 3).length, 3);
});

test('findMatches returns nothing for an empty partial', () => {
	assert.deepEqual(findMatches(LIST, ''), []);
});

// validateShortcuts

test('validateShortcuts returns null for valid rows and fully blank rows', () => {
	assert.deepEqual(validateShortcuts([
		{ name: 'gg', text: 'good game' },
		{ name: '', text: '' },
	], ';'), [null, null]);
});

test('validateShortcuts flags missing name or text', () => {
	const out = validateShortcuts([
		{ name: '', text: 'orphan' },
		{ name: 'lonely', text: '' },
	], ';');
	assert.match(out[0], /name/i);
	assert.match(out[1], /text/i);
});

test('validateShortcuts flags names containing spaces', () => {
	assert.match(validateShortcuts([{ name: 'good game', text: 'x' }], ';')[0], /space/i);
});

test('validateShortcuts flags names that start with the prefix', () => {
	const [msg] = validateShortcuts([{ name: ';gg', text: 'x' }], ';');
	assert.match(msg, /prefix/i);
	assert.ok(msg.includes(';'));
});

test('validateShortcuts flags later duplicates, not the first', () => {
	const out = validateShortcuts([
		{ name: 'gg', text: 'first' },
		{ name: ' gg ', text: 'second' },
	], ';');
	assert.equal(out[0], null);
	assert.match(out[1], /duplicate/i);
});

test('validateShortcuts does not count invalid rows as the first occurrence', () => {
	const out = validateShortcuts([
		{ name: 'gg', text: '' },
		{ name: 'gg', text: 'real' },
	], ';');
	assert.equal(out[1], null);
});

test('validateShortcuts tolerates non-array input', () => {
	assert.deepEqual(validateShortcuts(undefined, ';'), []);
});

// expandAt

const EXPAND = parseShortcuts([{ name: 'gg', text: 'good game' }]);

test('expandAt expands the word before the caret and adds a space', () => {
	assert.deepEqual(expandAt(';gg', 3, ';', EXPAND, true), { value: 'good game ', caret: 10 });
});

test('expandAt without addSpace does not add a space', () => {
	assert.deepEqual(expandAt(';gg', 3, ';', EXPAND, false), { value: 'good game', caret: 9 });
});

test('expandAt expands mid-message and keeps the rest of the text', () => {
	assert.deepEqual(expandAt('hi ;gg there', 6, ';', EXPAND, false), { value: 'hi good game there', caret: 12 });
});

test('expandAt reuses existing whitespace after the caret instead of adding more', () => {
	assert.deepEqual(expandAt('hi ;gg there', 6, ';', EXPAND, true), { value: 'hi good game there', caret: 13 });
});

test('expandAt returns null for unknown names, bare prefix, or no prefix', () => {
	assert.equal(expandAt(';nope', 5, ';', EXPAND, true), null);
	assert.equal(expandAt(';', 1, ';', EXPAND, true), null);
	assert.equal(expandAt('gg', 2, ';', EXPAND, true), null);
	assert.equal(expandAt('', 0, ';', EXPAND, true), null);
});

test('expandAt only looks at the word ending at the caret', () => {
	assert.equal(expandAt(';gg x', 5, ';', EXPAND, true), null);
});

test('expandAt supports multi-character prefixes', () => {
	assert.deepEqual(expandAt('!!gg', 4, '!!', EXPAND, false), { value: 'good game', caret: 9 });
});
