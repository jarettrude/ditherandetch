#!/usr/bin/env node

/**
 * Batched Test Runner for Dither & Etch
 * Runs tests in smaller batches to prevent crashes and cleans up artifacts.
 *
 * Features:
 * - Organized test batches for different test types
 * - Memory management between batches
 * - Comprehensive cleanup
 * - Detailed reporting
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const testBatches = [
  {
    name: 'Accessibility - Core Pages',
    command:
      'npx playwright test tests/accessibility.spec.ts --project=chromium-light --project=chromium-dark --grep="Home|Contact|Gallery|Privacy|Terms"',
  },
  {
    name: 'Accessibility - Tools Pages',
    command:
      'npx playwright test tests/accessibility.spec.ts --project=chromium-light --project=chromium-dark --grep="Tools|Background|Contour|Dither|Editor|Masking"',
  },
  {
    name: 'Accessibility - Journal',
    command:
      'npx playwright test tests/accessibility.spec.ts --project=chromium-light --project=chromium-dark --grep="Journal"',
  },
  {
    name: 'Automated Discovery Tests',
    command:
      'npx playwright test tests/automated-discovery.spec.ts --project=chromium-light',
  },
  {
    name: 'SEO Tests',
    command: 'npx playwright test tests/seo.spec.ts --project=chromium-light',
  },
  {
    name: 'Performance Tests',
    command:
      'npx playwright test tests/performance.spec.ts --project=chromium-light',
  },
  {
    name: 'Mobile Accessibility',
    command:
      'npx playwright test tests/accessibility.spec.ts --project=mobile-chrome --project=mobile-safari --grep="Home|Contact|Gallery"',
  },
  {
    name: 'Cross-browser Tests',
    command:
      'npx playwright test tests/accessibility.spec.ts --project=firefox --project=webkit --grep="Home|Contact|Gallery"',
  },
  {
    name: 'Dark Mode Tests',
    command:
      'npx playwright test tests/accessibility.spec.ts --project=chromium-dark --grep="Home|Contact|Gallery"',
  },
  {
    name: 'Lighthouse CI',
    command: 'npx lhci autorun',
  },
];

function cleanup() {
  console.log('\n🧹 Cleaning up test artifacts...');

  const dirsToClean = ['test-results', 'playwright-report', '.lighthouseci'];

  dirsToClean.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`✓ Cleaned ${dir}`);
    }
  });

  // Clean up lighthouse JSON files
  try {
    const files = fs.readdirSync(process.cwd());
    files.forEach(file => {
      if (file.startsWith('lighthouse-') && file.endsWith('.json')) {
        fs.unlinkSync(path.join(process.cwd(), file));
        console.log(`✓ Cleaned ${file}`);
      }
    });
  } catch {
    // Ignore if directory doesn't exist
  }
}

function runBatch(batch) {
  console.log(`\n🧪 Running: ${batch.name}`);
  console.log(`Command: ${batch.command}`);

  try {
    execSync(batch.command, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    console.log(`✅ ${batch.name} - PASSED`);
    return true;
  } catch (error) {
    console.log(`❌ ${batch.name} - FAILED`);
    console.log(`Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Comprehensive Test Suite for Dither & Etch');
  console.log('======================================================');

  // Clean up before starting
  cleanup();

  let passed = 0;
  let failed = 0;

  for (const batch of testBatches) {
    const success = runBatch(batch);
    if (success) {
      passed++;
    } else {
      failed++;
    }

    // Small delay between batches to prevent resource exhaustion
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Optional cleanup between batches for memory management
    if (testBatches.indexOf(batch) % 3 === 2) {
      console.log('\n🔄 Mid-run cleanup...');
      cleanup();
    }
  }

  console.log('\n📊 Test Results Summary');
  console.log('=======================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Total: ${testBatches.length}`);

  if (failed > 0) {
    console.log('\n⚠️  Some tests failed. Check the logs above for details.');
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed!');
    console.log('\n📋 Test Coverage Summary:');
    console.log('  ✓ WCAG 2.1 AA Accessibility');
    console.log('  ✓ SEO Best Practices');
    console.log('  ✓ Core Web Vitals');
    console.log('  ✓ Mobile Responsiveness');
    console.log('  ✓ Cross-browser Compatibility');
    console.log('  ✓ Dark Mode Support');
    console.log('  ✓ Performance Optimization');

    // Generate final report if available
    try {
      console.log('\n📊 Opening HTML report...');
      execSync('npx playwright show-report playwright-report', {
        stdio: 'inherit',
        cwd: process.cwd(),
      });
    } catch {
      console.log('Note: Could not open HTML report (may not be available)');
    }
  }
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  console.log('\n🛑 Interrupted. Cleaning up...');
  cleanup();
  process.exit(0);
});

process.on('SIGTERM', () => {
  cleanup();
  process.exit(0);
});

main().catch(error => {
  console.error('❌ Test runner failed:', error);
  cleanup();
  process.exit(1);
});
