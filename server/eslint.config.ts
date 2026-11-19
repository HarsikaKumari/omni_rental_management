import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    // Ignore build output and dependencies.
    { ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },

    // Config for all .ts files.
    {
        files: ['**/*.ts'],
        extends: [js.configs.recommended, ...tseslint.configs.recommended],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: { ...globals.node },  // define process, console, __dirname, etc.
        },
        rules: {
            // We allow console.warn / console.error (used for warnings in seed & services)
            // but ban stray console.log (usually debug leftovers that can leak data).
            'no-console': ['warn', { allow: ['warn', 'error'] }],

            // Allow unused function arguments if they start with `_` — convention for "intentionally unused".
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
            ],

            // Warn (not fail) on `any` — sometimes unavoidable at zod boundaries.
            '@typescript-eslint/no-explicit-any': 'warn',
        },
    },
);
