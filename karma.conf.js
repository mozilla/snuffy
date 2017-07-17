// Karma configuration
// Generated on Fri Jun 30 2017 10:39:26 GMT-0700 (PDT)
module.exports = function(config) {
  config.set({
    frameworks: ['browserify', 'mocha', 'chai'],
    files: ['test/**/*.js'],
    preprocessors: {
      'test/**/*.js': [ 'browserify' ],
    },

    browserify: {
      debug: true,
      transform:['brfs']
    },

    reporters: ['progress'],
    port: 9876,  // karma web server port
    colors: true,
    logLevel: config.LOG_INFO,
    browsers: ['ChromeHeadless'],
    browserNoActivityTimeout: 1000000,
    autoWatch: false,
    // singleRun: false, // Karma captures browsers, runs the tests and exits
    concurrency: Infinity
  })
}
