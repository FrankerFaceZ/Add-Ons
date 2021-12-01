/* global module __dirname */

const path = require('path');
const fs = require('fs');
const merge = require('webpack-merge');
const common = require('./webpack.config.js');

const glob = require('glob');
const getFolderName = file => path.basename(path.dirname(file));
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');
const jsonfile = require('jsonfile');

module.exports = merge(common, {
	mode: 'development',
	devtool: 'inline-source-map',

	plugins: [
		new WebpackManifestPlugin({
			fileName: path.resolve(__dirname, 'dist/addons', 'addons.json'),
			generate: () => {
				const addons = [];
				for (const manifest of glob.sync('./src/**/manifest.json')) {
					const json = jsonfile.readFileSync(manifest);
					delete json.enabled;

					const dir = json.id = getFolderName(manifest);

					if ( ! json.icon && fs.existsSync(path.join(path.dirname(manifest), 'logo.png')) )
						json.icon = `//localhost:8001/script/addons/${json.id}/logo.png`;

					if ( ! json.icon && fs.existsSync(path.join(path.dirname(manifest), 'logo.jpg')) )
						json.icon = `//localhost:8001/script/addons/${json.id}/logo.jpg`;

					// Calculate dates for dev data~
					let newest = 0, oldest = Infinity;
					for(const file of glob.sync(`./src/${dir}/**`)) {
						try {
							const stat = fs.statSync(file),
								mtime = stat.mtime.getTime();

							if ( mtime < oldest )
								oldest = mtime;
							if ( mtime > newest )
								newest = mtime;
						} catch(err) {
							console.log(err);
						}
					}

					if ( ! json.created )
						json.created = oldest;

					json.updated = newest;

					addons.push(json);
				}
				return addons;
			}
		})
	],

	devServer: {
		client: false,
		webSocketServer: false,

		magicHtml: false,
		liveReload: false,
		hot: false,

		https: true,
		port: 8001,
		compress: true,

		allowedHosts: [
			'.twitch.tv',
			'.frankerfacez.com'
		],

		devMiddleware: {
			publicPath: '/script/addons/',
		},

		//contentBase: path.join(__dirname, 'dist'),

		onBeforeSetupMiddleware(devServer) {
			const app = devServer.app;

			app.get('/script/addons.json', (req, res) => {
				res.setHeader('Access-Control-Allow-Origin', '*');
				res.redirect('/script/addons/addons.json');
			});

			app.get('/*', (req, res, next) => {
				res.setHeader('Access-Control-Allow-Origin', '*');
				next();
			});
		}
	},

	output: {
		publicPath: `//localhost:8001/script/addons/`,
		filename: '[name].js',
		jsonpFunction: 'ffzAddonsWebpackJsonp'
	}
})
