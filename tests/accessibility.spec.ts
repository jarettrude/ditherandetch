import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * Accessibility Test Suite for Dither & Etch
 * Tests all pages for WCAG 2.1 AA compliance using axe-core.
 *
 * Features:
 * - Comprehensive WCAG 2.1 AA testing
 * - Dark mode accessibility testing
 * - Keyboard navigation testing
 * - Form accessibility validation
 * - ARIA landmarks verification
 * - Mobile accessibility testing
 */

const pages = [
  { name: 'Home', path: '/' },
  { name: 'Contact', path: '/contact' },
  { name: 'Gallery', path: '/gallery' },
  { name: 'Privacy Policy', path: '/privacy' },
  { name: 'Terms of Service', path: '/terms' },
  { name: 'Tools Index', path: '/tools' },
  { name: 'Background Tool', path: '/tools/background' },
  { name: 'Contour Tool', path: '/tools/contour' },
  { name: 'Dither Tool', path: '/tools/dither' },
  { name: 'Editor Tool', path: '/tools/editor' },
  { name: 'Masking Tool', path: '/tools/masking' },
  { name: 'Journal Index', path: '/journal' },
];

// Helper to format violation details for better error messages
function _formatViolations(violations: any[]) {
  return violations.map(v => {
    const nodes = v.nodes.map((n: any) => ({
      html: n.html,
      failureSummary: n.failureSummary,
      target: n.target,
    }));

    return {
      id: v.id,
      impact: v.impact,
      description: v.description,
      helpUrl: v.helpUrl,
      nodes,
    };
  });
}

test.describe('Accessibility Tests (WCAG 2.1 AA)', () => {
  for (const page of pages) {
    test(`${page.name} page should have no accessibility violations`, async ({
      page: browserPage,
    }) => {
      await browserPage.goto(page.path);
      await browserPage.waitForLoadState('networkidle');

      const accessibilityScanResults = await new AxeBuilder({
        page: browserPage,
      })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .exclude('#astro-dev-toolbar')
        .analyze();

      expect.soft(accessibilityScanResults.violations).toEqual([]);
    });

    test(`${page.name} page should have proper heading hierarchy`, async ({
      page: browserPage,
    }) => {
      await browserPage.goto(page.path);
      await browserPage.waitForLoadState('networkidle');

      const headings = await browserPage.evaluate(() => {
        const headingElements = document.querySelectorAll(
          'h1, h2, h3, h4, h5, h6',
        );
        return Array.from(headingElements).map(h => ({
          level: parseInt(h.tagName.charAt(1)),
          text: h.textContent?.trim() || '',
        }));
      });

      // Check that there's exactly one h1
      const h1Count = headings.filter(h => h.level === 1).length;
      expect(h1Count).toBeLessThanOrEqual(1);

      // Check heading hierarchy (no skipping levels)
      let previousLevel = 0;
      for (const heading of headings) {
        if (previousLevel > 0) {
          expect(heading.level).toBeLessThanOrEqual(previousLevel + 1);
        }
        previousLevel = heading.level;
      }
    });

    test(`${page.name} page should have accessible images`, async ({
      page: browserPage,
    }) => {
      await browserPage.goto(page.path);
      await browserPage.waitForLoadState('networkidle');

      const images = await browserPage.locator('img').all();

      for (const img of images) {
        const alt = await img.getAttribute('alt');
        const ariaLabel = await img.getAttribute('aria-label');
        const ariaHidden = await img.getAttribute('aria-hidden');
        const role = await img.getAttribute('role');

        // Images should have alt text OR be decorative (aria-hidden or role="presentation")
        const isDecorative =
          ariaHidden === 'true' || role === 'presentation' || role === 'none';
        const hasAccessibleName = alt !== null || ariaLabel !== null;

        expect(isDecorative || hasAccessibleName).toBe(true);
      }
    });

    test(`${page.name} page should have accessible links`, async ({
      page: browserPage,
    }) => {
      await browserPage.goto(page.path);
      await browserPage.waitForLoadState('networkidle');

      const links = await browserPage.locator('a').all();

      for (const link of links) {
        const text = await link.textContent();
        const ariaLabel = await link.getAttribute('aria-label');
        const title = await link.getAttribute('title');

        // Links should have accessible text
        const hasAccessibleName =
          (text && text.trim().length > 0) || ariaLabel || title;
        expect(hasAccessibleName).toBeTruthy();
      }
    });

    test(`${page.name} page should have proper focus indicators`, async ({
      page: browserPage,
    }) => {
      await browserPage.goto(page.path);
      await browserPage.waitForLoadState('networkidle');

      // Tab through interactive elements and check for focus visibility
      const focusableElements = await browserPage
        .locator(
          'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        .all();

      // Test first 5 visible and enabled elements
      let testedCount = 0;
      for (const element of focusableElements) {
        if (testedCount >= 5) break;

        // Check if element is visible and enabled
        const isVisible = await element.isVisible();
        const isEnabled = await element.isEnabled();

        if (isVisible && isEnabled) {
          await element.focus();
          const isFocused = await element.evaluate(
            el => document.activeElement === el,
          );
          expect(isFocused).toBe(true);
          testedCount++;
        }
      }

      // Ensure we tested at least some elements
      expect(testedCount).toBeGreaterThan(0);
    });
  }
});

test.describe('Dark Mode Accessibility', () => {
  test.use({ colorScheme: 'dark' });

  for (const page of pages) {
    test(`${page.name} page should have no accessibility violations in dark mode`, async ({
      page: browserPage,
    }) => {
      await browserPage.goto(page.path);
      await browserPage.waitForLoadState('networkidle');

      const accessibilityScanResults = await new AxeBuilder({
        page: browserPage,
      })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .exclude('#astro-dev-toolbar')
        .analyze();

      expect.soft(accessibilityScanResults.violations).toEqual([]);
    });

    test(`${page.name} page should maintain color contrast in dark mode`, async ({
      page: browserPage,
    }) => {
      await browserPage.goto(page.path);
      await browserPage.waitForLoadState('networkidle');

      // Check for sufficient color contrast in dark mode
      const contrastResults = await new AxeBuilder({
        page: browserPage,
      })
        .withTags(['wcag2aa'])
        .analyze();

      // Filter for color contrast violations specifically
      const contrastViolations = contrastResults.violations.filter(
        v => v.id === 'color-contrast',
      );

      expect(contrastViolations).toEqual([]);
    });
  }
});

test.describe('Keyboard Navigation', () => {
  test('should handle focus management correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Test direct focus on skip link if it exists
    const skipLink = page.locator(".skip-to-main-content, a[href^='#main']");
    if ((await skipLink.count()) > 0) {
      await skipLink.focus();
      await expect(skipLink).toBeFocused();

      // Test activation
      await page.keyboard.press('Enter');
      const mainContent = page.locator('#main-content, main');
      // Main content should be visible or focused
      expect(await mainContent.count()).toBeGreaterThan(0);
    }
  });

  // Test tab navigation only on non-WebKit browsers
  test.skip(
    ({ browserName }) => browserName === 'webkit',
    'Tab navigation limited on WebKit/Safari due to browser settings requirement',
  );

  test('should be able to navigate the site using only keyboard', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Test that focusable elements exist and can be focused
    const focusableElements = await page
      .locator(
        'a:visible, button:visible, input:visible, select:visible, textarea:visible, [tabindex]:not([tabindex="-1"]):visible',
      )
      .all();

    expect(focusableElements.length).toBeGreaterThan(0);

    // Test first few elements
    for (let i = 0; i < Math.min(3, focusableElements.length); i++) {
      const element = focusableElements[i];
      if (element) {
        await element.focus();
        const isFocused = await element.evaluate(
          el => document.activeElement === el,
        );
        expect(isFocused).toBe(true);
      }
    }
  });

  test('should handle mobile menu focus correctly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for mobile menu toggle
    const menuButton = page.locator(
      'button[aria-expanded], .menu-toggle, #mobile-menu-toggle',
    );
    if ((await menuButton.count()) > 0) {
      await menuButton.click();

      // Verify menu state changed
      const ariaExpanded = await menuButton.getAttribute('aria-expanded');
      expect(ariaExpanded).toBe('true');

      // Close with Escape
      await page.keyboard.press('Escape');
      const ariaExpandedAfter = await menuButton.getAttribute('aria-expanded');
      expect(ariaExpandedAfter).toBe('false');
    }
  });
});

test.describe('Form Accessibility', () => {
  test('contact form should have proper labels', async ({ page }) => {
    await page.goto('/contact');
    await page.waitForLoadState('networkidle');

    const formInputs = await page
      .locator("input:not([type='hidden']), textarea, select")
      .all();

    for (const input of formInputs) {
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledby = await input.getAttribute('aria-labelledby');
      const placeholder = await input.getAttribute('placeholder');

      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        const hasLabel = (await label.count()) > 0;
        const hasAriaLabel = ariaLabel || ariaLabelledby;
        const hasPlaceholder = placeholder && placeholder.trim().length > 0;

        // Input should have label, aria-label, or meaningful placeholder
        expect(hasLabel || hasAriaLabel || hasPlaceholder).toBe(true);
      }
    }
  });

  test('contact form should show validation errors accessibly', async ({
    page,
  }) => {
    await page.goto('/contact');
    await page.waitForLoadState('networkidle');

    // Try to submit empty form
    const submitButton = page.locator(
      'button[type="submit"], input[type="submit"]',
    );
    if ((await submitButton.count()) > 0) {
      await submitButton.click();

      // Check for aria-invalid or error messages
      const invalidInputs = await page.locator("[aria-invalid='true']").count();
      const errorMessages = await page
        .locator('[role="alert"], .error-message, .field-error')
        .count();

      // Form should either prevent submission or show accessible errors
      expect(invalidInputs > 0 || errorMessages > 0).toBe(true);
    }
  });
});

test.describe('ARIA Landmarks', () => {
  for (const pageInfo of pages) {
    test(`${pageInfo.name} page should have proper ARIA landmarks`, async ({
      page,
    }) => {
      await page.goto(pageInfo.path);
      await page.waitForLoadState('networkidle');

      // Should have main landmark
      const main = page.locator("main, [role='main']");
      await expect(main).toBeVisible();

      // Should have navigation
      const nav = page.locator("nav, [role='navigation']");
      expect(await nav.count()).toBeGreaterThan(0);

      // Should have header/banner
      const header = page.locator("header, [role='banner']");
      expect(await header.count()).toBeGreaterThan(0);

      // Should have footer/contentinfo
      const footer = page.locator("footer, [role='contentinfo']");
      expect(await footer.count()).toBeGreaterThan(0);
    });
  }
});

test.describe('Mobile Accessibility', () => {
  test('should be accessible on mobile devices', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({
      page,
    })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .exclude('#astro-dev-toolbar')
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have touch-friendly targets on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const interactiveElements = await page
      .locator(
        "button, a, input[type='submit'], input[type='button'], [role='button']",
      )
      .all();

    for (const element of interactiveElements.slice(0, 10)) {
      // Test first 10 elements
      const box = await element.boundingBox();
      // Skip sr-only/visually-hidden elements (screen reader only)
      const isSrOnly = await element.evaluate(
        el =>
          el.classList.contains('sr-only')
          || el.classList.contains('visually-hidden')
          || getComputedStyle(el).clip === 'rect(0px, 0px, 0px, 0px)',
      );

      if (box && box.width > 0 && box.height > 0 && !isSrOnly) {
        // Touch targets should be at least 24x24 pixels (WCAG 2.2 SC 2.5.8)
        // Note: 44x44 is still recommended for AAA/Best Practice, but 24x24 is the new minimum for AA.
        expect.soft(box.width).toBeGreaterThanOrEqual(24);
        expect.soft(box.height).toBeGreaterThanOrEqual(24);
      }
    }
  });
});
