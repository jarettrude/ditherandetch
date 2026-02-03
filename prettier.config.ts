/**
 * @see https://prettier.io/docs/configuration
 * @type {import("prettier").Config}
 */
const config = {
  // Plugins for Astro and Svelte support
  plugins: ['prettier-plugin-astro', 'prettier-plugin-svelte'],

  // Basic formatting
  trailingComma: 'all',
  tabWidth: 2,
  semi: true,
  singleQuote: true,
  quoteProps: 'as-needed',

  // Modern defaults for 2026
  useTabs: false,
  printWidth: 80,
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'avoid',
  endOfLine: 'lf',

  // 2026 experimental options (cutting edge)
  experimentalTernaries: true,
  experimentalOperatorPosition: 'start',

  // Enhanced options for better formatting
  singleAttributePerLine: false,
  htmlWhitespaceSensitivity: 'css',
  vueIndentScriptAndStyle: false,

  // Overrides for different file types
  overrides: [
    {
      files: '*.astro',
      options: {
        parser: 'astro',
      },
    },
    {
      files: '*.json',
      options: {
        tabWidth: 2,
      },
    },
    {
      files: '*.md',
      options: {
        tabWidth: 2,
        proseWrap: 'always',
        printWidth: 100,
      },
    },
    {
      files: '*.css',
      options: {
        tabWidth: 2,
        singleQuote: false,
      },
    },
    {
      files: '*.svelte',
      options: {
        parser: 'svelte',
      },
    },
    {
      files: '*.{ts,tsx,js,jsx,mjs,cjs}',
      options: {
        tabWidth: 2,
      },
    },
    {
      files: '*.tsx',
      options: {
        jsxSingleQuote: true,
      },
    },
  ],
};

export default config;
