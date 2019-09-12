/* global module __dirname */

const path = require('path');
const glob = require('glob');
const fs = require('fs');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const ManifestPlugin = require('webpack-manifest-plugin');
const {
	DefinePlugin
} = require('webpack');

const StringReplacePlugin = require('string-replace-webpack-plugin');
const VueLoaderPlugin = require('vue-loader/lib/plugin');

const getFolderName = file => path.basename(path.dirname(file));

const config = {
	mode: 'production',
	devtool: 'source-map',

	entry: glob.sync('./src/**/index.{js,jsx}').reduce((entries, entry) => Object.assign(entries, {
		[`${getFolderName(entry)}/script`]: entry
	}), {}),
	externals: [
		function(context, request, callback) {
			if ( request === 'vue' )
				return callback(null, 'root ffzVue');
			callback();
		}
	],
	output: {
		publicPath: '//cdn.frankerfacez.com/static/addons/',
		path: path.resolve(__dirname, 'dist/addons'),
		filename: '[name].[hash].js',
		jsonpFunction: 'ffzAddonsWebpackJsonp'
	},

	plugins: [
		new VueLoaderPlugin(),
		new CleanWebpackPlugin(),
		new DefinePlugin({
			Addon: 'FrankerFaceZ.utilities.addon.Addon',
		}),
		new ManifestPlugin({
			serialize: thing => JSON.stringify(thing),
			filter: data => ! data.name.endsWith('.map'),
			basePath: 'addons/',
			publicPath: 'addons/'
		}),
		new ManifestPlugin({
			fileName: path.resolve(__dirname, 'dist', 'addons.json'),
			serialize: thing => JSON.stringify(thing, null, '\t'),
			generate: () => {
				const addons = [];
				for (const manifest of glob.sync('./src/**/manifest.json')) {
					const json = JSON.parse(fs.readFileSync(manifest));
					if (!json.enabled) continue;
					delete json.enabled;

					json.id = getFolderName(manifest);
					addons.push(json);
				}
				return addons;
			}
		}),
		new StringReplacePlugin()
	],

	module: {
		rules: [{
			test: /index\.jsx?$/,
			exclude: /node_modules/,
			loader: StringReplacePlugin.replace({
				replacements: [{
					pattern: /\.register\(\);/ig,
					replacement() {
						const folder = path.dirname(this._module.rawRequest).substring(6);
						const modString = `.register('${folder}');`;
						return modString;
					}
				}]
			})
		},
		{
			test: /\.jsx?$/,
			exclude: /node_modules/,
			loader: StringReplacePlugin.replace({
				replacements: [{
					pattern: /import\('\.\/(.*)\.(.*)'\)/ig,
					replacement(match, fileName, extension) {
						const folder = path.dirname(this._module.rawRequest).substring(6);
						const modString = `import(/* webpackChunkName: "${folder}/${extension}" */ './${fileName}.${extension}')`;
						return modString;
					}
				}]
			})
		},
		{
			test: /\.jsx?$/,
			exclude: /node_modules/,
			loader: 'babel-loader'
		},
		{
			test: /\.(graphql|gql)$/,
			exclude: /node_modules/,
			loader: 'graphql-tag/loader'
		},
		{
			test: /\.vue$/,
			loader: 'vue-loader'
		},
		{
			test: /\.s?css$/,
			use: [{
				loader: 'file-loader',
				options: {
					name: '[folder]/[name].[hash].css'
				}
			}, {
				loader: 'extract-loader'
			}, {
				loader: 'css-loader',
				options: {
					sourceMap: true
				}
			}, {
				loader: 'sass-loader',
				options: {
					sourceMap: true
				}
			}]
		}]
	},
};

module.exports = config;
