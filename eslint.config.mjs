import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/**', 'lib/**', 'artifacts/**', 'releases/**', 'backups/**', 'preview/dist/**', 'vendor/**', 'src/vendor/**'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,mjs,cjs}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // esbuild owns JSX compilation; core ESLint cannot detect JSX-only references.
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z]', argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
    },
  },
];
