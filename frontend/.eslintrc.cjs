module.exports = {
  root: true,

  env: {
    browser: true,
    es2020: true,
    node: true,
  },

  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],

  ignorePatterns: [
    'dist',
    'node_modules',
    '.eslintrc.cjs',
  ],

  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },

  settings: {
    react: {
      version: '18.2',
    },
  },

  plugins: ['react-refresh'],

  rules: {
    // Project uses inline components/hooks across files; the refresh
    // rule is not actionable here.
    'react-refresh/only-export-components': 'off',

    // This codebase does not use prop-types validation.
    'react/prop-types': 'off',

    // The UI intentionally contains apostrophes/quotes in English and
    // Urdu copy (React renders them fine). Keep the rule only for the
    // characters that can actually break JSX parsing.
    'react/no-unescaped-entities': [
      'error',
      { forbid: ['>', '}'] },
    ],

    'no-unused-vars': [
      'warn',
      {
        args: 'none',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      },
    ],
  },
};
