const path = require('path')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
    entry: './src/index.js',
    mode: 'development',
    output: {
        filename: 'js/[name].js',
        path: path.resolve(__dirname, 'build'),
        publicPath: '/',
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                loader: 'babel-loader',
            },
            // {
            //     test: /\.css$/,
            //     use: ['style-loader', 'css-loader']
            //   },
            {
                test: /\.module\.css$/,
                use: [
                    'style-loader',
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
                include: path.resolve(__dirname, 'src'),
            },
            {
                test: /\.(vs|fs|glsl|vert|frag)$/,
                loader: 'raw-loader',
            },
            {
                test: /(?<!\.module)\.css$/,
                use: ['style-loader', 'css-loader'],
                include: path.resolve(__dirname, 'src'),
            },
            {
                test: /\.(png|jpg|gif|svg)$/i,
                use: [
                    {
                        loader: 'url-loader',
                        options: {
                            limit: 8192,
                            name: 'assets/[name].[ext]',
                        },
                    },
                ],
            },
        ],
    },
    devtool: 'source-map',
    performance: {
        hints: false, // 取消静态文件超过250kb的警告
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
                    reuseExistingChunk: true,
                },
            },
        },
    },
    resolve: {
        extensions: ['*', '.js', '.jsx'],
    },
    devServer: {
        contentBase: path.join(__dirname, 'public/'),
        // port: 3000,
        // publicPath: 'http://localhost:3000/',
    },
    plugins: [
        new webpack.HotModuleReplacementPlugin(),
        new HtmlWebpackPlugin({
            title: 'Vark',
            template: __dirname + '/public/index.html',
            // favicon: __dirname + '/public/favicon.ico',
        }),
    ],
}
