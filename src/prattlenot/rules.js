'use strict';

const {has} = FrankerFaceZ.utilities.object;

import levenshtein from 'js-levenshtein';
import MD5 from 'spark-md5';

const SPACE = /^\s*$/;

let UPPERCASE_REGEX;
let NON_ALPHANUMERIC;
let NON_NUMERIC_ONE;
let NON_NUMERIC_MULTI;

try {
	UPPERCASE_REGEX = /\p{Lu}/gu;
	NON_ALPHANUMERIC = /[^\p{Letter}\p{Number}]/gu;

	NON_NUMERIC_ONE = /([^\p{Number}])\1+/gui;
	NON_NUMERIC_MULTI = /([^\p{Number}]{2,3})\1+/gui;

} catch {
	UPPERCASE_REGEX = /[A-Z]/g;
	NON_ALPHANUMERIC = /[^0-9a-z ]/g;

	NON_NUMERIC_ONE = /([^0-9])\1+/gi;
	NON_NUMERIC_MULTI = /([^0-9]{2,3})\1+/gi;
}

function saniText(ctx) {
	if ( ctx._sanitext )
		return ctx._sanitext;

	return ctx._sanitext = ctx.text
		.toLowerCase() // lower-case
		.replace(NON_ALPHANUMERIC, '') // strip all non alphanumeric characters
		.replace(NON_NUMERIC_ONE, '$1') // remove duplicate 1-character sequences
		.replace(NON_NUMERIC_MULTI, '$1'); // remove duplicate 2 or 3-character sequences
}


export const cheer = {
	title: 'Cheering',
	i18n: 'addon.prattlenot.filter.cheer',

	about: 'This rule matches messages that contain a cheer with at least a minimum amount of bits.',

	default: () => ({
		score: -100,
		critical: false,
		min_bits: 1
	}),
	editor: () => import('./components/cheer.vue'),

	createTest(config) {
		const score = config.score ?? -100,
			critical = config.critical ?? false,
			min_bits = config.min_bits ?? 1;

		if ( score == 0 && ! critical )
			return;

		return ctx => {
			const bits = ctx.source.bits ?? 0;
			if (bits >= min_bits) {
				ctx.score += score;
				if ( ctx.reasons )
					ctx.reasons.push('cheer');
				if ( critical )
					return false;
			}

			return ctx.score < ctx.threshold;
		}
	}
}


function getBadgeIDs(msg) {
	let keys = msg.badges ? Object.keys(msg.badges) : null;
	if ( ! msg.ffz_badges )
		return keys;

	if ( ! keys )
		keys = [];

	for(const badge of msg.ffz_badges)
		if ( badge?.id )
			keys.push(badge.id);

	return keys;
}


export const badges = {
	title: 'Badge',
	i18n: 'addon.prattlenot.filter.badge',

	about: 'This rule matches messages sent by a user with a specific badge.',

	default: () => ({
		score: -10,
		critical: false,
		badges: []
	}),

	editor: () => import('./components/badges.vue'),

	createTest(config) {
		const score = config.score ?? -10,
			critical = config.critical ?? false,
			badges = config.badges;

		if ( ! Array.isArray(badges) || ! badges.length || (score == 0 && ! critical) )
			return;

		return ctx => {
			let matched = false;

			const source_badges = getBadgeIDs(ctx.source);

			for(const badge of badges) {
				if ( has(source_badges, badge) ) {
					matched = true;
					break;
				}
			}

			if ( matched ) {
				ctx.score += score;
				if ( ctx.reasons )
					ctx.reasons.push('badge');
				if ( critical )
					return false;
			}

			return ctx.score < ctx.threshold;
		}
	}
}


export const repeated_message = {
	title: 'Repeated Message',
	i18n: 'addon.prattlenot.filter.repeated_message',

	about: `This rule matches messages that were already seen, using two methods.

First, the message text is sanitized. Then, the MD5 hash of the sanitized text is checked
against a list of existing message hashes. PrattleNot will remember the last "Hash Storage
Size" messages.

Second, assuming the hash doesn't match, the [levenshtein distance](https://en.wikipedia.org/wiki/Levenshtein_distance)
of the message is checked against the previous "Levenshtein Storage Size" messages. If the
distance is within the threshold, the message will be flagged.`,

	default: () => ({
		score: 100,
		critical: false,
		hash_count: 50,
		leven_count: 100,
		leven_score: 0.3
	}),
	editor: () => import('./components/repeated_message.vue'),

	createTest(config) {
		const score = config.score ?? 100,
			critical = config.critical ?? false,
			hash_count = config.hash_count ?? 50,
			leven_count = config.leven_count ?? 100,
			leven_score = config.leven_score ?? 0.3,

			use_hash = hash_count > 0,
			use_leven = leven_count > 0 && leven_score < 1;

		if ( (score == 0 && ! critical) || (! use_hash && ! use_leven) )
			return;

		const hashes = use_hash ? [] : null;
		const list = use_leven ? [] : null;

		return ctx => {
			const text = saniText(ctx),
				length = text.length;

			let matched = false;

			if ( use_hash ) {
				const hash = MD5.hashBinary(text, true),
					idx = hashes.indexOf(hash);

				if ( idx !== -1 ) {
					hashes.splice(idx, 1);
					hashes.unshift(hash);
					matched = true;
				} else {
					hashes.unshift(hash);
					if ( hashes.length > hash_count )
						hashes.splice(-1, hashes.length - hash_count);
				}
			}

			if ( ! matched && use_leven && length >= 35 ) {
				for(let i=0; i < list.length; i++) {
					const entry = list[i],
						match = levenshtein(text, entry) / length;

					if ( match < leven_score ) {
						matched = true;
						list.splice(i, 1);
						list.unshift(text);
						break;
					}
				}

				if ( ! matched ) {
					list.unshift(text);
					if ( list.length > leven_count )
						list.splice(-1, list.length - leven_count);
				}
			}

			if ( matched ) {
				ctx.score += score;
				if ( ctx.reasons )
					ctx.reasons.push('repeated');
				if ( critical )
					return false;
			}

			return ctx.score <= ctx.threshold;
		}
	}
}


function findSingleChars(str) {
	let last = -1, idx, i = 0;
	while ((idx = str.indexOf(' ', last + 1)) !== -1) {
		if ( last + 2 === idx )
			i++;
		last = idx;
	}

	if ( last !== -1 && last + 2 === str.length )
		i++;

	return i;
}

export const splitting = {
	title: 'Too Many Single Characters',
	i18n: 'addon.prattlenot.filter.splitting',

	about: 'This rule matches messages that have too many single characters.',

	default: () => ({
		score: 10,
		critical: false,
		limit: 5
	}),
	editor: () => import('./components/splitting.vue'),

	createTest(config) {
		const score = config.score ?? 10,
			critical = config.critical ?? false,
			limit = config.limit ?? 5;

		if ( score == 0 && ! critical )
			return;

		return ctx => {
			const text = ctx.text;
			if ( ! text )
				return true;

			const found = findSingleChars(Array.from(text));
			if ( found > limit ) {
				ctx.score += score;
				if ( ctx.reasons )
					ctx.reasons.push(`split:${found}`);
				if ( critical )
					return false;
			}

			return ctx.score <= ctx.threshold;
		}
	}
}


export const repeated_words = {
	title: 'Repeated Words',
	i18n: 'addon.prattlenot.filter.repeated_words',

	about: 'This rule matches messages that have too many repeated words. The score is adjusted based on the number of repeated words found in the message.',

	default: () => ({
		score: 3,
		critical: false
	}),
	editor: () => import('./components/basic.vue'),

	createTest(config) {
		const score = config.score ?? 3,
			critical = config.critical ?? false;

		if ( score == 0 && ! critical )
			return;

		return ctx => {
			const text = ctx.text;
			if ( ! text )
				return true;

			const bits = text.toLowerCase().split(/ +/g),
				words = {};

			for(let i=0; i < bits.length; i++) {
				const bit = bits[i];
				if ( bit )
					(words[bit] || (words[bit] = [])).push(i);
			}

			let l = 0;

			for(const [word, indices] of Object.entries(words)) {
				if ( indices.length > 1 )
					for(const idx of indices)
						bits[idx] = '';

				if ( indices.length > 2 && word.length > 2 )
					l += indices.length;
			}

			const out = bits.join(' ').replace(/  +/g, ' ').trim();
			let s;
			if ( ! out )
				s = score * 10;
			else if ( out.length > 40 && l < 10 || out.length > 100 && l < 20 || out.length > 150 && l < 30 )
				s = 0;
			else
				s = score * Math.max(0, l - 1);

			if ( s ) {
				ctx.score += score;
				if ( ctx.reasons )
					ctx.reasons.push('rep-words');
				if ( critical )
					return false;
			}

			return ctx.score <= ctx.threshold;
		}
	}
}


export const emote_only = {
	title: 'Emote Only / Too Many Emotes',
	i18n: 'addon.prattlenot.filter.emote_only',

	about: 'This rule matches messages that only contain emotes, or that contain too many emotes.',

	default: () => ({
		score: 100,
		critical: false,
		max_emotes: 5
	}),
	editor: () => import('./components/emote_only.vue'),

	createTest(config) {
		const max_emotes = config.max_emotes ?? 5,
			score = config.score ?? 100,
			critical = config.critical ?? false;

		if ( score == 0 && ! critical )
			return;

		return ctx => {
			let emotes = 0, non = 0;
			for(const token of ctx.tokens) {
				if ( token.type === 'emote' || token.type === 'emoji' )
					emotes++;
				else if ( ! token.text || ! SPACE.test(token.text) )
					non++;
			}

			if ( emotes > max_emotes || ! non ) {
				ctx.score += score;
				if ( ctx.reasons )
					ctx.reasons.push(`emotes:${emotes}-${non}`);
				if ( critical )
					return false;
			}

			return ctx.score <= ctx.threshold;
		}
	}
}


export const uppercase = {
	title: 'Too Much Uppercase',
	i18n: 'addon.prattlenot.uppercase',

	about: 'This rule matches messages that contain too many uppercase characters compared to other characters.',

	default: () => ({
		score: 10,
		critical: false,
		threshold: 0.3
	}),
	editor: () => import('./components/uppercase.vue'),

	createTest(config) {
		const threshold = config.threshold || 0.3,
			score = config.score ?? 10,
			critical = config.critical ?? false;

		if ( (score == 0 && ! critical) || ! threshold )
			return;

		return ctx => {
			const text = ctx.text;
			if ( text.length > 3 ) {
				const match = text.match(UPPERCASE_REGEX),
					value = match ? match.length / text.length : 0;

				if ( value > threshold ) {
					ctx.score += score;
					if ( ctx.reasons )
						ctx.reasons.push(`uppercase:${Math.round(value*100)}`);
					if ( critical )
						return false;
				}
			}

			return ctx.score <= ctx.threshold;
		}
	}
}


// TODO: Figure out how to make this less stupid.
// Maybe a minimum word filter?
export const spam = {
	title: 'Spammy',
	i18n: 'addon.prattlenot.filter.spam',

	about: 'This filter matches short messages with few words.',

	default: () => ({
		score: 20,
		critical: false
	}),
	editor: () => import('./components/basic.vue'),

	createTest(config) {
		const score = config.score ?? 20,
			critical = config.critical ?? false;

		if ( score == 0 && ! critical )
			return;

		return ctx => {
			const text = ctx.text;
			if ( ! text )
				return true;

			let triggered = false;
			if ( text.length < 3 ) {
				triggered = true;
			} else {
				const replaced = text
					.replace(NON_NUMERIC_MULTI, '$1');
				if ( /([^ ]{3,} [^ ]{3,} [^ ]{3,})/i.test(replaced) )
					return true;

				const space = replaced.length < 15 ? false : replaced.match(/ /g);
				if ( ! space || space.length < 3 )
					triggered = true;
			}

			if ( triggered ) {
				ctx.score += score;
				if ( ctx.reasons )
					ctx.reasons.push('spam');
				if ( critical )
					return false;
			}

			return ctx.score <= ctx.threshold;
		}
	}
}

// TODO: Clean this up so we can support other languages
// than just latin character set.
export const unicode = {
	title: 'Too Much Unicode',
	i18n: 'addon.prattlenot.filter.unicode',

	about: 'This filter matches messages that contain too many non-matching unicode characters compared to matching characters.',

	default: () => ({
		score: 3,
		critical: false,
		threshold: 0.3,
		terms: [
			{t: 'cat', v: 'Letter'},
			{t: 'cat', v: 'Number'},
			{t: 'cat', v: 'Punctuation'},
			{t: 'cat', v: 'Separator'}
		]
	}),
	editor: () => import('./components/unicode.vue'),

	default_terms: [
		{t: 'cat', v: 'Letter'},
		{t: 'cat', v: 'Number'},
		{t: 'cat', v: 'Punctuation'},
		{t: 'cat', v: 'Separator'}
	],

	createTest(config) {
		const threshold = config.threshold || 0.3,
			score = config.score ?? 3,
			terms = config.terms ?? unicode.default_terms,
			critical = config.critical ?? false;

		if ( (score == 0 && ! critical) || ! threshold || ! Array.isArray(terms) || ! terms.length )
			return;

		const bits = [];
		for(const term of terms) {
			if ( term.t === 'cat' )
				bits.push(`\\p{${term.v}}`);
			else if ( term.t === 'script' )
				bits.push(`\\p{Script=${term.v}}`);
			else if ( term.t === 'scr-ext' )
				bits.push(`\\p{Script_Extension=${term.v}}`);
			else if ( term.t === 'raw' )
				bits.push(term.v);
		}

		if ( ! bits.length )
			return;

		let regex;
		try {
			regex = new RegExp(`[^${bits.join('')}]`, 'gu');
		} catch {
			return;
		}

		return ctx => {
			const text = ctx.text;
			if ( ! text )
				return true;

			const chars = (text.match(regex) || []).length,
				value = chars / text.length;

			if ( value > threshold ) {
				ctx.score += score * chars;
				if ( ctx.reasons )
					ctx.reasons.push(`unicode:${Math.round(value*100)}`);
				if ( critical )
					return false;
			}

			return ctx.score <= ctx.threshold;
		}
	}
}