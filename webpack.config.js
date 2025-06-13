// const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

const { ModuleFederationPlugin } = require('webpack').container;
const { WatchIgnorePlugin } = require('webpack')

//require('@signalk/server-admin-ui-dependencies')

const packageJson = require('./package')

console.log(packageJson.name.replace(/[-@/]/g, '_'))

module.exports = {
  entry: './src/index',
  mode: 'development',
  output: {
    path: path.resolve(__dirname, 'public')
  },
  module: {
    rules: [
        {
            test: /\.js?$/,
            loader: 'babel-loader',
            exclude: /node_modules/,
            options: {
              presets: ['@babel/preset-react'],
            },
          },
          {
        test: /\.jsx?$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
        options: {
          presets: ['@babel/preset-react'],
        },
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader'
        ]
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        loader:
          'file-loader',
        options: {
          name: '[path][name].[ext]',
        },
      }
    ],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'Bluetooth Sensors for Signalk',
      library: { type: 'var', name: packageJson.name.replace(/[-@/]/g, '_') },
      filename: 'remoteEntry.js',
      exposes: {
        './PluginConfigurationPanel': './src/components/PluginConfigurationPanel',
      },
      shared: [{ react: { singleton: false, strictVersion:true } }],
    }),
    new WatchIgnorePlugin({
      paths: [path.resolve(__dirname, 'public/')]
    })
    // new HtmlWebpackPlugin({
    //   template: './public/index.html',
    // }),
  ],
};