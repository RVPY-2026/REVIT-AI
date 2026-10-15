import { createRequire } from "node:module";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = require(
  require.resolve("playwright", {
    paths: [
      process.env.RVPY_BROWSER_PACKAGES ??
        "C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules",
    ],
  }),
);
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  env: { ...process.env, TMP: resolve("tmp"), TEMP: resolve("tmp") },
});
const context = await browser.newContext({
  viewport: { width: 375, height: 900 },
});
await context.addCookies([
  { name: "rvpy-mock-role", value: "admin", url: "http://localhost:3106" },
]);
const page = await context.newPage();
page.setDefaultTimeout(60000);
await page.route("**/*", (r) =>
  r.request().headers()["next-router-prefetch"] ? r.abort() : r.continue(),
);
const checks = [];
async function tabTo(match) {
  for (let i = 0; i < 160; i++) {
    if (
      (await page.evaluate(
        () =>
          !["BODY", "HTML"].includes(document.activeElement?.tagName ?? "BODY"),
      )) &&
      (await page.evaluate(match))
    )
      return;
    await page.keyboard.press("Tab");
  }
  throw new Error("Keyboard target unreachable");
}
async function go(path) {
  await page.goto("http://localhost:3106" + path, {
    waitUntil: "domcontentloaded",
  });
}
async function waitForHydration() {
  await page.waitForFunction(() =>
    [...document.querySelectorAll("main button")].some((button) =>
      Object.keys(button).some(
        (key) =>
          key.startsWith("__reactProps$") &&
          typeof button[key]?.onClick === "function",
      ),
    ),
  );
}
try {
  await go("/ui-kit");
  await page
    .getByRole("heading", { name: "Quản lý học tập", exact: true })
    .waitFor();
  await waitForHydration();
  await page
    .getByRole("button", { name: "Thử tải lại", exact: true })
    .first()
    .click();
  await page
    .getByText("Đây là ví dụ trong chế độ xem thử.", { exact: true })
    .waitFor();
  await page.screenshot({
    path: "design/reference/admin-learning-content/ui-kit-shared-states.png",
    animations: "disabled",
    caret: "initial",
  });
  checks.push(
    "UI kit client boundary, loading/error examples and retry toast work",
  );
  await go("/quan-tri/tai-lieu");
  await waitForHydration();
  await tabTo(
    () => document.activeElement?.textContent?.trim() === "Thêm tài liệu",
  );
  await page.keyboard.press("Enter");
  await page.getByRole("dialog").waitFor();
  await page.keyboard.insertText("Tài liệu bằng bàn phím");
  await tabTo(() => document.activeElement?.id === "resource-source");
  await page.keyboard.press("Enter");
  await page.getByRole("menu").waitFor();
  await page.waitForFunction(() =>
    document.activeElement?.closest("[role=menu]"),
  );
  await page.keyboard.press("End");
  await page.waitForFunction(
    () =>
      document.activeElement?.getAttribute("role") === "menuitemradio" &&
      document.activeElement?.textContent?.trim() ===
        [...document.querySelectorAll("[role=menuitemradio]")]
          .at(-1)
          ?.textContent?.trim(),
  );
  await page.keyboard.press("Enter");
  await page.getByRole("menu").waitFor({ state: "hidden" });
  await page.locator("#resource-youtube").waitFor();
  await tabTo(() => document.activeElement?.id === "resource-youtube");
  await page.keyboard.insertText("https://youtu.be/aqz-KE-bpKQ");
  await page.keyboard.press("Tab");
  await page.getByText("Mã video: aqz-KE-bpKQ", { exact: true }).waitFor();
  await tabTo(() => document.activeElement?.id === "resource-audience");
  await page.keyboard.press("Enter");
  await page.getByRole("menu").waitFor();
  await page.waitForFunction(() =>
    document.activeElement?.closest("[role=menu]"),
  );
  await page.keyboard.press("End");
  await page.waitForFunction(
    () =>
      document.activeElement?.getAttribute("role") === "menuitemradio" &&
      document.activeElement?.textContent?.trim() ===
        [...document.querySelectorAll("[role=menuitemradio]")]
          .at(-1)
          ?.textContent?.trim(),
  );
  await page.keyboard.press("Enter");
  await page.getByRole("menu").waitFor({ state: "hidden" });
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  checks.push(
    "Keyboard Tab/Enter/arrows: resource dialog, YouTube source and ID preview, audience selection, Escape closes",
  );
  await tabTo(() =>
    document.activeElement?.textContent?.includes("Bộ lọc (0)"),
  );
  await page.keyboard.press("Enter");
  await page.getByRole("dialog").waitFor();
  await tabTo(() => document.activeElement?.id === "mobile-audience");
  await page.keyboard.press("Enter");
  await page.getByRole("menu").waitFor();
  await page.waitForFunction(() =>
    document.activeElement?.closest("[role=menu]"),
  );
  await page.keyboard.press("End");
  await page.waitForFunction(
    () =>
      document.activeElement?.getAttribute("role") === "menuitemradio" &&
      document.activeElement?.textContent?.trim() ===
        [...document.querySelectorAll("[role=menuitemradio]")]
          .at(-1)
          ?.textContent?.trim(),
  );
  await page.keyboard.press("Enter");
  await page.getByRole("menu").waitFor({ state: "hidden" });
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "Bộ lọc (1)", exact: true }).waitFor();
  await tabTo(
    () => document.activeElement?.textContent?.trim() === "Sửa tài liệu",
  );
  await page.keyboard.press("Enter");
  await page.getByRole("dialog").waitFor();
  await page.keyboard.press("Escape");
  checks.push(
    "Keyboard mobile filter sheet applies and closes; row edit opens and closes",
  );
  await go("/quan-tri/tai-lieu");
  await waitForHydration();
  await page
    .getByRole("button", { name: "Sửa tài liệu", exact: true })
    .first()
    .click();
  await page.getByRole("dialog").waitFor();
  await page
    .locator("#resource-file")
    .setInputFiles({
      name: "replacement.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 fixture"),
    });
  await page.getByText("replacement.pdf", { exact: true }).waitFor();
  const writes = [];
  const recordWrite = (request) => {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method()))
      writes.push(request.url());
  };
  page.on("request", recordWrite);
  await page
    .getByRole("dialog")
    .locator("form")
    .evaluate((form) =>
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      ),
    );
  await page
    .getByText("Bạn tải tệp lên trước khi lưu.", { exact: true })
    .waitFor();
  page.off("request", recordWrite);
  if (
    writes.length ||
    (await page.locator("#resource-title").inputValue()) !==
      "Tài liệu CAD trong Revit" ||
    (await page.evaluate(() => document.activeElement?.id)) !==
      "resource-file-picker"
  )
    throw new Error("Pending replacement was not preserved or blocked");
  await page.screenshot({
    path: "design/reference/admin-learning-content/resources-replacement-validation.png",
    animations: "disabled",
    caret: "initial",
  });
  await page.keyboard.press("Escape");
  checks.push(
    "Unuploaded replacement is rejected inline, draft preserved, picker focused, and no mutation request sent",
  );
  await go("/quan-tri/chuong-trinh");
  await waitForHydration();
  await tabTo(
    () => document.activeElement?.textContent?.trim() === "Đổi bài học thử",
  );
  await page.keyboard.press("Enter");
  await page.getByRole("dialog").waitFor();
  await tabTo(() => document.activeElement?.id === "trial-1");
  await page.keyboard.press("Enter");
  await page.getByRole("menu").waitFor();
  await page.waitForFunction(() =>
    document.activeElement?.closest("[role=menu]"),
  );
  await page.keyboard.press("Home");
  await page.waitForFunction(
    () =>
      document.activeElement?.getAttribute("role") === "menuitemradio" &&
      document.activeElement?.textContent?.trim() ===
        [
          ...document.querySelectorAll("[role=menuitemradio]"),
        ][0]?.textContent?.trim(),
  );
  await page.keyboard.press("Enter");
  await page.getByRole("menu").waitFor({ state: "hidden" });
  if (
    !(await page
      .getByRole("dialog")
      .getByRole("button", { name: "Đổi bài học thử", exact: true })
      .isDisabled())
  )
    throw new Error("Preview swap submit enabled");
  await page.keyboard.press("Escape");
  await tabTo(() =>
    /^4\/5\s*·/.test(document.activeElement?.textContent?.trim() ?? ""),
  );
  await page.keyboard.press("Enter");
  await page.getByRole("dialog").waitFor();
  if ((await page.locator("#lesson-numbers").inputValue()) !== "4/5")
    throw new Error("Combined number changed");
  await page.keyboard.press("Escape");
  checks.push(
    "Keyboard trial swap selection is available with preview submit disabled; combined lesson 4/5 preserved in edit form",
  );
} finally {
  await writeFile(
    "design/reference/admin-learning-content/keyboard-checks.json",
    JSON.stringify(checks, null, 2),
  );
  await browser.close();
}
console.log(JSON.stringify(checks));
