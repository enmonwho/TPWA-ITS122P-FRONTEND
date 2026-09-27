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

      /* Accessibility (warnings so CI/dev is not hard-blocked on minor aria tags) */
      ...jsxA11y.configs.recommended.rules,
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',
      'jsx-a11y/no-noninteractive-element-interactions': 'warn',
      'jsx-a11y/no-autofocus': 'warn',
      'jsx-a11y/label-has-associated-control': 'warn',

      /* TypeScript tweaks */
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',

      /* React Hooks / Compiler tweaks */
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
    },
  },

  /* ── Prettier compat (must be last) ──────────────────── */
  prettier,
);
