import js from '@eslint/js';
import globals from 'globals';
import security from 'eslint-plugin-security';
import boundaries from 'eslint-plugin-boundaries';
import importX from 'eslint-plugin-import-x';
import vitest from '@vitest/eslint-plugin';
import eslintConfigPrettier from 'eslint-config-prettier';
import pluginN from 'eslint-plugin-n';

export default [
  // ─── 1. Global ignores ───────────────────────────────────────────────────────
  // Replaces .eslintignore. Must be the first entry with ONLY an ignores key.
  {
    ignores: ['node_modules/**', 'coverage/**', 'src/generated/**', 'src/scripts/**', 'prisma/**', 'migrate-tests.js'],
  },

  // ─── 2. Base recommended rulesets ────────────────────────────────────────────
  // @eslint/js — built-in JS correctness rules (replaces airbnb-base core)
  js.configs.recommended,

  // eslint-plugin-security v3 — flat config object (plugins: { security: plugin })
  security.configs.recommended,

  // eslint-plugin-n — flat/recommended-module for ESM projects
  // This key exports a proper flat config object, NOT the legacy { plugins: ["n"] } array form
  pluginN.configs['flat/recommended-module'],

  // eslint-plugin-import-x — flat config for import validation
  importX.flatConfigs.recommended,

  // ─── 3. Project-wide rules ───────────────────────────────────────────────────
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      boundaries,
    },
    settings: {
      node: {
        version: '>=18.18.0',
      },
      'import-x/resolver': {
        node: {
          extensions: ['.js', '.json', '.node'],
        },
      },
      'boundaries/elements': [
        { type: 'shared', pattern: 'src/shared/**/*' },
        { type: 'iam', pattern: 'src/modules/iam/**/*' },
        { type: 'notes', pattern: 'src/modules/notes/**/*' },
        { type: 'audit', pattern: 'src/modules/audit/**/*' },
        { type: 'docs', pattern: 'src/docs/**/*' },
        { type: 'infrastructure', pattern: 'src/infrastructure/**/*' },
        { type: 'app', pattern: 'src/*.js' },
      ],
    },
    rules: {
      // ── Architecture boundaries ─────────────────────────────────────────────
      // default: disallow means any cross-module import not explicitly listed is an error
      // ── Architecture boundaries ─────────────────────────────────────────────
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          rules: [
            {
              from: { type: 'shared' },
              allow: { to: { type: ['shared', 'infrastructure'] } },
            },
            {
              from: { type: 'iam' },
              allow: { to: { type: ['shared', 'iam', 'infrastructure'] } },
            },
            {
              from: { type: 'notes' },
              allow: { to: { type: ['shared', 'iam', 'notes', 'audit', 'infrastructure'] } },
            },
            {
              from: { type: 'audit' },
              allow: { to: { type: ['shared', 'audit', 'infrastructure'] } },
            },
            {
              from: { type: 'infrastructure' },
              allow: { to: { type: ['shared', 'infrastructure', 'iam'] } },
            },
            {
              from: { type: 'app' },
              allow: { to: { type: ['shared', 'iam', 'notes', 'infrastructure', 'docs'] } },
            },
          ],
        },
      ],

      // ── Import rules ────────────────────────────────────────────────────────
      // ESM requires explicit extensions — catches missing .js at lint time, not runtime
      'import-x/extensions': ['error', 'ignorePackages'],
      // Disabled: import-x resolver can't reliably resolve all paths in this setup
      // import-x/no-unresolved is left at its default (off in flatConfigs.recommended)
      'import-x/no-cycle': 'off',
      'import-x/no-named-as-default-member': 'off',
      'import-x/no-named-as-default': 'off',

      // ── Node.js rules ───────────────────────────────────────────────────────
      // import-x handles import resolution better than n/no-missing-import
      'n/no-missing-import': 'off',
      'n/no-unpublished-import': 'off',
      // n/no-process-exit is valid globally but allowed in scripts (see override below)
      'n/no-process-exit': 'error',
      'import-x/namespace': 'off',

      // ── Code quality ────────────────────────────────────────────────────────
      'no-console': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'func-names': 'off',
      'no-underscore-dangle': 'off',
      'consistent-return': 'off',
      'class-methods-use-this': 'off',
    },
  },

  // ─── 4. bin/ and scripts/ overrides ──────────────────────────────────────────
  {
    files: ['bin/**/*.js', 'scripts/**/*.js', 'lint-checker.js', 'print-errors.js'],
    rules: {
      'no-console': 'off',
      'security/detect-non-literal-fs-filename': 'off',
      'n/no-process-exit': 'off',
      'n/no-unpublished-require': 'off',
      'no-unused-vars': 'off',
    },
  },

  // ─── 5. Test file overrides ───────────────────────────────────────────────────
  {
    files: ['tests/**/*.js', 'src/**/*.test.js'],
    // vitest.configs.recommended is a flat config object: { name, plugins: { vitest }, rules }
    // Spread it directly — this registers the plugin AND its recommended rules in one step
    ...vitest.configs.recommended,
    // vitest.configs.env provides languageOptions.globals for all Vitest test globals
    // (describe, it, test, expect, vi, beforeAll, afterAll, beforeEach, afterEach, etc.)
    languageOptions: {
      ...vitest.configs.env.languageOptions,
    },
    rules: {
      // Re-apply recommended rules after spread (required when mixing with languageOptions override)
      ...vitest.configs.recommended.rules,
      // Enable expect-expect but allow supertest's chained .expect() as an assertion
      'vitest/expect-expect': ['error', { assertFunctionNames: ['expect', 'request.**.expect'] }],
      // Tests legitimately import devDependencies and internal test utilities
      'import-x/no-extraneous-dependencies': 'off',
      // Common test patterns that conflict with base rules
      'no-plusplus': 'off',
      'no-new-wrappers': 'off',
      'no-restricted-syntax': 'off',
      'no-await-in-loop': 'off',
      // n rules don't apply meaningfully inside test files
      'n/no-unpublished-import': 'off',
    },
  },

  // ─── 6. Prettier (MUST be last) ───────────────────────────────────────────────
  // Disables all ESLint rules that would conflict with Prettier formatting.
  // Prettier itself runs separately via `npm run prettier` / lint-staged.
  eslintConfigPrettier,
];
