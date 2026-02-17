/**
 * Test Configuration for Dither & Etch
 * Central place to define test URLs and settings
 */

export const testConfig = {
  baseURL: `http://localhost:${process.env.TEST_PORT || '14321'}`,

  // Auto-discovery settings
  discovery: {
    enabled: true,
    methods: ['sitemap', 'navigation', 'crawl'],
    maxDepth: 2,
    excludePatterns: [
      '/admin',
      '/api',
      '/login',
      '/logout',
      '/dashboard',
      '/profile',
      '/settings',
      '/_astro',
      '/_image',
      '/.well-known',
    ],
  },

  // Manual fallback pages (used if auto-discovery fails)
  fallbackPages: [
    { name: 'Home', path: '/' },
    { name: 'Contact', path: '/contact' },
    { name: 'Gallery', path: '/gallery' },
    { name: 'Privacy', path: '/privacy' },
    { name: 'Terms', path: '/terms' },
    { name: 'Tools Index', path: '/tools' },
    { name: 'Background Tool', path: '/tools/background' },
    { name: 'Contour Tool', path: '/tools/contour' },
    { name: 'Dither Tool', path: '/tools/dither' },
    { name: 'Editor Tool', path: '/tools/editor' },
    { name: 'Masking Tool', path: '/tools/masking' },
    { name: 'Journal Index', path: '/journal' },
  ],

  // Test thresholds (2026 Standards)
  thresholds: {
    performance: {
      loadTime: 4000, // Stricter load time
      lcp: 2500, // Core Web Vitals "Good" limit
      cls: 0.1, // Core Web Vitals "Good" limit
      inp: 200, // Core Web Vitals "Good" limit (Interaction to Next Paint)
      tbt: 200, // Total Blocking Time (proxy for interactivity)
    },
    accessibility: {
      minScore: 1.0, // Aim for perfection
    },
    seo: {
      minScore: 1.0,
      validateSchema: true,
    },
  },

  // Site-specific info
  site: {
    name: 'Dither & Etch',
    domain: 'ditherandetch.ca',
    language: 'en-CA',
    expectedTitlePattern: ' | Dither & Etch',
  },
};
