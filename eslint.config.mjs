import js from '@eslint/js'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import perfectionist from 'eslint-plugin-perfectionist'
import prettierRecommended from 'eslint-plugin-prettier/recommended'
import simpleImportSort from 'eslint-plugin-simple-import-sort'

const tsEslintRecommendedRules =
  tsPlugin.configs['eslint-recommended'].overrides[0].rules

const sortOptions = {
  fallbackSort: { type: 'unsorted' },
  ignoreCase: false,
  newlinesBetween: 'ignore',
  order: 'asc',
  partitionByComment: false,
  partitionByNewLine: false,
  specialCharacters: 'keep',
  type: 'natural',
}

export default [
  {
    ignores: ['dist/**/*'],
  },
  js.configs.recommended,
  prettierRecommended,
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    languageOptions: {
      ecmaVersion: 2020,
      parser: tsParser,
      sourceType: 'module',
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      perfectionist,
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      ...tsEslintRecommendedRules,
      ...tsPlugin.configs.recommended.rules,
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
      'perfectionist/sort-object-types': ['error', sortOptions],
      'perfectionist/sort-objects': ['error', sortOptions],
      'simple-import-sort/exports': 'error',
      'simple-import-sort/imports': 'error',
    },
  },
]
