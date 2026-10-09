// Optional browser integration check. Dependencies are installed outside the app.
import assert from "node:assert/strict";
import { readFile, writeFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { once } from "node:events";

for (const key of [
  "RVPY_PGLITE_MODULE",
  "RVPY_PGLITE_SOCKET_MODULE",
  "RVPY_PLAYWRIGHT_MODULE",
]) {
  if (!process.env[key])
    throw new Error(`Set ${key} to the temporary/bundled module path`);
}
const { PGlite } = await import(
  pathToFileURL(process.env.RVPY_PGLITE_MODULE).href
);
const { PGLiteSocketServer } = await import(
  pathToFileURL(process.env.RVPY_PGLITE_SOCKET_MODULE).href
);
const { chromium } = await import(
  pathToFileURL(process.env.RVPY_PLAYWRIGHT_MODULE).href
);
const root = fileURLToPath(new URL("../", import.meta.url));
const tsconfigPath = join(root, "tsconfig.json");
const initialTsconfig = await readFile(tsconfigPath, "utf8");
const pg = await PGlite.create();
const socket = new PGLiteSocketServer({
  db: pg,
  host: "127.0.0.1",
  port: 55439,
  maxConnections: 10,
});
let app;
let browser;
let output = "";
const testEnv = {
  ...process.env,
  NEXT_PUBLIC_USE_MOCK: "false",
  DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:55439/postgres",
  DATABASE_URL_DIRECT:
    "postgresql://postgres:postgres@127.0.0.1:55439/postgres",
  RVPY_TEST_DIST_DIR: ".next-signup-check",
  NEXT_PUBLIC_SUPABASE_URL: "",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
};

async function command(file, args) {
  const child = spawn(process.execPath, [file, ...args], {
    cwd: root,
    env: testEnv,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let logs = "";
  child.stdout.on("data", (chunk) => {
    logs += chunk;
  });
  child.stderr.on("data", (chunk) => {
    logs += chunk;
  });
  const [code] = await once(child, "exit");
  assert.equal(code, 0, logs);
}

try {
  await socket.start();
  await command(join(root, "node_modules/drizzle-kit/bin.cjs"), ["migrate"]);
  assert.equal(
    (await pg.query("SELECT count(*)::int n FROM drizzle.__drizzle_migrations"))
      .rows[0].n,
    1,
  );
  const tsx = join(root, "node_modules/tsx/dist/cli.mjs");
  await command(tsx, [
    "--conditions=react-server",
    "src/server/db/seed/index.ts",
  ]);
  console.log("Reference seed verified");
  const privateDir = await mkdtemp(join(tmpdir(), "rvpy-staff-check-"));
  const staffFile = join(privateDir, "staff.json");
  await writeFile(
    staffFile,
    JSON.stringify({
      staff: [
        {
          email: "example.admin@gmail.com",
          name: "Test admin",
          roles: ["admin"],
        },
        { email: "example.sale@gmail.com", name: "Test sale", roles: ["sale"] },
      ],
      sources: [
        {
          code: "A",
          name: "Test source A",
          ownerEmail: "example.sale@gmail.com",
        },
      ],
    }),
  );
  await command(tsx, [
    "--conditions=react-server",
    "scripts/bootstrap-staff.ts",
    staffFile,
  ]);
  await command(tsx, [
    "--conditions=react-server",
    "scripts/bootstrap-staff.ts",
    staffFile,
  ]);
  assert.equal(
    (await pg.query("SELECT count(*)::int n FROM users")).rows[0].n,
    2,
  );
  assert.equal(
    (await pg.query("SELECT count(*)::int n FROM lessons")).rows[0].n,
    22,
  );
  const source = (await pg.query("SELECT id FROM ad_sources WHERE code='A'"))
    .rows[0].id;
  const referrer = (
    await pg.query(
      "INSERT INTO students(code,code_month,source_id,seq,full_name,phone) VALUES ('A9910001','9910',$1,1,'Test referrer','0900000001') RETURNING id",
      [source],
    )
  ).rows[0].id;

  await command(join(root, "node_modules/next/dist/bin/next"), ["build"]);
  console.log("Production build verified");

  app = spawn(
    process.execPath,
    [join(root, "node_modules/next/dist/bin/next"), "dev", "--port", "3031"],
    { cwd: root, env: testEnv, stdio: ["ignore", "pipe", "pipe"] },
  );
  app.stdout.on("data", (chunk) => {
    output += chunk;
  });
  app.stderr.on("data", (chunk) => {
    output += chunk;
  });
  const base = "http://localhost:3031";
  let ready = false;
  for (let n = 0; n < 60; n++) {
    if (app.exitCode !== null) throw new Error(`App stopped: ${output}`);
    try {
      if ((await fetch(`${base}/dang-ky`)).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  assert.ok(ready, output);
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${base}/dang-ky?src=A&ref=A9910001`);
  const submit = page.getByRole("button", {
    name: "Đăng ký 3 buổi học thử miễn phí",
    exact: true,
  });
  await submit.click();
  await page.getByText("Vui lòng nhập họ và tên", { exact: true }).waitFor();
  await page.getByLabel("Họ và tên").fill("Test Signup Person");
  await page.getByLabel("Số điện thoại Zalo").fill("0901 234 567");
  await page.getByLabel("Gmail").fill("example.invalid@example.com");
  await page.getByLabel("Nghề nghiệp").fill("Test architect");
  await submit.click();
  await page
    .getByText("Vui lòng dùng địa chỉ Gmail để đăng nhập sau này")
    .waitFor();
  await page.getByLabel("Gmail").fill("EXAMPLE.SIGNUP@gmail.com");
  await page.getByLabel("Năm sinh").fill("1995");
  await page
    .getByLabel("Bạn biết đến RVPY qua đâu?")
    .fill("Test advertisement");
  await submit.click();
  await page.waitForURL("**/dang-ky/thanh-cong?code=*");
  await page.getByRole("heading", { name: "Cảm ơn bạn đã đăng ký!" }).waitFor();
  const code = new URL(page.url()).searchParams.get("code");
  assert.match(code, /^A\d{2}(0[1-9]|1[0-2])001$/);
  assert.equal(
    await page
      .getByRole("link", { name: /Tham gia Nhóm cộng đồng RVPY/ })
      .count(),
    2,
  );
  const student = (
    await pg.query(
      "SELECT id,phone,email,source_id,referred_by_id,status,signup_answers FROM students WHERE code=$1",
      [code],
    )
  ).rows[0];
  assert.equal(student.phone, "0901234567");
  assert.equal(student.email, "example.signup@gmail.com");
  assert.equal(student.source_id, source);
  assert.equal(student.referred_by_id, referrer);
  assert.equal(student.status, "new");
  assert.equal(student.signup_answers.heardAbout, "Test advertisement");
  assert.equal(
    (
      await pg.query(
        "SELECT count(*)::int n FROM student_status_events WHERE student_id=$1",
        [student.id],
      )
    ).rows[0].n,
    1,
  );
  assert.equal(
    (
      await pg.query(
        "SELECT count(*)::int n FROM audit_log WHERE entity_id=$1",
        [student.id],
      )
    ).rows[0].n,
    1,
  );

  await page.goto(`${base}/dang-ky?src=Z`);
  await page.getByLabel("Họ và tên").fill("Test retry");
  await page.getByLabel("Số điện thoại Zalo").fill("0901234567");
  await page.getByLabel("Gmail").fill("example.signup@gmail.com");
  await page.getByLabel("Nghề nghiệp").fill("Test architect");
  await submit.click();
  await page.waitForURL("**/dang-ky/thanh-cong?code=*");
  assert.equal(new URL(page.url()).searchParams.get("code"), code);
  assert.equal(
    (
      await pg.query(
        "SELECT count(*)::int n FROM students WHERE phone='0901234567'",
      )
    ).rows[0].n,
    1,
  );
  assert.equal(
    (
      await pg.query(
        "SELECT next_seq FROM source_month_counters WHERE source_id=$1",
        [source],
      )
    ).rows[0].next_seq,
    2,
  );

  await page.goto(`${base}/dang-ky?src=Z`);
  await page.getByLabel("Họ và tên").fill("Test fallback");
  await page.getByLabel("Số điện thoại Zalo").fill("0901234568");
  await page.getByLabel("Gmail").fill("example.fallback@gmail.com");
  await page.getByLabel("Nghề nghiệp").fill("Test engineer");
  await submit.click();
  await page.waitForURL("**/dang-ky/thanh-cong?code=*");
  assert.match(new URL(page.url()).searchParams.get("code"), /^R/);

  for (const route of [
    "/dang-ky",
    `/dang-ky/thanh-cong?code=${code}`,
    "/dang-nhap",
    "/chua-kich-hoat",
  ]) {
    await page.goto(`${base}${route}`);
    await page.locator("h1").waitFor();
    for (const width of [375, 768, 1280])
      for (const scheme of ["light", "dark"]) {
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ colorScheme: scheme });
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
          `${route} overflow at ${width}/${scheme}`,
        );
      }
  }
  await page.goto(`${base}/quan-tri`);
  await page.waitForURL("**/dang-nhap");
  await page
    .context()
    .addCookies([{ name: "rvpy-mock-role", value: "admin", url: base }]);
  await page.goto(`${base}/quan-tri`);
  await page.waitForURL("**/dang-nhap");
  assert.deepEqual(errors, []);
  console.log(
    "Passed: actual browser -> Server Action -> Postgres driver -> disposable DB signup, code/source/referral/history/audit, retry/fallback, repeatable staff setup, 22 seed topics, responsive/themes and real-mode role guards.",
  );
} catch (error) {
  console.error(output.slice(-4000));
  throw error;
} finally {
  if (browser) await browser.close();
  if (app && app.exitCode === null) {
    // Windows taskkill is limited to this check's own spawned process tree.
    const stop = spawn("taskkill", ["/PID", String(app.pid), "/T", "/F"], {
      stdio: "ignore",
    });
    await once(stop, "exit");
  }
  await Promise.race([
    socket.stop(),
    new Promise((resolve) => setTimeout(resolve, 1000)),
  ]);
  await pg.close();
  const currentTsconfig = JSON.parse(await readFile(tsconfigPath, "utf8"));
  currentTsconfig.include = currentTsconfig.include.filter(path => !path.startsWith(".next-signup-check/"));
  const initialConfig = JSON.parse(initialTsconfig);
  initialConfig.include = initialConfig.include.filter(path => !path.startsWith(".next-signup-check/"));
  if (JSON.stringify(currentTsconfig) === JSON.stringify(initialConfig)) {
    await writeFile(tsconfigPath, initialTsconfig);
  } else {
    // Preserve concurrent changes while removing only this check's generated paths.
    await writeFile(tsconfigPath, JSON.stringify(currentTsconfig, null, 2) + "\n");
  }
}
