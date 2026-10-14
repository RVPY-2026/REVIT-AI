import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = require(require.resolve("playwright", { paths: [process.env.RVPY_BROWSER_PACKAGES ?? "C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules"] }));
const output = resolve("design/reference/admin-learning-content");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true, env: { ...process.env, TMP: resolve("tmp"), TEMP: resolve("tmp") } });
const context = await browser.newContext();
await context.addCookies([{ name: "rvpy-mock-role", value: "admin", url: "http://localhost:3106" }]);
const page = await context.newPage();
await page.route("**/*", (route) => route.request().headers()["next-router-prefetch"] ? route.abort() : route.continue());
const results = [];
page.setDefaultTimeout(60000);
try {
  for (const route of (process.env.RVPY_VISUAL_SKIP_REFERENCES ? [] : ["/ui-kit", "/quan-tri/hoc-vien", "/quan-tri/phan-quyen", "/quan-tri/nhap-du-lieu"])) {
    await page.goto(`http://localhost:3106${route}`, { waitUntil: "domcontentloaded" }); await page.locator("main").first().waitFor();
    results.push({ reference: route, heading: await page.locator("h1").first().textContent().catch(() => "") });
  }
  if (page.url() === "about:blank") { await page.goto("http://localhost:3106/quan-tri/tai-lieu", { waitUntil: "domcontentloaded" }); await page.locator('[data-learning-ready="true"]').waitFor(); }
  for (const width of (process.env.RVPY_VISUAL_WIDTH ? [Number(process.env.RVPY_VISUAL_WIDTH)] : [375, 768, 1280])) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ["light", "dark"]) {
      await page.emulateMedia({ colorScheme: theme });
      await page.evaluate((value) => localStorage.setItem("theme", value), theme);
      for (const [route, name, action, field] of (process.env.RVPY_VISUAL_PROGRESS_ONLY ? [] : [["tai-lieu", "resources", "Thêm tài liệu", "Tên tài liệu"], ["chuong-trinh", "curriculum", "Thêm bài học", "Tên bài học"]])) {
        for (const state of (process.env.RVPY_VISUAL_FORMS_ONLY ? [] : ["loading", "empty", "populated", "error", "one", "many"])) {
          await page.goto(`http://localhost:3106/quan-tri/${route}?state=${state}`, { waitUntil: "domcontentloaded" });
          if (state === "loading") await page.getByRole("main", { name: "Đang tải nội dung học" }).waitFor();
          else if (state === "error") { await page.getByRole("heading", { name: "Chưa tải được nội dung học" }).waitFor(); await page.keyboard.press("Escape"); }
          else await page.locator('[data-learning-ready="true"]').waitFor();
          await page.screenshot({ path: `${output}/${name}-${width}-${theme}-${state}.png`, fullPage: false, caret: "initial", animations: "disabled" });
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
          results.push({ page: name, width, theme, state, overflow });
          if (overflow) throw new Error(`Page overflow: ${name}/${width}/${theme}/${state}`);
        }
        await page.goto(`http://localhost:3106/quan-tri/${route}`, { waitUntil: "domcontentloaded" });
        await page.locator('[data-learning-ready="true"]').waitFor();
        await page.getByRole("button", { name: action, exact: true }).first().focus();
        await page.keyboard.press("Enter"); await page.getByRole("dialog").waitFor();
        await page.screenshot({ path: `${output}/${name}-${width}-${theme}-dialog.png`, fullPage: false, caret: "initial", animations: "disabled" });
        const title = page.getByRole("textbox", { name: field, exact: true });
        await title.fill(" "); await page.keyboard.press("Tab");
        await page.getByText(`Bạn nhập ${name === "resources" ? "tên tài liệu" : "tên bài học"}.`, { exact: true }).waitFor();
        await page.screenshot({ path: `${output}/${name}-${width}-${theme}-validation.png`, fullPage: false, caret: "initial", animations: "disabled" });
        await page.keyboard.press("Escape"); await page.getByRole("dialog").waitFor({ state: "hidden" });
        if (name === "curriculum") {
          await page.getByRole("button", { name: "Đổi bài học thử", exact: true }).focus(); await page.keyboard.press("Enter");
          await page.getByRole("dialog").waitFor();
          await page.getByRole("button", { name: "Học thử 1" }).focus().catch(() => undefined);
          await page.keyboard.press("Tab"); await page.keyboard.press("Escape");
          await page.getByRole("dialog").waitFor({ state: "hidden" });
        }
        results.push({ page: name, width, theme, keyboard: "Enter opens; Tab validates; Escape closes" });
      }
      await page.goto("http://localhost:3106/quan-tri/hoc-vien/mock-student-7", { waitUntil: "domcontentloaded" });
      await page.getByRole("heading", { name: "Tiến độ học tập", exact: true }).waitFor();
      await page.getByRole("heading", { name: "Tiến độ học tập", exact: true }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${output}/progress-${width}-${theme}-populated.png`, fullPage: false, caret: "initial", animations: "disabled" });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      results.push({ page: "progress", width, theme, overflow });
      if (overflow) throw new Error("Progress page overflow");
      await page.getByRole("button", { name: /^Xác nhận các bài đã báo/ }).focus();
      await page.keyboard.press("Enter");
      await page.getByRole("alertdialog").waitFor();
      await page.screenshot({ path: `${output}/progress-${width}-${theme}-dialog.png`, fullPage: false, caret: "initial", animations: "disabled" });
      await page.keyboard.press("Escape");
      await page.getByRole("alertdialog").waitFor({ state: "hidden" });
      results.push({ page: "progress", width, theme, keyboard: "Enter opens bulk dialog; Escape closes; preview confirmation disabled" });
    }
  }
  await context.addCookies([{ name: "rvpy-mock-role", value: "sale", url: "http://localhost:3106" }]);
  await page.goto("http://localhost:3106/quan-tri/tai-lieu", { waitUntil: "domcontentloaded" });
  await page.waitForURL("**/khong-co-quyen");
  await page.screenshot({ path: `${output}/resources-sale-no-permission.png`, fullPage: false, caret: "initial", animations: "disabled" });
  results.push({ permission: "sale redirected to no-permission" });
} finally { await writeFile(`${output}/${process.env.RVPY_VISUAL_PROGRESS_ONLY ? "progress-followup-checks" : process.env.RVPY_VISUAL_FORMS_ONLY ? "form-followup-checks" : "checks"}.json`, JSON.stringify(results, null, 2)); await browser.close(); }
console.log(JSON.stringify({ screenshots: output, checks: results.length }));
