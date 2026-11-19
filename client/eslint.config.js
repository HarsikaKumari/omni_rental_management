import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },

  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      {
        plugins: {
          'react-hooks': reactHooks,
          'react-refresh': reactRefresh,
        },
        rules: {
          // Enforces the "Rules of Hooks" (e.g., hooks must not be called conditionally).
          ...reactHooks.configs.recommended.rules,

          // Warn when a file exports both a component and non-components —
          // React Fast Refresh works best with one style per file.
          'react-refresh/only-export-components': [
            'warn',
            { allowConstantExport: true },
          ],
        },
      },
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser },   // define window, document, fetch, etc.
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
);
