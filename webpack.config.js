module.exports = {
  entry: ['babel-polyfill', './index.js'],
  output: {
    path: './bin',
    filename: 'fathom.bundle.js',
    libraryTarget: "var",
    library: "fathom"
  },
  module: {
    loaders: [{
      text: /\.js$/,
      exclude: /node_modules/,
      loader: 'babel-loader'
    }]
  }
};
