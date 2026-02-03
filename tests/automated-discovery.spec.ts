import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { testConfig } from '../test-config';

/**
 * Automated URL Discovery Test Suite for Dither & Etch
 * Automatically discovers pages from sitemap and tests them.
 *
 * This eliminates the need to manually maintain page lists in test files.
 *
 * Discovery methods (in order):
 * 1. Sitemap parsing - reads sitemap.xml automatically
 * 2. Navigation crawling - finds links in navigation menus
 * 3. Smart crawling - follows internal links to discover more pages
 * 4. Manual fallback - uses predefined list if auto-discovery fails
 */

// Function to fetch all URLs from sitemap
async function getSitemapUrls(baseURL: string): Promise<string[]> {
  try {
    const response = await fetch(`${baseURL}/sitemap-index.xml`);
    const sitemapText = await response.text();

    // Parse sitemap XML to extract URLs
    const urlRegex = /<loc>(.*?)<\/loc>/g;
    const urls = [];
    let match;

    while ((match = urlRegex.exec(sitemapText)) !== null) {
      const url = match[1];
      if (!url) continue;
      // Convert full URLs to paths
      const path = url.replace(baseURL, '');
      if (path && path !== '/') {
        urls.push(path);
      }
    }

    return urls;
  } catch (error) {
    console.log('Failed to fetch sitemap:', error);
    return [];
  }
}

// Function to discover pages by crawling navigation
async function discoverPagesFromNavigation(
  page: any,
): Promise<{ name: string; path: string }[]> {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Find all navigation links
  const navLinks = await page
    .locator('nav a, header a, [role="navigation"] a')
    .all();
  const pages = [{ name: 'Home', path: '/' }];

  for (const link of navLinks) {
    const href = await link.getAttribute('href');
    const text = await link.textContent();

    if (
      href?.startsWith('/')
      && !href.includes('#')
      && !href.includes('mailto:')
      && !href.includes('tel:')
    ) {
      // Avoid duplicates
      if (!pages.find(p => p.path === href)) {
        pages.push({
          name:
            text?.trim()
            || href
              .replace('/', '')
              .replace(/-/g, ' ')
              .replace(/\b\w/g, (l: string) => l.toUpperCase())
            || href,
          path: href,
        });
      }
    }
  }

  return pages;
}

// Function to crawl for additional pages
async function crawlForPages(
  page: any,
  startPaths: string[],
): Promise<{ name: string; path: string }[]> {
  const discovered = new Set<string>();
  const pages: { name: string; path: string }[] = [];

  for (const startPath of startPaths) {
    await page.goto(startPath);
    await page.waitForLoadState('networkidle');

    // Find all internal links
    const links = await page.locator('a[href^="/"]').all();

    for (const link of links) {
      const href = await link.getAttribute('href');

      if (
        href
        && !discovered.has(href)
        && !href.includes('#')
        && href.length > 1
      ) {
        discovered.add(href);

        // Try to get a meaningful name
        const text = await link.textContent();
        const name =
          text?.trim()
          || href
            .replace('/', '')
            .replace(/-/g, ' ')
            .replace(/\b\w/g, (l: string) => l.toUpperCase());

        pages.push({ name, path: href });
      }
    }
  }

  return pages;
}

// Function to filter pages based on exclusion patterns
function filterPages(
  pages: { name: string; path: string }[],
): { name: string; path: string }[] {
  return pages.filter(page => {
    return !testConfig.discovery.excludePatterns.some(
      pattern => page.path.includes(pattern) || page.path.startsWith(pattern),
    );
  });
}

test.describe('Automated Discovery Tests', () => {
  let pages: { name: string; path: string }[] = [];

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      console.log('Starting automated page discovery...');

      // Try sitemap first
      const discoveredUrls = await getSitemapUrls(testConfig.baseURL);

      if (discoveredUrls.length > 0) {
        console.log(`Found ${discoveredUrls.length} pages in sitemap`);
        pages = discoveredUrls.map(path => ({
          name:
            path
              .replace('/', '')
              .replace(/-/g, ' ')
              .replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Home',
          path,
        }));
      } else {
        // Fallback to navigation discovery
        console.log('Sitemap not found, discovering from navigation...');
        pages = await discoverPagesFromNavigation(page);

        // Then crawl for more pages
        const startPaths = pages.map(p => p.path).slice(0, 5); // Limit to avoid infinite crawl
        const crawledPages = await crawlForPages(page, startPaths);

        // Merge without duplicates
        crawledPages.forEach(p => {
          if (!pages.find(existing => existing.path === p.path)) {
            pages.push(p);
          }
        });
      }

      // Filter out excluded patterns
      pages = filterPages(pages);

      console.log(
        `Discovered ${pages.length} pages:`,
        pages.map(p => p.path),
      );
    } catch (error) {
      console.log('Auto-discovery failed, using fallback pages:', error);
      // Fallback to predefined pages
      pages = testConfig.fallbackPages;
    } finally {
      await context.close();
    }
  });

  for (const page of pages) {
    test(`${page.name} (${page.path}) should have no accessibility violations`, async ({
      page: browserPage,
    }) => {
      await browserPage.goto(page.path);
      await browserPage.waitForLoadState('networkidle');

      const accessibilityScanResults = await new AxeBuilder({
        page: browserPage,
      })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();

      expect.soft(accessibilityScanResults.violations).toEqual([]);
    });

    test(`${page.name} (${page.path}) should load successfully`, async ({
      page: browserPage,
    }) => {
      const response = await browserPage.goto(page.path);
      expect(response?.status()).toBe(200);
    });

    test(`${page.name} (${page.path}) should have proper SEO basics`, async ({
      page: browserPage,
    }) => {
      await browserPage.goto(page.path);

      // Check title
      const title = await browserPage.title();
      expect(title.length).toBeGreaterThan(10);
      expect(title.length).toBeLessThan(70);

      // Check that title contains site name
      expect(title).toContain(testConfig.site.name);

      // Check meta description
      const metaDescription = await browserPage
        .locator('meta[name="description"]')
        .getAttribute('content');
      expect(metaDescription).toBeTruthy();
      expect(metaDescription!.length).toBeGreaterThan(50);
      expect(metaDescription!.length).toBeLessThan(160);

      // Check lang attribute
      const lang = await browserPage.locator('html').getAttribute('lang');
      expect(lang).toBe(testConfig.site.language);

      // Check canonical URL
      const canonical = await browserPage
        .locator('link[rel="canonical"]')
        .getAttribute('href');
      expect(canonical).toBeTruthy();
      expect(canonical).toContain(testConfig.site.domain);
    });

    test(`${page.name} (${page.path}) should have proper heading structure`, async ({
      page: browserPage,
    }) => {
      await browserPage.goto(page.path);

      // Check for exactly one h1
      const h1s = await browserPage.locator('h1').count();
      expect(h1s).toBe(1);

      // Check heading hierarchy (h1 should come before h2, etc.)
      const headings = await browserPage
        .locator('h1, h2, h3, h4, h5, h6')
        .all();
      let lastLevel = 0;

      for (const heading of headings) {
        const tagName = await heading.evaluate((el: any) =>
          el.tagName.toLowerCase(),
        );
        const level = parseInt(tagName.charAt(1));

        // Heading levels should not skip (e.g., h1 to h3 without h2)
        expect(level).toBeLessThanOrEqual(lastLevel + 1);
        lastLevel = level;
      }
    });
  }
});
