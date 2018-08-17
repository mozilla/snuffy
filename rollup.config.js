// Experimental config for bundling Fathom into a single file for use inside
// web extensions, etc. If possible, use ES6-style import statements in your
// code instead, and let rollup pull in just what Fathom code is necessary. See
// https://github.com/mozilla/fathom-trainees/blob/master/rollup.config.js for
// an example.
import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';

export default {
  input: 'index.js',
  name: 'fathom',
  output: {
    file: 'dist/fathom.js',
    format: 'umd',
  },
  plugins: [
    resolve({
      jsnext: true,
      main: true
    }),
    commonjs({
      include: ['node_modules/**', './*'],
    }),
  ],
};
