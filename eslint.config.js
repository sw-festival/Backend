// eslint.config.js
module.exports = [
  {
    ignores: ['node_modules/**'],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        // Node.js 환경 전역 변수
        __dirname: 'readonly',
        __filename: 'readonly',
        exports: 'readonly',
        module: 'readonly',
        require: 'readonly',
        // ES6 전역 변수
        process: 'readonly',
        // 추가된 전역 변수
        console: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        jest: 'readonly',
        beforeEach: 'readonly',
        Buffer: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
      indent: ['error', 2],
      quotes: ['error', 'single'],
      'quote-props': ['error', 'always'],
      semi: ['error', 'always'],
      'no-unused-vars': ['warn'],
      'no-undef': ['error'],
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
      'no-var': ['error'],
      'prefer-const': ['error'],
      'no-trailing-spaces': ['error'],
      'eol-last': ['error', 'always'],
    },
  },
];
