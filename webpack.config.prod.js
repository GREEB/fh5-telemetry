const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const CopyPlugin = require('copy-webpack-plugin')

module.exports = {
    entry: './src/index.js',
    mode: 'production',
    output: {
        filename: 'js/[name].[hash:8].js',
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
                                    '[hash:base64:8]_[name]_[local]',
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
                            name: 'assets/[name].[hash:8].[ext]',
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
            filename: 'css/[name].[hash:8].css',
        }),
        new HtmlWebpackPlugin({
            title: 'threejs example',
            // filename: __dirname + '/build/index.html',
            template: __dirname + '/public/index.html',
            // favicon: __dirname + '/public/favicon.ico',
        }),
        // new CopyPlugin({
        //     patterns: [
        //         {
        //             from: 'public/',
        //             // globOptions: {
        //             //     ignore: ['**/pointcloud/**', '**/libs/**'],
        //             // },
        //         },
        //     ],
        // }),
    ],
}
