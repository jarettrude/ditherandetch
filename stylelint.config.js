/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard'],

  rules: {
    // Modern CSS practices for 2026
    'alpha-value-notation': 'number',
    'color-function-notation': 'modern',
    'custom-property-empty-line-before': null,
    'declaration-empty-line-before': null,
    'function-no-unknown': [
      true,
      {
        ignoreFunctions: ['theme', 'calc', 'min', 'max', 'clamp', 'var'],
      },
    ],
    'keyframes-name-pattern': '^[a-z][a-zA-Z0-9-]+$',
    'property-no-vendor-prefix': true,
    'rule-empty-line-before': [
      'always',
      {
        except: ['first-nested'],
        ignore: ['after-comment'],
      },
    ],
    'selector-class-pattern': '^[a-z][a-zA-Z0-9-]+$',
    'selector-not-notation': 'simple',
    'selector-pseudo-class-no-unknown': [
      true,
      {
        ignorePseudoClasses: ['global', 'export', 'import'],
      },
    ],
    'selector-pseudo-element-colon-notation': 'double',
    'shorthand-property-no-redundant-values': true,
    'value-no-vendor-prefix': true,

    // 2026 enhanced rules
    'import-notation': 'string',
    'declaration-property-unit-disallowed-list': null,
    'length-zero-no-unit': null,

    // Tailwind CSS v4 specific - allow Tailwind patterns and functions
    'at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: [
          'apply',
          'layer',
          'config',
          'utility',
          'variant',
          'custom-variant',
          'source',
          'tailwind',
          'theme',
          'extend',
          'import',
          'reference',
          'forward',
        ],
      },
    ],
    'property-no-unknown': [
      true,
      {
        ignoreProperties: ['--spacing', '--alpha', '--color', '--font'],
      },
    ],
  },

  overrides: [
    // Astro files with CSS
    {
      files: ['**/*.astro'],
      customSyntax: 'postcss-html',
    },
    // Svelte files with CSS
    {
      files: ['**/*.svelte'],
      customSyntax: 'postcss-html',
    },
  ],

  ignoreFiles: [
    'dist/**',
    'node_modules/**',
    '.astro/**',
    'build/**',
    'public/**',
  ],
};
