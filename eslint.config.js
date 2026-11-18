import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Packages that belong to the 3D layer only.
const threePatterns = [
  {
    group: [
      'three',
      'three/*',
      '@react-three/*',
      '@react-spring/three',
      'three-stdlib',
      'postprocessing',
    ],
  },
];

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'playwright-report', 'test-results', 'node_modules'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { ecmaVersion: 2023, globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  // Architecture rule: business logic, data and services must never import Three.js.
  {
    files: [
      'src/models/**',
      'src/services/**',
      'src/state/**',
      'src/lib/**',
      'src/features/**/domain/**',
      'src/features/**/logic/**',
      'src/hooks/**',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: threePatterns.map((p) => ({
            ...p,
            message: 'Business logic must stay independent of Three.js. Keep 3D code in src/scene.',
          })),
        },
      ],
    },
  },
  // Architecture rule: the conventional UI must not import the 3D layer internals.
  {
    files: ['src/ui/**', 'src/pages/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: threePatterns.map((p) => ({
            ...p,
            message:
              'UI and pages talk to the 3D scene through src/scene public exports, not Three.js directly.',
          })),
        },
      ],
    },
  },
  {
    files: ['**/*.config.{ts,js}', 'e2e/**', 'tests/**'],
    languageOptions: { globals: { ...globals.node } },
  },
  prettier,
);
