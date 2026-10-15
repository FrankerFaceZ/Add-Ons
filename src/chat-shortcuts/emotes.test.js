import { test } from 'node:test';
import assert from 'node:assert/strict';

import { emoteMatchType, findEmotes, buildEmoteIndex, emoteQuery, MATCH } from './emotes.js';

const e = (token, extra = {}) => ({ token, srcSet: `${token}.png 1x`, source: 'ffz', ...extra });

// emoteMatchType — mirrors FFZ's doesEmoteMatchTerm

test('emoteMatchType ranks exact-case prefix highest', () => {
	assert.equal(emoteMatchType('Kappa', 'Kap'), MATCH.EXACT_PREFIX);
});

test('emoteMatchType detects case-insensitive prefix', () => {
	assert.equal(emoteMatchType('Kappa', 'kap'), MATCH.CASE_INSENSITIVE_PREFIX);
});

test('emoteMatchType detects non-prefix (capitalised word) matches', () => {
	assert.equal(emoteMatchType('cohhSip', 'sip'), MATCH.NON_PREFIX);
});

test('emoteMatchType detects plain substring matches', () => {
	assert.equal(emoteMatchType('Gossip', 'sip'), MATCH.ANY);
});

test('emoteMatchType returns NONE when unrelated', () => {
	assert.equal(emoteMatchType('Kappa', 'xyz'), MATCH.NONE);
});

// findEmotes

const ENTRIES = [e('Gossip'), e('cohhSip'), e('sipTea'), e('SipBig'), e('Kappa')];

test('findEmotes with matching 1 includes substring matches', () => {
	assert.deepEqual(findEmotes(ENTRIES, 'sip').map(x => x.token).sort(), ['Gossip', 'SipBig', 'cohhSip', 'sipTea'].sort());
});

test('findEmotes with matching 2 excludes plain substring matches', () => {
	const names = findEmotes(ENTRIES, 'sip', { matching: 2 }).map(x => x.token);
	assert.ok(! names.includes('Gossip'));
	assert.ok(names.includes('cohhSip'));
});

test('findEmotes with matching 3 keeps only prefix matches', () => {
	assert.deepEqual(findEmotes(ENTRIES, 'sip', { matching: 3 }).map(x => x.token).sort(), ['SipBig', 'sipTea']);
});

test('findEmotes prioritizePrefix orders exact prefix, then case-insensitive prefix, then alphabetical', () => {
	const names = findEmotes(ENTRIES, 'sip', { prioritizePrefix: true }).map(x => x.token);
	assert.deepEqual(names, ['sipTea', 'SipBig', 'cohhSip', 'Gossip']);
});

test('findEmotes preferFavorites puts favorites first', () => {
	const list = [e('KappaA'), e('KappaB', { favorite: true })];
	assert.deepEqual(findEmotes(list, 'Kap', { preferFavorites: true }).map(x => x.token), ['KappaB', 'KappaA']);
});

test('findEmotes applies the limit', () => {
	const list = Array.from({ length: 30 }, (_, i) => e(`Pog${i}`));
	assert.equal(findEmotes(list, 'Pog', { limit: 25 }).length, 25);
	assert.equal(findEmotes(list, 'Pog').length, 30);
});

test('findEmotes returns nothing for an empty term', () => {
	assert.deepEqual(findEmotes(ENTRIES, ''), []);
});

// buildEmoteIndex

test('buildEmoteIndex merges caches with the first cache winning name clashes', () => {
	const twitch = { emotes: [e('Kappa', { source: 'twitch-global' })] },
		ffz = { emotes: [e('Kappa', { source: 'ffz', srcSet: 'other.png 1x' }), e('KEKW')] };

	const { entries, lookup } = buildEmoteIndex([twitch, ffz]);
	assert.deepEqual(entries.map(x => x.token), ['Kappa', 'KEKW']);
	assert.equal(entries[0].source, 'twitch-global');
	assert.equal(lookup.get('Kappa'), 'Kappa.png 1x');
	assert.equal(lookup.get('KEKW'), 'KEKW.png 1x');
});

test('buildEmoteIndex skips missing caches and entries without a token or image', () => {
	const { entries } = buildEmoteIndex([null, { emotes: [{ token: 'x' }, { srcSet: 'y' }, e('ok')] }]);
	assert.deepEqual(entries.map(x => x.token), ['ok']);
});

// emoteQuery

test('emoteQuery finds a colon term before the caret', () => {
	assert.deepEqual(emoteQuery('hi :kek', 7), { start: 3, term: 'kek' });
});

test('emoteQuery needs at least two characters after the colon', () => {
	assert.equal(emoteQuery(':k', 2), null);
	assert.deepEqual(emoteQuery(':ke', 3), { start: 0, term: 'ke' });
});

test('emoteQuery ignores bare words unless no-colon tab completion applies', () => {
	assert.equal(emoteQuery('hi kek', 6), null);
	assert.equal(emoteQuery('hi kek', 6, { withoutColon: true }), null);
	assert.deepEqual(emoteQuery('hi kek', 6, { withoutColon: true, pressedTab: true }), { start: 3, term: 'kek' });
});

test('emoteQuery only considers the word ending at the caret', () => {
	assert.equal(emoteQuery(':kek x', 6), null);
});
