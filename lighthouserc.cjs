/**
 * Lighthouse CI Configuration
 *
 * This configuration runs Lighthouse audits against all pages in the site.
 * Focus: Accessibility first, then Performance.
 *
 * Run with: pnpm lighthouse
 * Note: Uses dynamic port assignment to avoid conflicts
 */

// Find an available port dynamically
function _findAvailablePort(startPort = 14322) {
  const net = require('net');
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.listen(startPort, () => {
      const { port } = server.address();
      server.close(() => {
        resolve(port);
      });
    });

    server.on('error', err => {
      if (err.code === 'EADDRINUSE') {
        resolve(_findAvailablePort(startPort + 1));
      } else {
        reject(err);
      }
    });
  });
}

// Get port (use env var if set, otherwise find available)
const PORT = process.env.LHCI_PORT || '14322';
const BASE_URL = `http://localhost:${PORT}`;

module.exports = {
  ci: {
    collect: {
      // Start the preview server before running tests
      startServerCommand: `npm run build && npm run preview -- --port ${PORT}`,
      startServerReadyPattern: 'Local',
      startServerReadyTimeout: 30000,

      // All pages to audit
      url: [
        `${BASE_URL}/`,
        `${BASE_URL}/contact`,
        `${BASE_URL}/gallery`,
        `${BASE_URL}/privacy`,
        `${BASE_URL}/terms`,
        `${BASE_URL}/tools`,
        `${BASE_URL}/tools/background`,
        `${BASE_URL}/tools/contour`,
        `${BASE_URL}/tools/dither`,
        `${BASE_URL}/tools/editor`,
        `${BASE_URL}/tools/masking`,
        `${BASE_URL}/journal`,
      ],

      // Run 3 times per URL for more reliable scores
      numberOfRuns: 3,

      settings: {
        // Focus on both mobile and desktop
        preset: 'desktop',
        // Slow down for more realistic performance testing
        throttlingMethod: 'simulate',
        // Categories to audit (in priority order)
        onlyCategories: [
          'accessibility', // PRIMARY FOCUS
          'performance',
          'best-practices',
          'seo',
        ],
        // Design choice: links use color/hover states only
        skipAudits: ['link-in-text-block'],
      },
    },

    assert: {
      // Strict accessibility requirements - MUST PASS
      assertions: {
        // ===== ACCESSIBILITY (Critical - Must Pass) =====
        'categories:accessibility': ['error', { minScore: 0.9 }],

        // Specific accessibility audits that MUST pass
        'aria-allowed-attr': 'error',
        'aria-hidden-body': 'error',
        'aria-hidden-focus': 'error',
        'aria-required-attr': 'error',
        'aria-required-children': 'error',
        'aria-required-parent': 'error',
        'aria-roles': 'error',
        'aria-valid-attr': 'error',
        'aria-valid-attr-value': 'error',
        'button-name': 'error',
        bypass: 'error',
        'color-contrast': 'error',
        'document-title': 'error',
        'duplicate-id-aria': 'error',
        'form-field-multiple-labels': 'error',
        'frame-title': 'error',
        'html-has-lang': 'error',
        'html-lang-valid': 'error',
        'image-alt': 'error',
        'input-image-alt': 'error',
        label: 'error',
        'link-name': 'error',
        list: 'error',
        listitem: 'error',
        'meta-viewport': 'error',
        'object-alt': 'error',
        tabindex: 'error',
        'td-headers-attr': 'error',
        'th-has-data-cells': 'error',
        'valid-lang': 'error',
        'video-caption': 'error',

        // ===== PERFORMANCE (Important - Should Pass) =====
        'categories:performance': ['warn', { minScore: 0.8 }],

        // Core Web Vitals (2026 Strict Mode)
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 1800 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 200 }],
        'speed-index': ['warn', { maxNumericValue: 3400 }],

        // Performance best practices
        'uses-responsive-images': 'warn',
        'offscreen-images': 'warn',
        'render-blocking-resources': 'warn',
        'unused-css-rules': 'warn',
        'unused-javascript': 'warn',
        'efficient-animated-content': 'warn',
        'uses-optimized-images': 'warn',
        'uses-text-compression': 'warn',

        // ===== BEST PRACTICES =====
        'categories:best-practices': ['warn', { minScore: 0.9 }],

        // ===== SEO =====
        'categories:seo': ['warn', { minScore: 0.9 }],
        'is-crawlable': 'off', // Error pages are intentionally noindex; normal pages pass
        'link-text': 'error',
        'network-dependency-tree-insight': 'off', // LH 13 diagnostic insight, always scores 0
        'link-in-text-block': 'off', // Design choice: links use color/hover states only
      },
    },

    upload: {
      // Store reports locally in .lighthouseci directory
      target: 'filesystem',
      outputDir: '.lighthouseci',
      reportFilenamePattern: '%%PATHNAME%%-%%DATETIME%%-report.%%EXTENSION%%',
    },
  },
};
