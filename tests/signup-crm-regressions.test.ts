import { migrateTestDatabase } from "./helpers/migrations";
import assert from "node:assert/strict";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as orm from "drizzle-orm";
import * as schema from "../src/server/db/schema";
import * as permissions from "../src/lib/auth/permissions";
import * as studentCode from "../src/lib/student-code";
import * as linkCode from "../src/server/zalo/link-code";
import * as contactSchema from "../src/lib/schemas/student-contact";
import * as leadSchema from "../src/lib/schemas/lead";
import * as importHelpers from "../src/lib/import-sheet";
import { ZALO_OUTBOX_CRON_COMMAND } from "../src/lib/zalo-cron";
import { loadServerModule } from "./helpers/server-module";
import type { Db } from "../src/server/db";
import type { ParsedRow } from "../src/server/import/student-sheet";

test("signup ownership, renewal, shared limits and CRM conflict regressions on isolated Postgres", async (t) => {
  const pg = await PGlite.create();
  const conn = drizzle(pg, { schema, casing: "snake_case" });
  const db = conn as unknown as Db;
  try {
    await migrateTestDatabase(pg, 0);
    await conn.insert(schema.adSources).values({ code: "R", name: "Fixture source" });
    const [actor] = await conn.insert(schema.users).values({ email: "review-admin@example.invalid", name: "Fixture admin" }).returning();
    const admin: permissions.SessionUser = { id: actor.id, email: actor.email, name: actor.name, avatarUrl: null,
      roles: ["admin"], sourceIds: [], studentId: null };
    const env = { ZALO_BOT_TOKEN: "fake-bot", ZALO_BOT_WEBHOOK_SECRET: "fake-webhook", SIGNUP_RATE_LIMIT_SECRET: "x".repeat(32), TURNSTILE_SECRET_KEY: "fake-captcha" };
    const common: Record<string, unknown> = { "drizzle-orm": orm, "@/server/db": { db }, "@/server/db/schema": schema,
      "@/server/env": { serverEnv: env }, "@/lib/auth/permissions": permissions };
    const audit = await loadServerModule<typeof import("../src/server/audit")>("src/server/audit.ts", common);
    const scope = await loadServerModule<typeof import("../src/server/auth/scope")>("src/server/auth/scope.ts", common);
    const phones = await loadServerModule<typeof import("../src/server/phone-matches")>("src/server/phone-matches.ts", {
      ...common, "@/server/auth/scope": scope, "@/lib/schemas/lead": leadSchema, "@/lib/phone": await import("../src/lib/phone"),
    });
    common["@/server/phone-matches"] = phones;
    const sessions = await loadServerModule<typeof import("../src/server/signup-session")>("src/server/signup-session.ts", {
      ...common, "@/server/zalo/link-code": linkCode,
    });
    const protection = await loadServerModule<typeof import("../src/server/signup-protection")>("src/server/signup-protection.ts", common);
    const records = await loadServerModule<typeof import("../src/server/lead-record")>("src/server/lead-record.ts", {
      ...common, "@/lib/student-code": studentCode, "@/server/audit": audit,
    });
    const browser = new Map<string, string>();
    const leadAction = await loadServerModule<typeof import("../src/server/actions/leads")>("src/server/actions/leads.ts", {
      ...common, "next/headers": { headers: async () => new Headers(), cookies: async () => ({
        get: (key: string) => browser.has(key) ? { value: browser.get(key) } : undefined,
        set: (key: string, value: string) => browser.set(key, value),
      }) }, "next/cache": { revalidatePath: () => undefined }, "@/lib/runtime-mode": { USE_MOCK: false },
      "@/lib/schemas/lead": leadSchema, "@/server/auth/session": { requirePermission: async () => admin },
      "@/server/lead-record": records, "@/server/signup-session": sessions,
      "@/server/signup-protection": { ...protection, validateSignupCaptcha: async () => undefined },
    });
    const input = { fullName: "Fixture learner", phone: "0901234567", email: "fixture@gmail.com", occupation: "Đang đi làm" as const,
      birthYear: 1995, specialty: "Kiến trúc", hometown: "Fixture", organization: "Fixture", facebookLink: "https://example.test/profile", answers: {} };
    const initial = await leadAction.submitLeadSignup(input);
    assert.equal(initial.ok, true);
    const ownerToken = browser.get(sessions.SIGNUP_COOKIE)!;
    const originalLinkCode = browser.get(sessions.ZALO_LINK_COOKIE)!;
    const owner = (await sessions.getSignupSession(ownerToken, db))!;

    await t.test("another browser cannot acquire a duplicate signup's code or rotate its Zalo code", async () => {
      browser.clear();
      const duplicate = await leadAction.submitLeadSignup(input);
      assert.equal(duplicate.ok, false);
      assert.equal(browser.size, 0);
      assert.equal(await sessions.getSignupSession("f".repeat(64), db), null);
      await assert.rejects(conn.transaction((tx) => sessions.renewSignupZaloCode(tx as unknown as Parameters<typeof sessions.renewSignupZaloCode>[0], "f".repeat(64))));
      const [connection] = await conn.select().from(schema.zaloBotConnections);
      assert.equal(connection.linkTokenHash, sessions.hashSignupToken(originalLinkCode));
      const [counter] = await conn.select().from(schema.sourceMonthCounters);
      assert.equal(counter.nextSeq, 2);
    });

    await t.test("the original browser retries after five minutes without creating a new profile", async () => {
      browser.set(sessions.SIGNUP_COOKIE, ownerToken);
      await conn.update(schema.students).set({ signedUpAt: new Date(Date.now() - 60 * 60_000) }).where(orm.eq(schema.students.id, owner.id));
      const retry = await leadAction.submitLeadSignup(input);
      assert.deepEqual(retry, initial);
      assert.equal((await conn.select().from(schema.students)).length, 1);
    });

    await t.test("renewal rotates the code on the same profile, enforces cooldown and preserves connected chats", async () => {
      const now = new Date();
      await conn.update(schema.zaloBotConnections).set({ codeIssuedAt: new Date(now.getTime() - 61_000), expiresAt: new Date(now.getTime() - 1000) });
      const renew = () => conn.transaction((tx) => sessions.renewSignupZaloCode(tx as unknown as Parameters<typeof sessions.renewSignupZaloCode>[0], ownerToken, now));
      const renewed = await renew();
      assert.equal(renewed.connected, false); assert.ok(renewed.token); assert.notEqual(renewed.token, originalLinkCode);
      await assert.rejects(renew(), /một phút/);
      await conn.update(schema.zaloBotConnections).set({ chatId: "fixture-private-chat", connectedAt: now });
      const connected = await renew();
      assert.equal(connected.connected, true); assert.equal(connected.token, null);
      const [row] = await conn.select().from(schema.zaloBotConnections);
      assert.equal(row.chatId, "fixture-private-chat"); assert.equal(row.linkTokenHash, sessions.hashSignupToken(renewed.token!));
      await conn.update(schema.leadSignupSessions).set({ expiresAt: new Date(now.getTime() - 1) });
      await assert.rejects(renew(), /hết hạn/);
    });

    await t.test("shared rate counters enforce their cap, reset after expiry and never consume student codes", async () => {
      const rule = [{ key: "fixture-rate-key", limit: 2, windowMs: 60_000 }];
      const now = new Date();
      const consume = (at: Date) => conn.transaction((tx) => protection.consumeSignupLimits(tx as unknown as Parameters<typeof protection.consumeSignupLimits>[0], rule, at));
      assert.equal(await consume(now), true); assert.equal(await consume(now), true); assert.equal(await consume(now), false);
      assert.equal(await consume(new Date(now.getTime() + 60_001)), true);
      const [counter] = await conn.select().from(schema.sourceMonthCounters); assert.equal(counter.nextSeq, 2);
      assert.ok((await conn.select().from(schema.signupRateLimits)).every((row) => /^[a-f0-9]{64}$/.test(row.keyHash)));
      assert.equal(protection.signupClientIp(new Headers({ "x-forwarded-for": "1.2.3.4" })), "unknown");
      assert.equal(protection.signupClientIp(new Headers({ "x-vercel-forwarded-for": "1.2.3.4" })), "1.2.3.4");
    });

    await t.test("CAPTCHA rejects missing, replayed, wrong-action and wrong-host tokens", async () => {
      const response = (data: object) => (async () => Response.json(data)) as typeof fetch;
      await assert.rejects(protection.validateSignupCaptcha(undefined));
      await assert.rejects(protection.validateSignupCaptcha("token", response({ success: false })));
      await assert.rejects(protection.validateSignupCaptcha("token", response({ success: true, action: "other", hostname: "signup.example.test" })));
      await assert.rejects(protection.validateSignupCaptcha("token", response({ success: true, action: "lead-signup", hostname: "attacker.test" })));
      await protection.validateSignupCaptcha("token", response({ success: true, action: "lead-signup", hostname: "signup.example.test" }));
    });

    await t.test("contact actions preserve another editor's field, reject same-field conflicts and audit actual values", async () => {
      const actions = await loadServerModule<typeof import("../src/server/actions/student-contact")>("src/server/actions/student-contact.ts", {
        ...common, "@/lib/schemas/student-contact": contactSchema, "@/lib/runtime-mode": { USE_MOCK: false },
        "next/cache": { revalidatePath: () => undefined }, "@/server/auth/session": { requirePermission: async () => admin },
        "@/server/auth/scope": scope, "@/server/audit": audit,
      });
      const original = { fullName: input.fullName, phone: input.phone, email: input.email };
      await conn.update(schema.students).set({ phone: "0909999999" }).where(orm.eq(schema.students.id, owner.id));
      assert.equal((await actions.updateStudentContact({ studentId: owner.id, ...original, fullName: "Updated name", expected: original })).ok, true);
      const [current] = await conn.select().from(schema.students).where(orm.eq(schema.students.id, owner.id));
      assert.equal(current.phone, "0909999999"); assert.equal(current.fullName, "Updated name");
      const conflict = await actions.updateStudentContact({ studentId: owner.id, ...original, phone: "0908888888", expected: original });
      assert.equal(conflict.ok, false);
      assert.equal((await actions.updateStudentContact({ studentId: owner.id, ...original })).ok, false, "legacy requests cannot bypass concurrency checks");
    });

    await t.test("imports recompute stale plans under locks and repeated imports do not duplicate notes", async () => {
      const imports = await loadServerModule<typeof import("../src/server/import/student-sheet")>("src/server/import/student-sheet.ts", {
        ...common, "@/lib/import-sheet": importHelpers, "@/server/audit": audit,
      });
      const row: ParsedRow = { rowNumber: 2, source: "R", month: "9801", seq: 901, code: "R9801901", fullName: "Import fixture",
        phone: "0907654321", email: null, status: "new", signedUpAt: new Date("1998-01-01T00:00:00Z"), occupation: null,
        birthYear: null, specialty: null, hometown: null, organization: null, label: null, zaloFriend: false,
        signupAnswers: {}, legacyRaw: {}, noteBody: null };
      const parsed = { rows: [row], issues: { blank: 0, badCode: [], badPhone: [], unknownStatus: [], duplicateCode: [], badEmail: 0 } };
      const initialPlan = await imports.planStudentImport(parsed, db);
      await imports.applyStudentImport(initialPlan, admin.id, true, db);
      const incoming = { ...row, email: "sheet@example.invalid", occupation: "Sheet occupation", status: "consulting" as const,
        noteBody: "Nhập từ Google Sheet. Fixture note" };
      const stale = await imports.planStudentImport({ ...parsed, rows: [incoming] }, db);
      const [student] = await conn.select().from(schema.students).where(orm.eq(schema.students.code, row.code));
      await conn.update(schema.students).set({ email: "staff@example.invalid", status: "trial" }).where(orm.eq(schema.students.id, student.id));
      await conn.insert(schema.studentStatusEvents).values({ studentId: student.id, fromStatus: "new", toStatus: "trial", changedById: admin.id });
      const outcome = await imports.applyStudentImport(stale, admin.id, true, db);
      assert.equal(outcome.skippedFields, 1); assert.equal(outcome.skippedStatuses, 1);
      const [saved] = await conn.select().from(schema.students).where(orm.eq(schema.students.id, student.id));
      assert.equal(saved.email, "staff@example.invalid"); assert.equal(saved.status, "trial"); assert.equal(saved.occupation, "Sheet occupation");
      await imports.applyStudentImport(stale, admin.id, true, db);
      const notes = await conn.select().from(schema.callNotes).where(orm.eq(schema.callNotes.studentId, student.id));
      assert.equal(notes.length, 1);
    });

    await t.test("imports recognize archived codes without modifying fields, statuses or notes", async () => {
      const imports = await loadServerModule<typeof import("../src/server/import/student-sheet")>("src/server/import/student-sheet.ts", {
        ...common, "@/server/audit": audit, "@/lib/import-sheet": importHelpers,
      });
      const [student] = await conn.select().from(schema.students).where(orm.eq(schema.students.code, "R9801901"));
      await conn.update(schema.students).set({ archivedAt: new Date(), archiveReason: "test" }).where(orm.eq(schema.students.id, student.id));
      const row: ParsedRow = { rowNumber: 2, source: "R", month: "9801", seq: 901, code: student.code, fullName: "Archived sheet change",
        phone: "0907654321", email: null, status: "new", signedUpAt: student.signedUpAt, occupation: null, birthYear: null,
        specialty: "Sheet change", hometown: null, organization: null, label: null, zaloFriend: false, signupAnswers: {}, legacyRaw: {}, noteBody: "Should not be appended" };
      const plan = await imports.planStudentImport({ rows: [row], issues: { blank: 0, badCode: [], badPhone: [], unknownStatus: [], duplicateCode: [], badEmail: 0 } }, db);
      assert.equal(plan.newRows.length, 0); assert.equal(plan.changes.length, 0);
      const result = await imports.applyStudentImport(plan, admin.id, true, db);
      assert.equal(result.updated, 0); assert.equal(result.notesAdded, 0); assert.equal(result.inserted, 0);
    });

    await t.test("outbox retries due items, preserves chat order, respects budget and retains blocked messages", async () => {
      let fail = true;
      const delivered: string[] = [];
      const outbox = await loadServerModule<typeof import("../src/server/zalo/outbox")>("src/server/zalo/outbox.ts", {
        ...common, "@/server/zalo/messages": { ZALO_ONBOARDING_MESSAGES: [{ kind: "text", body: "first" }, { kind: "text", body: "second" }] },
        "@/server/zalo/client": { createZaloBotClient: () => ({ sendText: async (_chat: string, body: string) => {
          if (fail) { fail = false; throw new Error("fixture transport failure"); }
          delivered.push(body);
        } }) },
      });
      await conn.transaction((tx) => outbox.queueOnboarding(tx as unknown as Parameters<typeof outbox.queueOnboarding>[0], owner.id, "fixture-private-chat"));
      assert.equal((await outbox.drainZaloOutbox(100)).processed, 1, "the failed first message holds the second");
      assert.equal(delivered.length, 0);
      const [first] = await conn.select().from(schema.zaloBotOutbox).where(orm.eq(schema.zaloBotOutbox.body, "first"));
      assert.equal(first.attempts, 1); assert.equal(first.status, "pending"); assert.ok(first.availableAt > new Date());
      assert.equal((await outbox.drainZaloOutbox(100)).processed, 0, "future retries are not sent early");
      await conn.update(schema.zaloBotOutbox).set({ availableAt: new Date(0) }).where(orm.eq(schema.zaloBotOutbox.id, first.id));
      assert.equal((await outbox.drainZaloOutbox(100, 0)).processed, 0);
      assert.equal((await outbox.drainZaloOutbox(100)).processed, 2);
      assert.deepEqual(delivered, ["first", "second"]);
      await conn.update(schema.zaloBotOutbox).set({ status: "failed" }).where(orm.eq(schema.zaloBotOutbox.id, first.id));
      await conn.update(schema.zaloBotOutbox).set({ status: "pending" }).where(orm.eq(schema.zaloBotOutbox.body, "second"));
      assert.equal((await outbox.drainZaloOutbox(100)).processed, 0);
    });

    await t.test("Supabase scheduler skips empty/blocked queues and reads credentials from Vault only when due", async () => {
      await pg.exec(`create schema net; create schema vault;
        create table vault.decrypted_secrets(name text, decrypted_secret text);
        insert into vault.decrypted_secrets values ('rvpy_zalo_worker_url','https://fixture.test/api/cron/zalo-outbox'), ('rvpy_zalo_worker_secret','fixture-cron-secret');
        create table public.fixture_worker_calls(url text, headers jsonb, timeout_ms int);
        create function net.http_get(url text, headers jsonb, timeout_milliseconds int) returns bigint language sql as
        $$ insert into public.fixture_worker_calls values (url,headers,timeout_milliseconds) returning 1::bigint $$;`);
      await pg.exec(ZALO_OUTBOX_CRON_COMMAND);
      assert.equal((await pg.query("select * from fixture_worker_calls")).rows.length, 0, "a failed earlier message blocks the chat");
      await conn.update(schema.zaloBotOutbox).set({ status: "sent" }).where(orm.eq(schema.zaloBotOutbox.body, "first"));
      await pg.exec(ZALO_OUTBOX_CRON_COMMAND);
      const calls = await pg.query<{ url: string; headers: { Authorization: string } }>("select * from fixture_worker_calls");
      assert.equal(calls.rows.length, 1); assert.equal(calls.rows[0].headers.Authorization, "Bearer fixture-cron-secret");
      await conn.update(schema.zaloBotOutbox).set({ status: "sent" });
      await pg.exec(ZALO_OUTBOX_CRON_COMMAND);
      assert.equal((await pg.query("select * from fixture_worker_calls")).rows.length, 1);
    });
  } finally { await pg.close(); }
});
