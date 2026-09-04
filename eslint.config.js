import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  /* ── Global ignores ──────────────────────────────────────── */
  { ignores: ['dist', 'node_modules'] },

  /* ── Base rules ──────────────────────────────────────────── */
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
    ],
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      /* React Hooks */
      ...reactHooks.configs.recommended.rules,

      /* React Refresh — allow constant export for HMR */
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],

      /* Accessibility */
      ...jsxA11y.configs.recommended.rules,

      /* TypeScript tweaks */
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'warn',
    },
  },

  /* ── Prettier compat (must be last) ──────────────────── */
  prettier,
);
