import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  { ignores: ['dist', 'dev-dist', 'node_modules', 'playwright-report', 'test-results', 'supabase/.temp'] },
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'no-restricted-imports': ['error', {
        patterns: [{ group: ['**/supabase/functions/**'], message: 'src/ must never import Edge Function code (00 Section 5.3).' }],
      }],
      'no-restricted-globals': ['error',
        { name: 'localStorage', message: 'No student text in browser storage (00 must-never 14). Only src/lib/storage.js may touch it (Phase 02).' },
        { name: 'sessionStorage', message: 'No student text in browser storage (00 must-never 14).' },
        { name: 'indexedDB', message: 'No student text in browser storage (00 must-never 14).' }],
    },
  },
  {
    // Tests and test helpers may export helpers next to components.
    files: ['src/**/*.test.{js,jsx}', 'src/test/**/*.{js,jsx}'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    files: ['scripts/**/*.js', 'supabase/functions/**/*.js', 'e2e/**/*.js', '*.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node, Deno: 'readonly' },
    },
    rules: { ...js.configs.recommended.rules },
  },
];
