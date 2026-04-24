import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Context files legitimately export both a Provider component and custom hooks
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      // allow console.error/warn for error boundaries and network failures; disallow console.log
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      // explicit return types are optional in React component files (TypeScript infers them)
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      // resetting state synchronously at the top of an effect is a valid React pattern for
      // clearing derived state when a dependency (e.g. channelId, serverId) changes
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  // Context files export both a Provider component and a custom hook — that is intentional.
  // UI primitive files (button.tsx) export both a component and its variant helper.
  // Neither pattern conflicts with fast-refresh in practice.
  {
    files: ['src/context/**/*.tsx', 'src/components/ui/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  prettierConfig,
);
