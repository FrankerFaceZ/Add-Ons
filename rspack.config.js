/* global module __dirname */

const path = require('path');
const glob = require('glob');
const fs = require('fs');

const { VueLoaderPlugin } = require('vue-loader');
const { WebpackManifestPlugin } = require('rspack-manifest-plugin');

const minifyPlugin = require('@rspack/plugin-minify');

function getFolderName(file) {
    return path.basename(path.dirname(file));
}

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
console.log('IS SERVE:', DEV_SERVER);
console.log('FILE PATH:', FILE_PATH);

// First, identify every add-on.

const ENTRIES = {},
    MANIFESTS = {};

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

    if ( ! json.icon && fs.existsSync(path.join(path.dirname(entry), 'logo.jpg')) )
        json.icon = `${FILE_PATH}${json.id}/logo.jpg`;

    ENTRIES[`${folder}/script`] = `./${entry}`;
    MANIFESTS[folder] = json;
}


// The Config

/** @type {import('@rspack/cli').Configuration} */
const config = {
    mode: DEV_BUILD
        ? 'development'
        : 'production',
    devtool: DEV_BUILD
        ? 'inline-source-map'
        : 'source-map',

    target: 'browserslist',

    resolve: {
		extensions: ['.js', '.jsx']
	},

    entry: ENTRIES,

    externalsType: 'window',
    externals: {
        vue: 'ffzVue'
    },

    builtins: {
        copy: {
            patterns: [
                {
                    from: '**/logo.png',
                    context: 'src',
                    to: '[path]logo.png',
                    toType: 'template',
                    test: /src(?:\\|\/)([^\\\/]+)(?:\\|\/)logo\.png$/
                },
                {
                    from: '**/logo.jpg',
                    context: 'src',
                    to: '[path]logo.jpg',
                    toType: 'template',
                    test: /src(?:\\|\/)([^\\\/]+)(?:\\|\/)logo\.jpg$/
                }
            ]
        },

        define: {
            Addon: 'FrankerFaceZ.utilities.addon.Addon'
        }
    },

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

        onBeforeSetupMiddleware(devServer) {
            const app = devServer.app;

            app.get('/script/addons.json', (req, res) => {
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Private-Network', 'true');
                res.redirect('/script/addons/addons.json');
            });

            app.use((req, res, next) => {
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Private-Network', 'true');
                next();
            });
        }
    },

    output: {
        chunkFormat: 'array-push',
        clean: true,
        publicPath: FOR_EXTENSION
            ? 'auto'
            : FILE_PATH,
        path: path.resolve(__dirname, 'dist/addons'),
        filename: (FOR_EXTENSION || DEV_SERVER)
            ? '[name].js'
            : '[name].[hash].js',
        chunkLoadingGlobal: 'ffzAddonsWebpackJsonp',
        crossOriginLoading: 'anonymous'
    },

    optimization: {
        minimizer: [
            new minifyPlugin({
                minifier: 'terser',
                keep_classnames: true,
                keep_fnames: true
            })
        ]
    },

    plugins: [
        new VueLoaderPlugin(),
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
                type: 'javascript/auto',
                use: [
                    {
                        loader: 'string-replace-loader',
                        options: {
                            search: /import\("\.\/(.*)\.(.*)"\)/ig,
                            replace(match, filename, extension) {
                                let folder = path.relative(this.rootContext, path.dirname(this.resource));
                                if ( folder.startsWith('src\\') || folder.startsWith('src/') )
                                    folder = folder.substring(4);

                                //console.log(`Replacing import: "${match}"`);
                                return `import(/* webpackChunkName: "${folder}/${extension}" */ './${filename}.${extension}')`;
                            }
                        }
                    },
                    {
                        loader: 'builtin:swc-loader',
                        options: {
                            sourceMap: true,
                            jsc: {
                                parser: {
                                    syntax: 'ecmascript',
                                    jsx: true
                                },
                                transform: {
                                    react: {
                                        pragma: 'createElement',
                                        development: false
                                    }
                                }
                            }
                        }
                    }
                ]
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
                test: /\.(?:sa|sc|c)ss$/,
                use: [
                    {
                        loader: 'file-loader',
                        options: {
                            name: (FOR_EXTENSION || DEV_BUILD)
                                ? '[folder]/[name].css'
                                : '[folder]/[name].[hash].css'
                        }
                    },
                    {
                        loader: 'extract-loader'
                    },
                    {
                        loader: 'css-loader',
                        options: {
                            sourceMap: true
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

module.exports = config;
