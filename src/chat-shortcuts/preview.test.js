import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildPreview } from './preview.js';

const LOOKUP = new Map([
	['PogChamp', 'pog.png 1x'],
	['KEKW', 'kekw.png 1x'],
]);

test('buildPreview returns plain text as a single segment', () => {
	assert.deepEqual(buildPreview('good game', LOOKUP), [{ text: 'good game' }]);
});

test('buildPreview turns emote names into emote segments', () => {
	assert.deepEqual(buildPreview('PogChamp hype KEKW', LOOKUP), [
		{ emote: 'PogChamp', srcSet: 'pog.png 1x' },
		{ text: ' hype ' },
		{ emote: 'KEKW', srcSet: 'kekw.png 1x' },
	]);
});

test('buildPreview matches emote names case-sensitively', () => {
	assert.deepEqual(buildPreview('kekw', LOOKUP), [{ text: 'kekw' }]);
});

test('buildPreview does not match emote names inside other words', () => {
	assert.deepEqual(buildPreview('PogChamps', LOOKUP), [{ text: 'PogChamps' }]);
});

test('buildPreview preserves runs of whitespace', () => {
	assert.deepEqual(buildPreview('KEKW  KEKW', LOOKUP), [
		{ emote: 'KEKW', srcSet: 'kekw.png 1x' },
		{ text: '  ' },
		{ emote: 'KEKW', srcSet: 'kekw.png 1x' },
	]);
});

test('buildPreview truncates long text at a word boundary with an ellipsis', () => {
	const out = buildPreview('alpha beta gamma delta', LOOKUP, 13);
	assert.deepEqual(out, [{ text: 'alpha beta…' }]);
});

test('buildPreview never splits an emote when truncating', () => {
	const out = buildPreview('hi PogChamp PogChamp', LOOKUP, 15);
	assert.deepEqual(out, [
		{ text: 'hi ' },
		{ emote: 'PogChamp', srcSet: 'pog.png 1x' },
		{ text: '…' },
	]);
});

test('buildPreview hard-cuts a single word longer than the limit', () => {
	assert.deepEqual(buildPreview('abcdefghij', LOOKUP, 5), [{ text: 'abcd…' }]);
});

test('buildPreview works without a lookup', () => {
	assert.deepEqual(buildPreview('PogChamp', null), [{ text: 'PogChamp' }]);
});
