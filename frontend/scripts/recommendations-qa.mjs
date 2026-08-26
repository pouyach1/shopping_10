/**
 * PDP recommendations QA — unit logic + browser checks.
 * Usage: node scripts/recommendations-qa.mjs
 * Expects: vite preview at BASE_URL (default http://127.0.0.1:4173)
 */
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:4173';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, '..');

const unit = spawnSync(
  'npx',
  [
    '--yes',
    'tsx',
    path.join(__dirname, 'recommendations-unit.mts'),
  ],
  { cwd: frontendRoot, encoding: 'utf8' },
);
if (unit.status !== 0) {
  console.error(unit.stdout);
  console.error(unit.stderr);
  process.exit(unit.status ?? 1);
}
console.log(unit.stdout.trim());

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});

await page.goto(BASE + '/product/silk-blend-blouse', {
  waitUntil: 'domcontentloaded',
});
await page.getByRole('heading', { level: 1 }).waitFor();

const relatedHeading = page.getByRole('heading', { name: 'محصولات مرتبط' });
await relatedHeading.waitFor({ state: 'visible' });

const hasComplementary =
  (await page.getByRole('heading', { name: 'محصولات مکمل' }).count()) > 0;
if (hasComplementary) {
  assert.equal(
    await page.getByText('برای کامل‌تر شدن انتخاب شما').count(),
    1,
  );
}

const hasDiscovery =
  (await page.getByRole('heading', { name: 'این محصولات را هم ببینید' })
    .count()) > 0;

async function sectionHrefs(headingName) {
  const heading = page.getByRole('heading', { name: headingName });
  if ((await heading.count()) === 0) return [];
  return heading.evaluate((h) => {
    const section = h.closest('section');
    if (!section) return [];
    return [...section.querySelectorAll('a[href^="/product/"]')]
      .map((a) => a.getAttribute('href'))
      .filter(Boolean);
  });
}

const relatedHrefs = await sectionHrefs('محصولات مرتبط');
const complementaryHrefs = hasComplementary
  ? await sectionHrefs('محصولات مکمل')
  : [];
const discoveryHrefs = hasDiscovery
  ? await sectionHrefs('این محصولات را هم ببینید')
  : [];

assert.ok(relatedHrefs.length > 0, 'related section should list products');
assert.equal(
  relatedHrefs.includes('/product/silk-blend-blouse'),
  false,
  'related must not include current PDP',
);

const all = [...relatedHrefs, ...complementaryHrefs, ...discoveryHrefs];
assert.equal(new Set(all).size, all.length, 'DOM must not repeat products');

const firstRelated = relatedHrefs[0];
await page.locator(`section >> a[href="${firstRelated}"]`).first().click();
await page.waitForURL(`**${firstRelated}`);
await page.getByRole('heading', { level: 1 }).waitFor();
await page.goBack();
await page.waitForURL('**/product/silk-blend-blouse');

assert.equal(
  await page.locator('button', { hasText: 'راهنمای سایز' }).count(),
  1,
);
assert.equal(
  await page.locator('body').innerText().then((t) => t.includes('★★★★★')),
  false,
);

for (const width of [320, 360, 390, 430, 1024, 1280]) {
  await page.setViewportSize({
    width,
    height: width >= 1024 ? 900 : 800,
  });
  await page.goto(BASE + '/product/silk-blend-blouse', {
    waitUntil: 'domcontentloaded',
  });
  await page.getByRole('heading', { name: 'محصولات مرتبط' }).waitFor();
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth > doc.clientWidth + 1;
  });
  assert.equal(overflow, false, `horizontal overflow at ${width}`);
}

assert.equal(
  consoleErrors.length,
  0,
  'console errors: ' + consoleErrors.join('; '),
);

console.log('PASS browser: sections, dedupe, navigation, overflow');
console.log('RECOMMENDATIONS QA PASSED');

await browser.close();
