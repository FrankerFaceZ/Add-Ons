import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseShortcuts, findExact, findMatches } from './matcher.js';

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
