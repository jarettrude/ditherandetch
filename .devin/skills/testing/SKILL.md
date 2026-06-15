---
name: testing
description: How to run, debug, and read test results for this project. Covers Playwright, Lighthouse, and all test output locations.
use_when:
  - "Run tests"
  - "Fix failing tests"
  - "Check test results"
  - "Debug test failures"
  - "Run accessibility tests"
  - "Run SEO tests"
  - "Run performance tests"
  - "Run lighthouse"
  - "Test my site"
categories:
  - Testing
  - Playwright
  - Lighthouse
  - CI
---

# Testing Skill

## Critical: Reading Test Results

**CLI output from Playwright and Lighthouse is unreliable in this environment.** Always read the actual result files instead of relying on terminal output.

### Playwright Results

After running any Playwright test, read results from these files:

1. **JSON results** (best for programmatic analysis):
   - Path: `test-results/results.json`
   - Parse with python3 or jq to extract failures
   - Example to get all failures:
     ```
     cat test-results/results.json | python3 -c "
     import json, sys
     data = json.load(sys.stdin)
     for suite in data.get('suites', []):
         for s in suite.get('suites', []):
             for spec in s.get('specs', []):
                 for test in spec.get('tests', []):
                     for result in test.get('results', []):
                         if result.get('status') != 'passed':
                             print(f'FAIL: {spec[\"title\"]}')
                             err = result.get('error', {})
                             if err:
                                 print(f'  Error: {err.get(\"message\", \"\")[:300]}')
                             print()
     "
     ```

2. **JUnit XML** (structured):
   - Path: `test-results/junit.xml`
   - Contains `<failure>` elements with error messages

3. **HTML report** (visual, for user):
   - Path: `playwright-report/index.html`
   - Open with: `npx playwright show-report`

4. **Per-test artifacts** (screenshots, traces):
   - Path: `test-results/<test-name-slug>/`
   - Contains screenshots on failure and trace files

### Lighthouse Results

- Path: `.lighthouseci/`
- Contains JSON reports per URL
- Read `.lighthouseci/lhr-*.json` for full Lighthouse results
- Key scores at `.categories.[performance|accessibility|seo|best-practices].score`

## Test Commands

| Command | What it does | Port |
|---------|-------------|------|
| `npm test` | All Playwright tests, all browsers | 4321 |
| `npm run test:a11y` | Accessibility tests only | 14323 |
| `npm run test:perf` | Performance tests only | 14324 |
| `npm run test:seo` | SEO tests only | 14325 |
| `npm run test:discovery` | Auto-discovery tests | 14326 |
| `npm run test:lighthouse` | Lighthouse CI | 14322 |
| `npm run test:ci` | CI subset (chromium light+dark) | 4321 |

### Running a single project (faster iteration)

```bash
npx playwright test --project=chromium-light
```

### Running a single test file

```bash
npx playwright test tests/seo.spec.ts --project=chromium-light
```

## Workflow: Fix Failing Tests

1. Run the tests (non-blocking, they take 1-2 minutes)
2. **Wait for completion**, then read `test-results/results.json` using the python3 snippet above
3. Analyze the error messages to identify root cause
4. Fix the code (not the tests, unless tests are wrong)
5. Re-run and re-read results
6. Repeat until 0 failures

## Project Test Architecture

- **Config**: `playwright.config.ts` — multi-browser, light/dark mode, mobile
- **Shared config**: `test-config.ts` — URLs, thresholds, site metadata
- **Test files**: `tests/*.spec.ts`
- **Pages tested**: Defined in arrays at the top of each spec file — keep these in sync with actual routes
- **Web server**: Tests auto-build and start a preview server before running

## Common Pitfalls

- **Trailing slashes**: Astro config uses `trailingSlash: 'never'` and `build.format: 'file'`. Test page paths must NOT have trailing slashes (use `/tools` not `/tools/`).
- **Port conflicts**: Each test command uses a unique port. Check `TEST_PORT` env var.
- **Timeouts**: Build + preview startup can take up to 120s. If tests fail with connection errors, the server may not have started.
- **404 in tests**: If a page returns "404: Not Found", the path is wrong — check the built output in `dist/`.
