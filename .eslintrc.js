// eslint-disable-next-line no-undef
module.exports = {
  env: { es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:typescript-sort-keys/recommended',
    'prettier',
    'plugin:prettier/recommended', // should always be at the end
  ],
  ignorePatterns: ['dist/**/*'],
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2020 },
  plugins: [
    '@typescript-eslint',
    'prettier',
    'typescript-sort-keys',
    'simple-import-sort',
    'import',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        args: 'after-used',
        argsIgnorePattern: '^_',
        caughtErrors: 'all',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
        ignoreRestSiblings: true,
        varsIgnorePattern: '^_',
      },
    ],
    curly: ['error', 'multi-line'],
    eqeqeq: ['error', 'always', { null: 'ignore' }],
    'func-style': ['error', 'declaration', { allowArrowFunctions: true }],
    'no-throw-literal': 'error',
    'no-var': 'error',
    'simple-import-sort/exports': 'error',
    'simple-import-sort/imports': 'error',
    'sort-keys': ['error', 'asc', { caseSensitive: true, natural: true }],
  },
  settings: {
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
  },
}
