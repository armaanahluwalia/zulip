import { resolve } from 'path';
import * as BundleTracker from 'webpack-bundle-tracker';
import * as webpack from 'webpack';

const assets = require('./webpack.assets.json');

export default (env?: string) : webpack.Configuration => {
    const production: boolean = env === "production";
    let config: webpack.Configuration = {
        mode: production ? "production" : "development",
        context: resolve(__dirname, "../"),
        entry: assets,
        module: {
            rules: [
                // Run the typescript compilier on .ts files before webpack
                {
                    test: /\.tsx?$/,
                    loader: 'ts-loader',
                    options: {
                        configFile: require.resolve('../static/ts/tsconfig.json')
                    }
                },
                // Uses script-loader on minified files so we don't change global variables in them.
                // Also has the effect of making processing these files fast
                // Currently the source maps don't work with these so use unminified files
                // if debugging is required.
                {
                    test: /(min|zxcvbn)\.js/,
                    use: [ 'script-loader' ],
                },
                // Expose Global variables to webpack
                // Use the unminified versions of jquery and underscore so that
                // Good error messages show up in production and development in the source maps
                {
                    test: require.resolve('../static/node_modules/jquery/dist/jquery.js'),
                    use: [
                        {loader: 'expose-loader', options: '$'},
                        {loader: 'expose-loader', options: 'jQuery'},
                    ],
                },
                {
                    test: require.resolve('../node_modules/underscore/underscore.js'),
                    use: [
                        {loader: 'expose-loader', options: '_'},
                    ],
                },
                {
                    test: require.resolve('../static/js/debug.js'),
                    use: [
                        {loader: 'expose-loader', options: 'debug'},
                    ],
                },
                {
                    test: require.resolve('../static/js/blueslip.js'),
                    use: [
                        {loader: 'expose-loader', options: 'blueslip'},
                    ],
                },
                {
                    test: require.resolve('../static/js/common.js'),
                    use: [
                        {loader: 'expose-loader', options: 'common'},
                    ],
                },
            ],
        },
        output: {
            path: resolve(__dirname, '../static/webpack-bundles'),
            filename: production ? '[name]-[hash].js' : '[name].js',
        },
        resolve: {
            extensions: [".tsx", ".ts", ".js", ".json"],
        },
        devtool: production ? 'source-map' : 'eval',
    };
    if (production) {
        config.plugins = [
            new BundleTracker({filename: 'webpack-stats-production.json'}),
        ];
    } else {
        // Out JS debugging tools
        config.entry['common'].push('./static/js/debug.js');

        config.output.publicPath = '/webpack/';
        config.plugins = [
            new BundleTracker({filename: 'var/webpack-stats-dev.json'}),
            // Better logging from console for hot reload
            new webpack.NamedModulesPlugin(),
            // Hot Reload of code in development
            new webpack.HotModuleReplacementPlugin(),
            // script-loader should load sourceURL in dev
            new webpack.LoaderOptionsPlugin({debug: true}),
        ];

        config.devServer = {
            clientLogLevel: "warning",
            hot: true,
            inline: false,
            stats: "errors-only",
            watchOptions: {
                aggregateTimeout: 300,
                poll: 1000,
            },
        };
    }
    return config;
};
