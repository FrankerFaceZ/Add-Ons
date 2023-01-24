/* global module __dirname */

const path = require('path');
const glob = require('glob');
const fs = require('fs');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const { ESBuildMinifyPlugin } = require('esbuild-loader');
const { DefinePlugin } = require('webpack');

const { VueLoaderPlugin } = require('vue-loader');

const getFolderName = file => path.basename(path.dirname(file));

const config = {
	mode: 'production',
	devtool: 'source-map',

	resolve: {
		extensions: ['.js', '.jsx'],
	},

	entry: glob.sync('./src/**/index.{js,jsx}').reduce(
		(entries, entry) =>
			Object.assign(entries, {
				[`${getFolderName(entry)}/script`]: entry,
			}),
		{}
	),
	externals: [
		({ request }, callback) => {
			if (request === 'vue') return callback(null, 'root ffzVue');
			callback();
		},
	],
	output: {
		publicPath: '//cdn.frankerfacez.com/static/addons/',
		path: path.resolve(__dirname, 'dist/addons'),
		filename: '[name].[fullhash].js',
		chunkLoadingGlobal: 'ffzAddonsWebpackJsonp',
	},

	optimization: {
		minimizer: [
			new ESBuildMinifyPlugin({
				keepNames: true,
				target: 'es2015',
			}),
		],
	},

	plugins: [
		new VueLoaderPlugin(),
		new CleanWebpackPlugin(),
		new DefinePlugin({
			Addon: 'FrankerFaceZ.utilities.addon.Addon',
		}),
		new WebpackManifestPlugin({
			serialize: thing => JSON.stringify(thing),
			filter: data => !data.name.endsWith('.map'),
			basePath: 'addons/',
			publicPath: 'addons/',
		}),
		new CopyPlugin({
			patterns: [
				{
					context: path.resolve(__dirname, 'src'),
					noErrorOnMissing: true,
					from: '**/logo.png',
					to: '[path]/logo.png',
					toType: 'template',
					filter: path => /src(?:\\|\/)([^\\/]+)(?:\\|\/)logo\.png$/.test(path),
				},
				{
					context: path.resolve(__dirname, 'src'),
					noErrorOnMissing: true,
					from: '**/logo.jpg',
					to: '[path]/logo.jpg',
					toType: 'template',
					filter: path => /src(?:\\|\/)([^\\/]+)(?:\\|\/)logo\.jpg$/.test(path),
				},
			],
		}),
		new WebpackManifestPlugin({
			fileName: path.resolve(__dirname, 'dist', 'addons.json'),
			serialize: thing => JSON.stringify(thing, null, '\t'),
			generate: () => {
				const addons = [];
				for (const manifest of glob.sync('./src/**/manifest.json')) {
					const json = JSON.parse(fs.readFileSync(manifest));
					if (!json.enabled) continue;

					delete json.enabled;
					json.id = getFolderName(manifest);

					if (
						!json.icon &&
						fs.existsSync(path.join(path.dirname(manifest), 'logo.png'))
					)
						json.icon = `//cdn.frankerfacez.com/static/addons/${json.id}/logo.png`;

					if (
						!json.icon &&
						fs.existsSync(path.join(path.dirname(manifest), 'logo.jpg'))
					)
						json.icon = `//cdn.frankerfacez.com/static/addons/${json.id}/logo.jpg`;

					addons.push(json);
				}
				return addons;
			},
		}),
	],

	module: {
		rules: [
			{
				test: /\.jsx?$/,
				loader: 'esbuild-loader',
				options: {
					loader: 'jsx',
					jsxFactory: 'createElement',
					target: 'es2015',
				},
			},
			{
				test: /index\.jsx?$/,
				loader: 'string-replace-loader',
				options: {
					search: /\.register\(\);/gi,
					replace() {
						const folder = path.dirname(this._module.rawRequest).substring(6);
						const modString = `.register('${folder}');`;
						return modString;
					},
				},
			},
			{
				test: /\.jsx?$/,
				loader: 'string-replace-loader',
				options: {
					search: /import\('\.\/(.*)\.(.*)'\)/gi,
					replace(match, fileName, extension) {
						const folder = path.dirname(this._module.rawRequest).substring(6);
						const modString = `import(/* webpackChunkName: "${folder}/${extension}" */ './${fileName}.${extension}')`;
						return modString;
					},
				},
			},
			{
				test: /\.(graphql|gql)$/,
				exclude: /node_modules/,
				loader: 'graphql-tag/loader',
			},
			{
				test: /\.vue$/,
				loader: 'vue-loader',
			},
			{
				test: /\.s?css$/,
				use: [
					{
						loader: 'file-loader',
						options: {
							name: '[folder]/[name].[hash].css',
						},
					},
					{
						loader: 'extract-loader',
					},
					{
						loader: 'css-loader',
						options: {
							sourceMap: true,
						},
					},
					{
						loader: 'sass-loader',
						options: {
							sourceMap: true,
						},
					},
				],
			},
		],
	},
};

module.exports = config;
