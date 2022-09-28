const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyWebpackPlugin = require('copy-webpack-plugin');
const fs = require('fs');
const path = require('path');
const { NONAME } = require('dns');
var cwd = process.cwd();
const configRaw = fs.readFileSync('frakas.json');
const config = JSON.parse(configRaw);

// Overrides
config.serverDir = config.serverDir ?? "server";
config.clientDir = config.clientDir ?? `${config.serverDir}/public`

console.log("frakas.json: ", config)

var clientConfig = {
    target: 'web',
    mode: 'development',
    devtool: 'hidden-source-map',
    entry: {
        client: config.entryPoint
    },
    module: {
        rules: [
            {
                test: /.ts?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            },
            {
                test: /.css$/,
                use: [
                    MiniCssExtractPlugin.loader, // instead of style-loader
                    'css-loader'
                ]
            },
            {
                test: /.ttf$/,
                use: ['file-loader']
            }
        ],
    },
    resolve: {
        extensions: ['.ts', '.js'],
        alias: {
            "express": false,
            "stream": false,
            "crypto": false,
            "https": false,
            "zlib": false,
            "net": false,
            "tls": false,
            "os": false,
            "fs": false,
            "ws": false,
            "child_process": false,
            "http2": false,
            "http": false,
            "buffer": false,
            "querystring": false,
            "string_decoder": false,
            "tty": false,
            "url": false,
            "util": false,
            "process": false
        },
        fallback: {
            "path": require.resolve("path-browserify")
        },
        modules: [
            /* assuming that one up is where your node_modules sit,
               relative to the currently executing script
            */
            path.join(__dirname, './node_modules')
        ]
    },
    output: {
        globalObject: 'self',
        filename: '[name].js',
        path: path.resolve(__dirname, config.clientDir)
    },
    plugins: [new HtmlWebpackPlugin({
        title: 'Custom template',
        // Load a custom template (lodash by default)
        templateContent: `<!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <meta http-equiv="X-UA-Compatible" content="ie=edge">
                    <title>${config.gameName}</title>
                    <meta property="og:image" itemprop="image" content="assets/${config.gameThumbnail}" />
                    <meta property="og:type" content="website" />
                    <meta property="og:title" content="${config.gameName}" />
                    <meta property="og:site_name" content="${config.gameName}">
                    <meta property="og:description" content="${config.gameName}" />
                    <link href="assets/bootstrap.min.css" rel="stylesheet">
                    <style>

                    @font-face {
                        font-family: gooddog;
                        src: url(assets/gooddog.otf);
                        font-weight: bold;
                    }

                    #renderCanvas {
                        position: relative;
                        top: 0px;
                        bottom: 0px;
                        max-width: 100%;
                        margin: auto auto;
                        border: 1px solid white;
                        background-color: #383838;
                        height: 100%;

                      }
                      
                      .cavas-holder-inner {
                        width: 100%;
                        height: 100%;
                        display: flex;
                        position: absolute;
                        background-color: #585858;
                      }
                      
                      body{
                        margin:0;
                        overflow:hidden;
                        overscroll-behavior-y: contain;
                        font-family: gooddog;
                      }
                    </style>
                </head>
                <body>
                  <div class="cavas-holder-inner" id="renderCanvas-holder">
                    <canvas tabindex="0" autofocus width="2000" id="renderCanvas"></canvas>
                  </div>
                  
                <script async src="https://www.googletagmanager.com/gtag/js?id=G-GFTBDJDLK0"></script>
                <script>
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    gtag('js', new Date());
                    gtag('config', 'G-GFTBDJDLK0');
                </script>

                </body>
                </html>`
    }),
    new MiniCssExtractPlugin(),
    new CopyWebpackPlugin({
        patterns: [
            {
                from: 'assets',
                to: 'assets',
                noErrorOnMissing: true
            },
            {
                from: 'frakas.json'
            },
            {
                from: 'favicon.ico'
            }
        ]
    })],
    watch: true,
    watchOptions: {
        ignored: [config.clientDir, config.serverDir],
    }
};

var serverConfig = {
    target: 'node',
    mode: 'development',
    devtool: 'hidden-source-map',
    entry: {
        server: config.entryPoint
    },
    module: {
        rules: [
            {
                test: /.(ts|tsx)$/,
                use: [
                    {
                        loader: 'ts-loader',
                        options: {
                            transpileOnly: true,
                        },
                    }
                ],
                exclude: /node_modules/
            },
            {
                test: /.js$/,
                enforce: "pre",
                use: ["source-map-loader"],
                exclude: /node_modules/
            },

            {
                test: /.ttf$/,
                use: ['file-loader']
            }
        ],
    },
    resolve: {
        extensions: ['.ts', '.js'],
        modules: [
            /* assuming that one up is where your node_modules sit,
               relative to the currently executing script
            */
            path.join(__dirname, './node_modules')
        ]
    },
    output: {
        globalObject: 'self',
        filename: '[name].js',
        path: path.resolve(__dirname, config.serverDir)
    },
    plugins: [new CopyWebpackPlugin({
        patterns: [
            {
                from: 'frakas.json'
            }
        ]
    })],
    watch: true,
    watchOptions: {
        ignored: [config.clientDir, config.serverDir],
    }
};

module.exports = [
    clientConfig,
    serverConfig
];