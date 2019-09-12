'use strict';

/* global module */

const out = module.exports = {},
	context = require.context('./columns', true, /\.js$/);

for(const key of context.keys())
	out[key.slice(2, -3)] = context(key).default;

Object.freeze(out);