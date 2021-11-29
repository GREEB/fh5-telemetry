const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const CopyPlugin = require('copy-webpack-plugin')
const FaviconsWebpackPlugin = require('favicons-webpack-plugin')
const PACKAGE = require('./package.json');


module.exports = {
    entry: './src/index.js',
    mode: 'production',
    output: {
        filename: 'js/[name].[contenthash:8].js',
        path: path.resolve(__dirname, 'build'),
        publicPath: './',
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                loader: 'babel-loader',
            },
            {
                test: /\.module\.css$/,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader,
                    },
                    {
                        loader: 'css-loader',
                        options: {
                            modules: {
                                localIdentName:
                                    '[contenthash:base64:8]_[name]_[local]',
                            },
                        },
                    },
                ],
            },
            {
                test: /(?<!\.module)\.css$/,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader,
                    },
                    'css-loader',
                ],
            },
            {
                test: /\.(ico|gif|png|jpg|jpeg|svg)$/i,
                use: [
                    {
                        loader: 'url-loader',
                        options: {
                            limit: 8192,
                            name: 'assets/[name].[contenthash:8].[ext]',
                        },
                    },
                ],
            },
        ],
    },
    performance: {
        hints: false, // 取消静态文件超过250kb的警告
    },
    resolve: {
        extensions: ['*', '.js', '.jsx'],
    },
    optimization: {
        runtimeChunk: {
            name: 'runtime',
        },
        splitChunks: {
            minSize: 0,
            cacheGroups: {
                vendor: {
                    priority: 10,
                    name: 'lib',
                    test: /[\\/]node_modules[\\/]/,
                    chunks: 'all',
                },
            },
        },
    },
    plugins: [
        new FaviconsWebpackPlugin('src/logo.svg'), // svg works too!
        new CleanWebpackPlugin({
            cleanOnceBeforeBuildPatterns: [
                '**/*',
                // '!libs/**/*',
                // '!libs',
                // '!pointclouds',
                // '!pointclouds/**/*',
                // '!projectId',
                // '!projectId/**/*',
            ],
        }),
        new MiniCssExtractPlugin({
            filename: 'css/[name].[contenthash:8].css',
        }),
        new HtmlWebpackPlugin({
            title: PACKAGE.name,
            filename: __dirname + '/build/index.html',
            template: __dirname + '/public/index.html'
        }),
        new CopyPlugin({
            patterns: [
                { from: "src/*.svg",    to: 'assets/[name].svg'},
            ],
          }),
    ],
}