/* global module __dirname */

const path = require('path');
const glob = require('glob');
const fs = require('fs');

//const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const { VueLoaderPlugin } = require('vue-loader');
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');
const { EsbuildPlugin } = require('esbuild-loader');
const CopyPlugin = require('copy-webpack-plugin');

function getFolderName(file) {
	return path.basename(path.dirname(file));
}

if ( process.env.NODE_ENV == null )
	process.env.NODE_ENV = 'production';

// Are we in development?
const DEV_SERVER = process.env.WEBPACK_SERVE == 'true';
const DEV_BUILD = process.env.NODE_ENV !== 'production';

// Is this for an extension?
const FOR_EXTENSION = !! process.env.FFZ_EXTENSION;

// Get the public path.
const FILE_PATH = DEV_SERVER
	? 'https://localhost:8001/script/addons/'
	: FOR_EXTENSION
		? ''
		: 'https://cdn.frankerfacez.com/static/addons/';


console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('FOR_EXTENSION:', FOR_EXTENSION, FOR_EXTENSION ? ` (${process.env.FFZ_EXTENSION})` : '');
console.log('IS_DEV_BUILD:', DEV_BUILD);
console.log('IS SERVE:', DEV_SERVER);
console.log('FILE PATH:', FILE_PATH);

// First, identify every add-on.

const ENTRIES = {},
	MANIFESTS = {};

const NON_LOCAL_ICONS = [];

for(const entry of glob.sync('./src/**/index.{js,jsx}')) {
	const folder = getFolderName(entry);
	
	// Try to read the manifest.
	const fname = path.join(path.dirname(entry), 'manifest.json');
	let json;
	try {
		json = JSON.parse(fs.readFileSync(fname));
	} catch(err) {
		console.warn(`Unable to read manifest for file: ${entry}`);
		continue;
	}
	
	if ( ! DEV_BUILD && ! json.enabled )
		continue;
	
	delete json.enabled;
	json.id = folder;
	
	if ( ! json.icon && fs.existsSync(path.join(path.dirname(entry), 'logo.png')) )
		json.icon = `${FILE_PATH}${json.id}/logo.png`;
	
	else if ( ! json.icon && fs.existsSync(path.join(path.dirname(entry), 'logo.jpg')) )
		json.icon = `${FILE_PATH}${json.id}/logo.jpg`;
	
	else if ( json.icon )
		NON_LOCAL_ICONS.push(folder);
	
	ENTRIES[`${folder}/script`] = `./${entry}`;
	MANIFESTS[folder] = json;
}

if ( NON_LOCAL_ICONS.length )
	console.warn('The following add-ons use non-local logos:', NON_LOCAL_ICONS.join(', '));


// The Config

const TARGET = 'es2020';

/** @type {import('webpack').Configuration} */
const config = {
	mode: DEV_BUILD
		? 'development'
		: 'production',
	devtool: DEV_BUILD
		? 'inline-source-map'
		: 'source-map',
	
	resolve: {
		extensions: ['.js', '.jsx']
	},
	
	target: ['web', TARGET],
	
	entry: ENTRIES,
	
	externals: [
		({request}, callback) => {
			if ( request === 'vue' )
				return callback(null, 'root ffzVue');
			return callback();
		}
	],
	
	output: {
		chunkFormat: 'array-push',
		clean: true,
		publicPath: FOR_EXTENSION
			? 'auto'
			: FILE_PATH,
		path: path.resolve(__dirname, 'dist/addons'),
		filename: (FOR_EXTENSION || DEV_SERVER)
			? '[name].js'
			: '[name].[contenthash].js',
		chunkLoadingGlobal: 'ffzAddonsWebpackJsonp',
		crossOriginLoading: 'anonymous'
	},
	
	optimization: {
		minimizer: [
			new EsbuildPlugin({
				target: TARGET,
				keepNames: true
			})
		]
	},
	
	plugins: [
		new VueLoaderPlugin(),
		new EsbuildPlugin({
			define: {
				'Addon': 'FrankerFaceZ.utilities.addon.Addon'
			}
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
			]
		}),
		new WebpackManifestPlugin({
			filter: data => ! data.name.endsWith('.map'),
			basePath: 'addons/',
			publicPath: 'addons/'
		}),
		new WebpackManifestPlugin({
			fileName: path.resolve(__dirname, DEV_SERVER ? 'dist/addons' : 'dist', 'addons.json'),
			serialize: thing => JSON.stringify(thing, null, '\t'),
			generate: () => Object.values(MANIFESTS)
		})
	],
	
	module: {
		rules: [
			{
				test: /index\.jsx?$/,
				exclude: /node_modules/,
				loader: 'string-replace-loader',
				options: {
					search: /\.register\(\);/ig,
					replace(match, offset, string) {
						let folder = path.relative(this.rootContext, path.dirname(this.resource));
						if ( folder.startsWith('src\\') || folder.startsWith('src/') )
							folder = folder.substring(4);
						
						return `.register(${JSON.stringify(folder)});`;
					}
				}
			},
			{
				test: /\.jsx?$/,
				exclude: /node_modules/,
				loader: 'string-replace-loader',
				options: {
					search: /import\("\.\/(.*)\.(.*)"\)/ig,
					replace(match, filename, extension) {
						let folder = path.relative(this.rootContext, path.dirname(this.resource));
						if ( folder.startsWith('src\\') || folder.startsWith('src/') )
							folder = folder.substring(4);
						
						const out = `import(/* webpackChunkName: "${folder}/${extension}" */ "./${filename}.${extension}")`;
						//console.log(`Replacing import: "${match}" with "${out}"`);
						return out;
					}
				}
			},
			{
				test: /\.jsx?$/,
				exclude: /node_modules/,
				loader: 'esbuild-loader',
				options: {
					loader: 'jsx',
					jsxFactory: 'createElement',
					target: TARGET
				}
			},
			{
				test: /\.json$/,
				include: /src/,
				type: 'asset/resource',
				generator: {
					filename: (FOR_EXTENSION || DEV_BUILD)
						? '[name].json'
						: '[name].[contenthash:8].json'
				}
			},
			{
				test: /\.(graphql|gql)$/,
				exclude: /node_modules/,
				use: [
					'graphql-tag/loader',
					'minify-graphql-loader'
				]
			},
			{
				test: /\.vue$/,
				loader: 'vue-loader'
			},
			{
				test: /\.(?:sa|sc|c)ss$/,
				use: [
					{
						loader: 'file-loader',
						options: {
							name: (FOR_EXTENSION || DEV_BUILD)
								? '[folder]/[name].css'
								: '[folder]/[name].[contenthash].css'
						}
					},
					{
						loader: 'extract-loader'
					},
					{
						loader: 'css-loader',
						options: {
							sourceMap: DEV_BUILD ? true : false
						}
					},
					{
						loader: 'sass-loader',
						options: {
							sourceMap: true
						}
					}
				]
			}
		]
	}
};

if ( DEV_SERVER )
	config.devServer = {
		client: false,
		webSocketServer: false,
		magicHtml: false,
		liveReload: false,
		hot: false,
		
		server: 'https',
		port: 8001,
		compress: true,
		
		allowedHosts: [
			'.twitch.tv',
			'.frankerfacez.com'
		],
		
		devMiddleware: {
			publicPath: '/script/addons/',
		},
		
		setupMiddlewares: (middlewares, devServer) => {
			
			devServer.app.get('/script/addons.json', (req, res) => {
				res.setHeader('Access-Control-Allow-Origin', '*');
				res.setHeader('Access-Control-Allow-Private-Network', 'true');
				res.redirect('/script/addons/addons.json');
			});
			
			middlewares.unshift((req, res, next) => {
				res.setHeader('Access-Control-Allow-Origin', '*');
				res.setHeader('Access-Control-Allow-Private-Network', 'true');
				next();
			});
			
			return middlewares;
		}
	};


module.exports = config;
