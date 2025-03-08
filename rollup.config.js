import { terser } from 'rollup-plugin-terser';
import babel from '@rollup/plugin-babel';

export default [
  // ESM build
  {
    input: 'src/effistate.js',
    output: {
      file: 'dist/effistate.esm.js',
      format: 'esm'
    }
  },
  // UMD build (minified)
  {
    input: 'src/effistate.js',
    output: {
      file: 'dist/effistate.min.js',
      format: 'umd',
      name: 'EffiState',
      plugins: [terser()]
    },
    plugins: [
      babel({
        babelHelpers: 'bundled',
        presets: ['@babel/preset-env']
      })
    ]
  }
]; 