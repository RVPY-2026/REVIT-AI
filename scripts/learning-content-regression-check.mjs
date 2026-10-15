import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require(require.resolve('playwright', { paths: [process.env.RVPY_BROWSER_PACKAGES ?? 'C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'] }));
const browser = await chromium.launch({ channel: 'chrome', headless: true, env: { ...process.env, TMP: resolve('tmp'), TEMP: resolve('tmp') } });
const context = await browser.newContext();
await context.addCookies([{ name: 'rvpy-mock-role', value: 'admin', url: 'http://localhost:3106' }]);
const page = await context.newPage();
await page.route('**/*', route => route.request().headers()['next-router-prefetch'] ? route.abort() : route.continue());
const checks = [];
try {
  await page.goto('http://localhost:3106/quan-tri/hoc-vien');
  for (const width of [375, 768, 1280]) for (const theme of ['light', 'dark']) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(theme => localStorage.setItem('theme', theme), theme);
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'Học viên', exact: true }).waitFor();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    if (overflow) throw new Error(`Student list overflow at ${width}/${theme}`);
    await page.screenshot({ path: `design/reference/admin-learning-content/students-${width}-${theme}-regression.png`, animations: 'disabled', caret: 'initial' });
    checks.push({ width, theme, overflow, tableVisible: await page.locator('main table').first().isVisible() });
  }
} finally {
  await writeFile('design/reference/admin-learning-content/students-regression-checks.json', JSON.stringify(checks, null, 2));
  await browser.close();
}
console.log(JSON.stringify(checks));
