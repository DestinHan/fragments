import globals from 'globals';
import pluginJs from '@eslint/js';

export default [

  pluginJs.configs.recommended,

  {
    files: ['**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
  },

  {
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
  },

  {
    ignores: [
      'node_modules/**',
      'coverage/**',
    ],
  },
];
