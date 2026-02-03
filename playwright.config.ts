import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Dither & Etch (2026 Best Practices)
 *
 * Configures test runners for accessibility, performance, and SEO testing.
 * Features:
 * - Multi-browser testing (Chrome, Firefox, Safari)
 * - Light and dark mode testing
 * - Mobile responsiveness testing
 * - Parallel execution for speed
 * - Comprehensive reporting
 * - Modern locator strategies
 * - Enhanced debugging capabilities
 * - Dynamic port assignment to avoid conflicts
 */

// Use Astro's default preview port (4321) when TEST_PORT is not set
const PORT = process.env.TEST_PORT || '4321';
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests',

  // Output directory for test artifacts
  outputDir: 'test-results',

  // Run tests in parallel for speed (2026 best practice)
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only for stability
  retries: process.env.CI ? 2 : 0,

  // Optimize workers for 2026 hardware - 75% utilization for faster CI
  workers: process.env.CI ? '75%' : '50%',

  // Enhanced reporter configuration for comprehensive test results
  reporter: [
    [
      'html',
      {
        outputFolder: 'playwright-report',
        open: process.env.CI ? 'never' : 'on-failure',
      },
    ],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],

  // Global test configuration with 2026 enhancements
  use: {
    // Base URL for the preview server
    baseURL: BASE_URL,

    // Enhanced trace configuration for debugging
    trace: process.env.CI ? 'retain-on-failure' : 'on-first-retry',

    // Enhanced screenshot configuration
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true,
    },

    // Enhanced video configuration for CI debugging
    video: process.env.CI ? 'retain-on-failure' : 'off',

    // 2026 best practice: increased timeout for complex apps
    actionTimeout: 15000,
    navigationTimeout: 30000,

    // Enhanced viewport configuration
    viewport: { width: 1280, height: 720 },

    // Ignore HTTPS errors for local development
    ignoreHTTPSErrors: !process.env.CI,
  },

  // Expect configuration for consistent assertions
  expect: {
    timeout: 5000, // Stricter generic assertion timeout for snappier failure feedback
    toHaveScreenshot: { maxDiffPixelRatio: 0.05 },
  },

  // Configure projects for cross-browser and viewport testing
  projects: [
    // Desktop browsers - light and dark mode
    {
      name: 'chromium-light',
      use: {
        ...devices['Desktop Chrome'],
        colorScheme: 'light',
      },
    },
    {
      name: 'chromium-dark',
      use: {
        ...devices['Desktop Chrome'],
        colorScheme: 'dark',
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
      },
    },

    // Mobile devices for responsive testing
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 7'],
      },
    },
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 14'],
      },
    },

    // Tablet testing
    {
      name: 'tablet',
      use: {
        ...devices['iPad Pro 11'],
      },
    },

    // High-end Android (2026 Standard)
    {
      name: 'mobile-android-high',
      use: {
        ...devices['Pixel 7'], // Or update to Pixel 9/10 equivalents if key available, safely fallback to 7 as "modern"
        defaultBrowserType: 'chromium',
      },
    },
  ],

  // Run the preview server before starting tests
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT}`,
    port: parseInt(PORT, 10),
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
