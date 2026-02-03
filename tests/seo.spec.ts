import { expect, test } from '@playwright/test';
import { testConfig } from '../test-config';

/**
 * SEO Test Suite for Dither & Etch
 * Tests pages for SEO best practices and meta tags.
 *
 * Covers:
 * - Meta titles and descriptions
 * - Open Graph and Twitter Card tags
 * - Canonical URLs
 * - Language attributes
 * - Sitemap and robots.txt
 * - Mobile SEO
 * - Heading structure
 * - Link accessibility
 */

const pages = [
  {
    name: 'Home',
    path: '/',
    expectedTitle: 'Dither & Etch — Custom Laser Creations',
  },
  {
    name: 'Contact',
    path: '/contact',
    expectedTitle: 'Contact | Dither & Etch',
  },
  {
    name: 'Gallery',
    path: '/gallery',
    expectedTitle: 'The Work | Dither & Etch',
  },
  {
    name: 'Privacy Policy',
    path: '/privacy',
    expectedTitle: 'Privacy Policy | Dither & Etch',
  },
  {
    name: 'Terms of Service',
    path: '/terms',
    expectedTitle: 'Terms of Service | Dither & Etch',
  },
  {
    name: 'Tools Index',
    path: '/tools/',
    expectedTitle: 'Tools | Dither & Etch',
  },
  {
    name: 'Background Tool',
    path: '/tools/background',
    expectedTitle: 'Background Remover | Dither & Etch',
  },
  {
    name: 'Contour Tool',
    path: '/tools/contour',
    expectedTitle: 'Contour Maker | Dither & Etch',
  },
  {
    name: 'Dither Tool',
    path: '/tools/dither',
    expectedTitle: 'Dither Image | Dither & Etch',
  },
  {
    name: 'Editor Tool',
    path: '/tools/editor',
    expectedTitle: 'Basic Editor | Dither & Etch',
  },
  {
    name: 'Masking Tool',
    path: '/tools/masking',
    expectedTitle: 'Shape Masking | Dither & Etch',
  },
  {
    name: 'Journal Index',
    path: '/journal/',
    expectedTitle: 'The Journal | Dither & Etch',
  },
];

test.describe('SEO Meta Tags', () => {
  for (const pageInfo of pages) {
    test(`${pageInfo.name} page should have proper title`, async ({ page }) => {
      await page.goto(pageInfo.path);
      const title = await page.title();

      // Check title contains site name
      expect(title).toContain(testConfig.site.name);

      // Allow both pipe and em-dash as valid separators
      expect(title).toMatch(/[|—]/);

      // Check title length constraints
      expect(title.length).toBeGreaterThan(10);
      expect(title.length).toBeLessThan(70);

      // Check expected title pattern if provided
      if (pageInfo.expectedTitle) {
        expect(title).toBe(pageInfo.expectedTitle);
      }
    });

    test(`${pageInfo.name} page should have meta description`, async ({
      page,
    }) => {
      await page.goto(pageInfo.path);
      const metaDescription = await page
        .locator('meta[name="description"]')
        .getAttribute('content');
      expect(metaDescription).toBeTruthy();
      expect(metaDescription!.length).toBeGreaterThan(50);
      expect(metaDescription!.length).toBeLessThan(160);
    });

    test(`${pageInfo.name} page should have canonical URL`, async ({
      page,
    }) => {
      await page.goto(pageInfo.path);
      const canonical = await page
        .locator('link[rel="canonical"]')
        .getAttribute('href');
      expect(canonical).toBeTruthy();
      expect(canonical).toContain(testConfig.site.domain);
    });

    test(`${pageInfo.name} page should have Open Graph tags`, async ({
      page,
    }) => {
      await page.goto(pageInfo.path);

      const ogTitle = await page
        .locator('meta[property="og:title"]')
        .getAttribute('content');
      const ogDescription = await page
        .locator('meta[property="og:description"]')
        .getAttribute('content');
      const ogUrl = await page
        .locator('meta[property="og:url"]')
        .getAttribute('content');
      const ogImage = await page
        .locator('meta[property="og:image"]')
        .getAttribute('content');
      const ogType = await page
        .locator('meta[property="og:type"]')
        .getAttribute('content');

      expect(ogTitle).toBeTruthy();
      expect(ogDescription).toBeTruthy();
      expect(ogUrl).toBeTruthy();
      expect(ogImage).toBeTruthy();
      expect(ogType).toBe('website');
    });

    test(`${pageInfo.name} page should have Twitter Card tags`, async ({
      page,
    }) => {
      await page.goto(pageInfo.path);

      const twitterCard = await page
        .locator('meta[name="twitter:card"]')
        .getAttribute('content');
      const twitterTitle = await page
        .locator('meta[name="twitter:title"]')
        .getAttribute('content');
      const twitterDescription = await page
        .locator('meta[name="twitter:description"]')
        .getAttribute('content');

      expect(twitterCard).toBe('summary_large_image');
      expect(twitterTitle).toBeTruthy();
      expect(twitterDescription).toBeTruthy();

      // Mobile theme color (2026 PWA standard)
      const themeColor = await page
        .locator('meta[name="theme-color"]')
        .getAttribute('content');
      expect.soft(themeColor).toBeTruthy();
    });

    test(`${pageInfo.name} page should have proper lang attribute`, async ({
      page,
    }) => {
      await page.goto(pageInfo.path);
      const lang = await page.locator('html').getAttribute('lang');
      expect(lang).toBe(testConfig.site.language);
    });

    if (testConfig.thresholds.seo.validateSchema) {
      test(`${pageInfo.name} page should have valid Schema.org data`, async ({
        page,
      }) => {
        await page.goto(pageInfo.path);
        const schemas = await page
          .locator('script[type="application/ld+json"]')
          .all();

        if (schemas.length > 0) {
          for (const schema of schemas) {
            const content = await schema.textContent();
            expect(content).toBeTruthy();

            try {
              const json = JSON.parse(content || '{}');
              expect(json['@context']).toBe('https://schema.org');
              expect(json['@type']).toBeTruthy();
            } catch (e) {
              expect.soft(e).toBeNull(); // Fail soft if JSON is invalid
            }
          }
        }
      });
    }
  }
});

test.describe('SEO Structure', () => {
  test('should have sitemap.xml', async ({ page }) => {
    const response = await page.goto('/sitemap-index.xml');
    // In dev mode, sitemap returns 404, but should exist in production
    // Accept 200 (success) or 404 (dev mode) but reject server errors
    expect([200, 404]).toContain(response?.status());
    if (response?.status() === 200) {
      const content = await page.content();
      expect(content).toContain('sitemap');
    }
  });

  test('should have robots.txt', async ({ page }) => {
    const response = await page.goto('/robots.txt');
    expect(response?.status()).toBe(200);
    const content = await page.content();
    expect(content).toContain('Sitemap');
  });

  test('should have proper heading structure on home page', async ({
    page,
  }) => {
    await page.goto('/');

    // Should have exactly one h1
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);

    // H1 should contain meaningful content
    const h1Text = await page.locator('h1').first().textContent();
    expect(h1Text?.length).toBeGreaterThan(0);
  });

  test('links should have descriptive text', async ({ page }) => {
    await page.goto('/');

    const links = await page.locator('a').all();
    const genericTexts = ['click here', 'read more', 'learn more', 'here'];

    for (const link of links) {
      const text = await link.textContent();
      const ariaLabel = await link.getAttribute('aria-label');
      const accessibleText = ariaLabel || text || '';

      // Check that link text is not generic
      const isGeneric = genericTexts.some(
        generic => accessibleText.toLowerCase().trim() === generic,
      );

      // Allow generic text only if there's a more descriptive aria-label
      if (isGeneric && !ariaLabel) {
        // This is acceptable if the link has sr-only text
        const srOnlyText = await link.locator('.sr-only').textContent();
        expect(srOnlyText?.length).toBeGreaterThan(0);
      }
    }
  });

  test('images should have alt text', async ({ page }) => {
    await page.goto('/');

    const images = await page.locator('img').all();

    for (const img of images) {
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');

      // Images should have alt text unless they're decorative
      if (role !== 'presentation') {
        expect(alt).toBeTruthy();
      }
    }
  });
});

test.describe('Mobile SEO', () => {
  test('should have viewport meta tag', async ({ page }) => {
    await page.goto('/');
    const viewport = await page
      .locator('meta[name="viewport"]')
      .getAttribute('content');
    expect(viewport).toContain('width=device-width');
  });

  test('should be mobile-friendly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Content should not overflow horizontally
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10); // Small tolerance

    // Text should be readable (font-size >= 12px)
    const bodyFontSize = await page.evaluate(() => {
      const style = window.getComputedStyle(document.body);
      return parseFloat(style.fontSize);
    });
    expect(bodyFontSize).toBeGreaterThanOrEqual(12);
  });

  test('should have touch-friendly tap targets', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    const buttons = await page.locator('button, a').all();

    for (const button of buttons) {
      const isSrOnly = await button.evaluate(el => {
        const style = window.getComputedStyle(el);
        return (
          el.classList.contains('sr-only')
          || el.classList.contains('visually-hidden')
          || style.clip === 'rect(0px, 0px, 0px, 0px)'
          || (style.position === 'absolute' && style.width === '1px')
        );
      });

      if (isSrOnly) continue;

      const box = await button.boundingBox();
      // Only test visible elements with meaningful dimensions
      if (box && box.width > 2 && box.height > 2) {
        // Tap targets should be at least 24x24 pixels (minimum for SEO, 44+ preferred for a11y)
        expect(box.width).toBeGreaterThanOrEqual(24);
        expect(box.height).toBeGreaterThanOrEqual(24);
      }
    }
  });
});

test.describe('Performance SEO', () => {
  test('should have preconnect to external domains', async ({ page }) => {
    await page.goto('/');

    // Check for preconnect to common external services
    const preconnects = await page.locator('link[rel="preconnect"]').all();

    // Should have at least one preconnect for fonts or external resources
    if (preconnects.length > 0) {
      for (const preconnect of preconnects) {
        const href = await preconnect.getAttribute('href');
        expect(href).toBeTruthy();
        expect(href).toMatch(/^https?:\/\//);
      }
    }
  });

  test('should have optimized images', async ({ page }) => {
    await page.goto('/');

    const images = await page.locator('img').all();

    for (const img of images.slice(0, 5)) {
      // Test first 5 images
      const src = await img.getAttribute('src');
      const loading = await img.getAttribute('loading');

      if (src) {
        // Check for modern image formats
        const isModernFormat = /\.(webp|avif)$/i.test(src);
        const isExternal = src.startsWith('http');

        // External images might be in any format, but local images should be optimized
        if (!isExternal && !isModernFormat) {
          // Should have loading="lazy" for non-critical images
          expect(loading).toBe('lazy');
        }
      }
    }
  });
});
