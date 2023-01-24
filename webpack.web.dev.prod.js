/* global module __dirname */

const { merge } = require('webpack-merge');
const dev = require('./webpack.web.dev.js');

module.exports = merge(dev, {
	mode: 'production',
});
