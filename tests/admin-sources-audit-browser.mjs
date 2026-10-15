import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

// Optional local browser checks. No DB connection or real delivery is permitted.
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.RVPY_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.RVPY_PREVIEW_BASE_URL || "http://localhost:3117";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname), "Use a local mock preview only");
const output = path.resolve("design/reference/admin-sources-audit");
await mkdir(output, { recursive: true });
const routeArg = process.argv.find((arg) => arg.startsWith("--route="))?.slice(8);
const themeArg = process.argv.find((arg) => arg.startsWith("--theme="))?.slice(8);
const titles = { "nguon-quang-cao": "Nguồn quảng cáo", "nhat-ky": "Nhật ký hoạt động", zalo: "Hàng đợi Zalo" };
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--disable-gpu", "--renderer-process-limit=2"] });
const context = await browser.newContext({ locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", viewport: { width: 1280, height: 900 } });
await context.addCookies([{ name: "rvpy-mock-role", value: "admin", url: base }]);
const page = await context.newPage();
page.setDefaultTimeout(20000);
const observations = [];
async function open(route, state = "populated") {
  await page.goto(`${base}/quan-tri/${route}${["empty", "loading", "error", "one", "long"].includes(state) ? `?previewState=${state}` : ""}`, { waitUntil: "domcontentloaded" });
  if (state === "loading") await page.getByRole("main", { name: "Đang tải danh sách" }).waitFor();
  else if (state === "error") await page.getByRole("heading", { name: /Chưa tải được/ }).waitFor();
  else { await page.getByRole("heading", { name: titles[route], exact: true }).waitFor(); assert.match(await page.locator("main").innerText(), /Chế độ xem thử/); }
  await page.waitForTimeout(400);
}
async function capture(file) {
  await page.waitForTimeout(250);
  // Hide only Next's development portal, never application UI.
  await page.evaluate(() => document.querySelectorAll("nextjs-portal").forEach((element) => { element.style.display = "none"; }));
  const dimensions = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
  assert.ok(dimensions.content <= dimensions.viewport, `Page overflow: ${file}`);
  await page.screenshot({ path: path.join(output, file) });
  observations.push({ file, ...dimensions });
}
async function keyboardActivate(locator) {
  await locator.focus(); await page.keyboard.press("Enter"); await page.waitForTimeout(250);
}
try {
  if (process.argv.includes("--captures")) {
    for (const route of routeArg ? [routeArg] : Object.keys(titles)) for (const theme of themeArg ? [themeArg] : ["light", "dark"]) {
      await open(route); await page.evaluate((value) => localStorage.setItem("theme", value), theme); await page.reload({ waitUntil: "domcontentloaded" });
      for (const width of [375, 768, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        for (const state of process.argv.includes("--edge-cases") ? ["one", "long"] : ["loading", "empty", "populated", "error", "validation", "dialog"]) {
          await open(route, state);
          if (["validation", "dialog"].includes(state)) {
            if (route === "nguon-quang-cao") {
              await keyboardActivate(page.getByRole("button", { name: "Thêm nguồn", exact: true }).first());
              if (state === "validation") { await page.getByLabel("Mã nguồn", { exact: true }).fill("r"); await page.keyboard.press("Tab"); await page.getByLabel("Tên nguồn", { exact: true }).focus(); await page.keyboard.press("Tab"); await page.getByText("Bạn nhập tên nguồn.", { exact: true }).waitFor(); }
            } else if (route === "zalo" && state === "dialog") {
              await keyboardActivate(page.getByRole("button", { name: "Thử lại tất cả mục lỗi", exact: true }).first());
            } else {
              await keyboardActivate(page.getByRole("button", { name: /^Bộ lọc/ }));
              if (state === "validation") { await page.locator("#from").fill("2026-10-15"); await page.locator("#to").fill("2026-10-14"); await keyboardActivate(page.getByRole("button", { name: "Lọc danh sách", exact: true })); await page.getByText("Ngày kết thúc cần sau ngày bắt đầu.", { exact: true }).waitFor(); }
              else await keyboardActivate(page.getByRole("button", { name: "Tất cả hành động", exact: true }));
            }
          }
          await capture(`${route}-${theme}-${width}-${state}.png`);
          await page.keyboard.press("Escape"); await page.waitForTimeout(250);
        }
      }
    }
    await writeFile(path.join(output, `capture-${routeArg || "all"}-${themeArg || "all"}${process.argv.includes("--edge-cases") ? "-edge-cases" : ""}.json`), JSON.stringify(observations, null, 2));
  }
  if (process.argv.includes("--flows")) {
    await open("nguon-quang-cao");
    await keyboardActivate(page.getByRole("button", { name: "Thêm nguồn", exact: true }).first());
    await page.getByLabel("Mã nguồn", { exact: true }).fill("a"); await page.keyboard.press("Tab");
    await page.getByText("Mã nguồn đã được dùng. Bạn chọn mã khác.", { exact: true }).waitFor();
    await page.getByLabel("Mã nguồn", { exact: true }).fill("d"); await page.keyboard.press("Tab");
    await page.getByLabel("Tên nguồn", { exact: true }).fill("Nguồn kiểm tra"); await page.keyboard.press("Tab");
    await keyboardActivate(page.getByLabel("Người phụ trách", { exact: true }));
    await page.getByLabel("Tìm người tư vấn").fill("binh"); await page.keyboard.press("Tab"); await page.keyboard.press("Tab"); await page.keyboard.press("Enter"); await page.locator("[data-slot=popover-content]").waitFor({ state: "hidden" });
    assert.match(await page.getByRole("dialog").first().innerText(), /Trần Thanh Bình/);
    assert.equal(await page.getByRole("button", { name: "Lưu nguồn", exact: true }).isDisabled(), true);
    await page.keyboard.press("Escape"); await page.waitForTimeout(250); assert.equal(await page.getByRole("dialog").first().count(), 0);
    await keyboardActivate(page.getByRole("button", { name: /^A\s*Nguồn A$/ }).first());
    await page.getByRole("dialog").first().waitFor(); assert.match(await page.getByRole("dialog").first().innerText(), /Tổng hồ sơ/);
    await capture("source-detail-keyboard.png"); await page.keyboard.press("Escape"); await page.waitForTimeout(250);
    await page.goto(`${base}/ui-kit`, { waitUntil: "domcontentloaded" });
    const fixture = page.locator("#source-refresh-showcase"); await fixture.waitFor();
    await keyboardActivate(fixture.getByRole("button", { name: "Sửa nguồn", exact: true }));
    assert.equal(await page.getByLabel("Tên nguồn", { exact: true }).inputValue(), "Nguồn A"); await page.keyboard.press("Escape"); await page.waitForTimeout(250);
    await keyboardActivate(fixture.getByRole("button", { name: "Mô phỏng cập nhật nguồn", exact: true }));
    await keyboardActivate(fixture.getByRole("button", { name: "Sửa nguồn", exact: true }));
    assert.equal(await page.getByLabel("Tên nguồn", { exact: true }).inputValue(), "Nguồn đã cập nhật");
    assert.match(await page.getByRole("dialog").first().innerText(), /Trần Thanh Bình/);
    // Mock action validates the snapshot without saving. Inspect only fake request data.
    const request = page.waitForRequest((request) => request.method() === "POST" && Boolean(request.headers()["next-action"]));
    await page.getByRole("dialog").first().locator("form").evaluate((form) => form.requestSubmit());
    const payload = (await request).postData(); assert.match(payload, /"active":false/); assert.match(payload, /"expectedActive":false/);
    await page.getByRole("alert").filter({ hasText: "Chế độ xem thử chưa lưu thay đổi." }).waitFor();
    assert.equal(await page.getByLabel("Tên nguồn", { exact: true }).inputValue(), "Nguồn đã cập nhật");
    await page.keyboard.press("Escape"); await page.waitForTimeout(250);
    await open("zalo"); await keyboardActivate(page.getByRole("button", { name: /^Bộ lọc/ }));
    await keyboardActivate(page.getByRole("button", { name: "Tất cả trạng thái", exact: true }));
    await keyboardActivate(page.getByRole("button", { name: "Lỗi", exact: true }).last()); await page.keyboard.press("Escape"); await page.waitForTimeout(250);
    await page.locator("#from").fill("2026-10-01"); await page.locator("#to").fill("2026-10-14");
    await keyboardActivate(page.getByRole("button", { name: "Lọc danh sách", exact: true }));
    await page.waitForURL(/status=failed/); await keyboardActivate(page.getByRole("button", { name: /^Bộ lọc/ }));
    await keyboardActivate(page.getByRole("button", { name: "Xóa bộ lọc", exact: true })); await page.waitForURL(`${base}/quan-tri/zalo`);
    await keyboardActivate(page.getByRole("button", { name: /^Bộ lọc/ })); assert.equal(await page.locator("#from").inputValue(), ""); assert.equal(await page.locator("#to").inputValue(), "");
    assert.equal(await page.getByRole("button", { name: "Tất cả trạng thái", exact: true }).count(), 1);
    await keyboardActivate(page.getByRole("button", { name: /^Bộ lọc/ }));
    await keyboardActivate(page.getByRole("button", { name: "Thử lại tất cả mục lỗi", exact: true }).first());
    assert.equal(await page.getByRole("button", { name: "Thử lại tin Zalo", exact: true }).isDisabled(), true); await page.keyboard.press("Escape"); await page.waitForTimeout(250);
    await open("nhat-ky"); await keyboardActivate(page.locator("summary").first());
    await keyboardActivate(page.getByRole("button", { name: "Xem JSON", exact: true }).first());
    await page.locator("pre").first().waitFor(); await capture("audit-details-json-keyboard.png");
    await keyboardActivate(page.getByRole("button", { name: "Trang sau", exact: true })); await page.waitForURL(/page=2/);
    await page.getByText(/Đang hiển thị 51–100/).waitFor();
    for (const route of Object.keys(titles)) {
      await context.addCookies([{ name: "rvpy-mock-role", value: "sale", url: base }]);
      await page.goto(`${base}/quan-tri/${route}`, { waitUntil: "domcontentloaded" }); await page.waitForURL(/khong-co-quyen/);
      await capture(`${route}-sale-no-permission.png`);
    }
    await context.addCookies([{ name: "rvpy-mock-role", value: "admin", url: base }]);
    await writeFile(path.join(output, "keyboard-and-regressions.json"), JSON.stringify({ passed: true, checks: ["source uniqueness and uppercase on blur", "owner picker Tab/Enter", "dialog/sheet Escape", "source snapshot refresh and mock server error preserves values", "filter clear resets all values", "bulk retry dialog keyboard and disabled preview save", "audit details and JSON toggle", "server pagination 51-100", "sale denied on all three routes"] }, null, 2));
  }
  if (process.argv.includes("--transfers")) {
    for (const theme of ["light", "dark"]) for (const width of [375, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 }); await open("nguon-quang-cao");
      await page.evaluate((value) => localStorage.setItem("theme", value), theme); await page.reload({ waitUntil: "domcontentloaded" });
      await keyboardActivate(page.getByRole("button", { name: "Sửa nguồn", exact: true }).first());
      await keyboardActivate(page.getByLabel("Người phụ trách", { exact: true }));
      await keyboardActivate(page.getByRole("button", { name: /^Trần Thanh Bình/ }));
      await page.locator("[data-slot=popover-content]").waitFor({ state: "hidden" });
      await page.getByRole("dialog").first().locator("form").evaluate((form) => form.requestSubmit());
      await page.getByText("Bạn xác nhận chuyển 38 hồ sơ cho người phụ trách mới.", { exact: true }).waitFor();
      assert.equal(await page.getByRole("checkbox", { name: "Tôi xác nhận chuyển 38 hồ sơ.", exact: true }).evaluate((element) => element === document.activeElement), true);
      await capture(`source-transfer-${theme}-${width}.png`); await page.keyboard.press("Escape"); await page.waitForTimeout(250);
    }
    await writeFile(path.join(output, "source-transfer-checks.json"), JSON.stringify({ passed: true, screenshots: observations }, null, 2));
  }
  console.log(JSON.stringify({ captured: observations.length, passed: true }));
} catch (error) {
  console.error(JSON.stringify({ url: page.url(), text: (await page.locator("body").innerText().catch(() => "")).slice(0, 2400) }));
  await page.screenshot({ path: path.join(output, "browser-check-failure.png") }).catch(() => undefined);
  throw error;
} finally { await context.close(); await browser.close(); }
