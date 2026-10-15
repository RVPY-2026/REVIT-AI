import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as orm from "drizzle-orm";
import * as schema from "../src/server/db/schema";
import * as permissions from "../src/lib/auth/permissions";
import * as sourceSchema from "../src/lib/schemas/ad-source";
import * as viewerSchema from "../src/lib/schemas/admin-viewers";
import * as privacy from "../src/lib/audit-privacy";
import { auditActionLabel, auditValue } from "../src/lib/audit-labels";
import * as leadSchema from "../src/lib/schemas/lead";
import * as studentCode from "../src/lib/student-code";
import { loadServerModule } from "./helpers/server-module";
import { readMigrations } from "./helpers/db-migrations";
import type { Db } from "../src/server/db";

test("every migration and generated snapshot form one ordered dependency chain", async () => {
  let previous = "00000000-0000-0000-0000-000000000000";
  const migrations = await readMigrations();
  for (const migration of migrations) {
    const prefix = migration.name.slice(0, 4);
    const snapshot = JSON.parse(await readFile(new URL(`../src/server/db/migrations/meta/${prefix}_snapshot.json`, import.meta.url), "utf8"));
    assert.equal(snapshot.prevId, previous, migration.name); previous = snapshot.id;
  }
  assert.ok(migrations.some((m) => m.name === "0007_audit_log_indexes.sql"));
});

test("system permissions deny sales, students and public accounts", () => {
  for (const role of ["admin", "sale", "student", "user"] as const)
    for (const permission of ["sources.manage", "audit.view", "zalo.view"] as const)
      assert.equal(permissions.can({ roles: [role] }, permission), role === "admin");
});
test("source codes normalize and reject reserved, multi-letter and malformed inputs", () => {
  const base = { name: "Nguồn mới", ownerUserId: null, active: true };
  assert.equal(sourceSchema.createAdSourceSchema.parse({ ...base, code: "a" }).code, "A");
  for (const code of ["R", "r", "AA", "1", ""]) assert.equal(sourceSchema.createAdSourceSchema.safeParse({ ...base, code }).success, false);
});
test("audit privacy recursively removes secrets and masks contact data in all views", () => {
  const result = JSON.stringify(privacy.sanitizeAuditData({ token: "super-secret", password: "bad", nested: { apiKey: "hidden", phone: "0901234567", email: "alice@gmail.com" },
    note: "Bearer secret-123 token=other-secret https://bot.example/secret" }));
  for (const value of ["super-secret", "bad", "hidden", "0901234567", "alice@gmail.com", "secret-123", "other-secret", "bot.example"])
    assert.equal(result.includes(value), false);
  assert.match(result, /0901 \*\*\* 567/); assert.match(result, /a\*\*\*@gmail.com/);
  assert.equal(privacy.safeZaloError("unstructured-secret-token"), "Chưa gửi được tin Zalo. Bạn kiểm tra kết nối rồi thử lại.");
  assert.equal(privacy.safeZaloError(null), null);
  assert.doesNotMatch(JSON.stringify(privacy.sanitizeAuditData({ field: "password", before: "old-secret", after: "new-secret" })), /old-secret|new-secret/);
  assert.doesNotMatch(privacy.maskPrivateText('{"password":"embedded-secret"}'), /embedded-secret/);
});
test("unknown audit actions retain the raw key and dates use inclusive Vietnam business days", () => {
  assert.equal(auditActionLabel("future.action"), "future.action");
  assert.equal(auditActionLabel("source.created"), "đã thêm nguồn");
  assert.equal(auditActionLabel("constructor"), "constructor"); assert.equal(auditValue("toString"), "toString"); assert.equal(auditValue("sale"), "Tư vấn");
  assert.equal(viewerSchema.viewerFilterSchema.safeParse({ from: "2026-10-15", to: "2026-10-14" }).success, false);
  assert.equal(viewerSchema.viewerFilterSchema.safeParse({ page: 0 }).success, false);
  const range = viewerSchema.viewerDates({ page: 1, from: "2026-10-14", to: "2026-10-14" });
  assert.equal(range.start?.toISOString(), "2026-10-13T17:00:00.000Z");
  assert.equal(range.end?.toISOString(), "2026-10-14T17:00:00.000Z");
});
test("numeric and international audit contacts are masked without altering UUIDs", () => {
  const value = JSON.stringify(privacy.sanitizeAuditData({ phone: 84901234567, nested: { mobile: "+1 202 555 0198" },
    field: "phone", before: 901234567, after: "0901234567", note: "Call 901234567 or +1 202 555 0198" }));
  assert.doesNotMatch(value, /84901234567|901234567|0901234567|202 555 0198/);
  const uuid = "00000000-0000-4000-8000-000000000010";
  assert.equal(privacy.maskPrivateText(uuid), uuid);
  assert.doesNotMatch(privacy.maskPrivateText("0901234567 123456789"), /0901234567|123456789/);
});
test("sources, audit SQL and queue retries run on isolated Postgres", async (t) => {
  let lastQuery = { query: "", params: [] as unknown[] };
  const pg = await PGlite.create(); const conn = drizzle(pg, { schema, casing: "snake_case",
    logger: { logQuery(query, params) { lastQuery = { query, params }; } } }); const db = conn as unknown as Db;
  try {
    for (const migration of await readMigrations()) await pg.exec(migration.sql);
    const security = await pg.query<{ relrowsecurity: boolean }>("select relrowsecurity from pg_class where relname in ('ad_sources','audit_log','zalo_bot_outbox')");
    assert.equal(security.rows.length, 3); assert.ok(security.rows.every((r) => r.relrowsecurity));
    assert.equal((await pg.query("select * from pg_policies where tablename in ('ad_sources','audit_log','zalo_bot_outbox')")).rows.length, 0);
    const accounts = await conn.insert(schema.users).values([
      { name: "Fixture admin", email: "admin@example.invalid" }, { name: "Fixture sale one", email: "one@example.invalid" },
      { name: "Fixture sale two", email: "two@example.invalid" }, { name: "Fixture public", email: "public@example.invalid" },
    ]).returning();
    await conn.insert(schema.userRoles).values(accounts.slice(1, 3).map((a) => ({ userId: a.id, role: "sale" as const })));
    const user = (index: number, roles: permissions.Role[], sourceIds: string[] = []): permissions.SessionUser => ({
      id: accounts[index].id, name: accounts[index].name, email: accounts[index].email, avatarUrl: null, roles, sourceIds, studentId: null,
    });
    const admin = user(0, ["admin"]); const sale = user(1, ["sale"]);
    const common = { "drizzle-orm": orm, "@/server/db": { db }, "@/server/db/schema": schema, "@/lib/auth/permissions": permissions };
    const audit = await loadServerModule<typeof import("../src/server/audit")>("src/server/audit.ts", common);
    const scope = await loadServerModule<typeof import("../src/server/auth/scope")>("src/server/auth/scope.ts", common);
    const deps = { ...common, "@/server/audit": audit, "@/server/auth/scope": scope, "@/lib/schemas/ad-source": sourceSchema,
      "@/lib/schemas/admin-viewers": viewerSchema, "@/lib/audit-privacy": privacy };
    const phones = await loadServerModule<typeof import("../src/server/phone-matches")>("src/server/phone-matches.ts", {
      ...deps, "@/lib/schemas/lead": leadSchema, "@/lib/phone": await import("../src/lib/phone"),
    });
    const records = await loadServerModule<typeof import("../src/server/ad-source-record")>("src/server/ad-source-record.ts", deps);
    const queries = await loadServerModule<typeof import("../src/server/queries/ad-sources")>("src/server/queries/ad-sources.ts", deps);
    const logs = await loadServerModule<typeof import("../src/server/queries/audit-log")>("src/server/queries/audit-log.ts", deps);
    const outbox = await loadServerModule<typeof import("../src/server/zalo/outbox")>("src/server/zalo/outbox.ts", { ...deps,
      "@/server/env": { serverEnv: {} }, "@/server/zalo/client": {}, "@/server/zalo/messages": { ZALO_ONBOARDING_MESSAGES: [] } });
    const queueRecords = await loadServerModule<typeof import("../src/server/zalo-queue-record")>("src/server/zalo-queue-record.ts", { ...deps, "@/server/zalo/outbox": outbox });
    const queueQueries = await loadServerModule<typeof import("../src/server/queries/zalo-queue")>("src/server/queries/zalo-queue.ts", deps);
    const create = (actor: permissions.SessionUser, code: string, ownerUserId: string | null = null) => conn.transaction((tx) => records.createSourceRecord(tx as never, actor, { code, name: `Fixture ${code}`, ownerUserId, active: true }));
    await conn.insert(schema.adSources).values({ code: "R", name: "RVPY" });
    let sourceId = "";
    await t.test("source permissions, uniqueness and sale ownership are enforced by records and queries", async () => {
      await assert.rejects(create(sale, "A"), /quyền/);
      await assert.rejects(create(admin, "R"));
      await assert.rejects(create(admin, "B", accounts[3].id), /tư vấn/);
      sourceId = (await create(admin, "A", accounts[1].id)).id;
      await assert.rejects(create(admin, "A"), /đã được dùng/);
      await assert.rejects(queries.listAdSources(sale), /Forbidden/);
      assert.equal((await queries.listSourceOwners(admin)).length, 2);
    });
    await t.test("source writes and their audit entries roll back together", async () => {
      const initial = await logs.listAuditLog(admin, { page: 1, action: "source.created" });
      const rollback = new Error("fixture rollback");
      await assert.rejects(conn.transaction(async (tx) => { await records.createSourceRecord(tx as never, admin, {
        code: "D", name: "Rollback fixture", ownerUserId: null, active: true }); throw rollback; }), /fixture rollback/);
      assert.equal((await conn.select().from(schema.adSources).where(orm.eq(schema.adSources.code, "D"))).length, 0);
      assert.equal((await logs.listAuditLog(admin, { page: 1, action: "source.created" })).total, initial.total);
    });
    const [student] = await conn.insert(schema.students).values({ sourceId, code: "A2610001", codeMonth: "2610", seq: 1,
      fullName: "Fixture learner", phone: "0901234567", signedUpAt: new Date() }).returning();
    await t.test("archived rows are excluded from monthly, lifetime, enrolled, conversion and all six cohorts", async () => {
      const now = new Date();
      const current = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit" }).format(now);
      const [year, month] = current.split("-").map(Number);
      const dates = Array.from({ length: 6 }, (_, i) => new Date(Date.UTC(year, month - 1 - i, 10)));
      await conn.insert(schema.students).values(dates.map((signedUpAt, i) => ({ sourceId, code: `A260900${i + 1}`, codeMonth: "2609", seq: i + 1,
        fullName: "Archived fixture", phone: `090122200${i}`, status: "enrolled" as const, signedUpAt, archivedAt: now, archiveReason: "test" as const })));
      const summary = (await queries.listAdSources(admin)).find((s) => s.id === sourceId)!;
      assert.equal(summary.monthLeads, 1); assert.equal(summary.total, 1); assert.equal(summary.enrolled, 0); assert.equal(summary.conversion, 0);
      for (const cohort of summary.months) {
        assert.equal(cohort.leads, cohort.month === current ? 1 : 0);
        assert.equal(cohort.total, cohort.month === current ? 1 : 0); assert.equal(cohort.enrolled, 0);
      }
    });
    await t.test("an archived-only source has null conversion and transfers with zero active lead count", async () => {
      const id = (await create(admin, "E", accounts[1].id)).id;
      await conn.insert(schema.students).values({ sourceId: id, code: "E2610001", codeMonth: "2610", seq: 1,
        fullName: "Archived-only fixture", phone: "0901222999", status: "enrolled", archivedAt: new Date(), archiveReason: "test" });
      const summary = (await queries.listAdSources(admin)).find((s) => s.id === id)!;
      assert.equal(summary.total, 0); assert.equal(summary.enrolled, 0); assert.equal(summary.monthLeads, 0); assert.equal(summary.conversion, null);
      assert.ok(summary.months.every((m) => m.total === 0 && m.leads === 0 && m.enrolled === 0));
      await conn.transaction((tx) => records.updateSourceRecord(tx as never, admin, { id, name: "Fixture E", ownerUserId: accounts[2].id,
        expectedName: "Fixture E", expectedOwnerUserId: accounts[1].id, active: true, expectedActive: true, expectedLeadCount: 0 }));
    });
    await t.test("owner changes require exact lead confirmation, reject stale edits and change studentScope", async () => {
      const edit = { id: sourceId, name: "Fixture A", ownerUserId: accounts[2].id, active: true,
        expectedName: "Fixture A", expectedOwnerUserId: accounts[1].id, expectedActive: true };
      await assert.rejects(conn.transaction((tx) => records.updateSourceRecord(tx as never, admin, edit)), /xác nhận/);
      await assert.rejects(conn.transaction((tx) => records.updateSourceRecord(tx as never, admin, { ...edit, confirmOwnerChange: true, expectedLeadCount: 2 })), /xác nhận/);
      await conn.transaction((tx) => records.updateSourceRecord(tx as never, admin, { ...edit, confirmOwnerChange: true, expectedLeadCount: 1 }));
      await assert.rejects(conn.transaction((tx) => records.updateSourceRecord(tx as never, admin, edit)), /người khác/);
      const visible = async (index: number) => {
        const owned = await conn.select({ id: schema.adSources.id }).from(schema.adSources).where(orm.eq(schema.adSources.ownerUserId, accounts[index].id));
        return conn.select({ id: schema.students.id }).from(schema.students).where(orm.and(orm.isNull(schema.students.archivedAt), scope.studentScope(user(index, ["sale"], owned.map((s) => s.id)), "management")));
      };
      assert.equal((await visible(1)).length, 0); assert.equal((await visible(2)).length, 1);
      const summary = (await queries.listAdSources(admin)).find((s) => s.id === sourceId)!;
      assert.equal(summary.total, 1); assert.equal(summary.months.length, 6);
    });
    await t.test("inactive sources reject manual creation and public signup falls back to R for inactive or unknown codes", async () => {
      await conn.transaction((tx) => records.updateSourceRecord(tx as never, admin, { id: sourceId, name: "Fixture A", ownerUserId: accounts[2].id, active: false,
        expectedName: "Fixture A", expectedOwnerUserId: accounts[2].id, expectedActive: true }));
      const leadRecords = await loadServerModule<typeof import("../src/server/lead-record")>("src/server/lead-record.ts", { ...deps, "@/lib/student-code": studentCode });
      const cookieStore = { get: () => undefined, set: () => undefined };
      let tokenSequence = 0;
      const actions = await loadServerModule<typeof import("../src/server/actions/leads")>("src/server/actions/leads.ts", { ...deps,
        "@/server/phone-matches": phones,
        "@/lib/runtime-mode": { USE_MOCK: false }, "@/lib/schemas/lead": leadSchema, "@/server/auth/session": { requirePermission: async () => admin },
        "@/server/env": { serverEnv: {} }, "@/server/lead-record": leadRecords, "next/cache": { revalidatePath: () => undefined },
        "next/headers": { cookies: async () => cookieStore, headers: async () => new Headers() },
        "@/server/signup-session": { SIGNUP_COOKIE: "fixture", getSignupSession: async () => null, newSignupToken: () => `fixture-${++tokenSequence}`, hashSignupToken: (s: string) => s, SIGNUP_SESSION_SECONDS: 100 },
        "@/server/signup-protection": { requireSignupLimits: async () => undefined, validateSignupCaptcha: async () => undefined, signupClientIp: () => "fixture", SignupProtectionError: class extends Error {} },
      });
      assert.equal((await actions.createManualLead({ sourceId, fullName: "Fixture new", phone: "0901000001" })).ok, false);
      for (const [i, code] of ["A", "Z"].entries()) {
        const result = await actions.submitLeadSignup({ sourceCode: code, fullName: "Fixture public", phone: `090100000${i + 2}`, email: `fixture${i}@gmail.com`, occupation: "Đang đi làm", birthYear: 1995,
          specialty: "Kiến trúc", hometown: "Fixture", organization: "Fixture", facebookLink: "https://example.invalid", answers: {} });
        assert.equal(result.ok, true, JSON.stringify(result)); if (result.ok) assert.match(result.data.code, /^R/);
      }
    });
    await t.test("reserved R cannot be deactivated and revoked owners do not prevent unrelated edits", async () => {
      const [reserved] = await conn.select().from(schema.adSources).where(orm.eq(schema.adSources.code, "R"));
      await assert.rejects(conn.transaction((tx) => records.updateSourceRecord(tx as never, admin, { id: reserved.id, name: reserved.name,
        ownerUserId: null, active: false, expectedName: reserved.name, expectedOwnerUserId: null, expectedActive: true })), /Nguồn R/);
      await conn.delete(schema.userRoles).where(orm.and(orm.eq(schema.userRoles.userId, accounts[2].id), orm.eq(schema.userRoles.role, "sale")));
      await conn.transaction((tx) => records.updateSourceRecord(tx as never, admin, { id: sourceId, name: "Renamed former owner source", ownerUserId: accounts[2].id,
        active: true, expectedName: "Fixture A", expectedOwnerUserId: accounts[2].id, expectedActive: false }));
      await assert.rejects(create(admin, "B", accounts[2].id), /tư vấn/);
      assert.equal((await conn.select().from(schema.adSources).where(orm.eq(schema.adSources.id, sourceId)))[0].active, true);
    });
    await t.test("activation Undo uses optimistic snapshots and refuses to overwrite a later edit", async () => {
      const name = "Renamed former owner source";
      const edit = { id: sourceId, name, ownerUserId: accounts[2].id, expectedName: name, expectedOwnerUserId: accounts[2].id };
      await conn.transaction((tx) => records.updateSourceRecord(tx as never, admin, { ...edit, active: false, expectedActive: true }));
      await conn.transaction((tx) => records.updateSourceRecord(tx as never, admin, { ...edit, active: true, expectedActive: false }));
      await conn.transaction((tx) => records.updateSourceRecord(tx as never, admin, { ...edit, name: "Later edit", active: true, expectedActive: true }));
      await assert.rejects(conn.transaction((tx) => records.updateSourceRecord(tx as never, admin, { ...edit, active: false, expectedActive: true })), /người khác/);
      const current = (await conn.select().from(schema.adSources).where(orm.eq(schema.adSources.id, sourceId)))[0];
      assert.equal(current.name, "Later edit"); assert.equal(current.active, true);
    });
    await t.test("audit SQL filters, boundaries and masking apply before returning rows", async () => {
      const entries = Array.from({ length: 101 }, () => ({ actorId: admin.id, action: "fixture.action", entity: "fixture", entityId: student.id,
        data: { password: "secret", email: "alice@gmail.com", phone: "0901234567" }, createdAt: new Date("2026-10-14T03:00:00Z") }));
      await conn.insert(schema.auditLog).values(entries);
      const filter = { page: 1, actor: "Fixture admin", action: "fixture.action", entity: "fixture", from: "2026-10-14", to: "2026-10-14", search: student.id.slice(0, 8) };
      const first = await logs.listAuditLog(admin, filter); assert.equal(first.total, 101); assert.equal(first.rows.length, 50);
      const second = await logs.listAuditLog(admin, { ...filter, page: 2 }); assert.equal(second.rows.length, 50);
      assert.equal(first.rows.some((r) => second.rows.some((s) => s.id === r.id)), false);
      const last = await logs.listAuditLog(admin, { ...filter, page: 999 }); assert.equal(last.page, 3); assert.equal(last.rows.length, 1);
      assert.equal((await logs.listAuditLog(admin, { ...filter, actor: "absent" })).total, 0);
      assert.equal((await logs.listAuditLog(admin, { ...filter, search: "%" })).total, 0);
      assert.equal((await logs.listAuditLog(admin, { ...filter, from: "2026-10-15", to: "2026-10-15" })).total, 0);
      assert.doesNotMatch(JSON.stringify(first.rows), /secret|alice@gmail.com|0901234567/);
      await assert.rejects(logs.listAuditLog(sale, { page: 1 }), /Forbidden/);
    });
    await t.test("queue retries accept failed items only, cap at 50 and audit the shared reset", async () => {
      const items = await conn.insert(schema.zaloBotOutbox).values(Array.from({ length: 53 }, (_, i) => ({ studentId: student.id,
        chatId: "fixture-chat", eventKey: `fixture:${i}`, sequence: i + 1, kind: "text", body: "Fixture", status: i === 52 ? "sent" : "failed", attempts: 6, lastError: "unstructured-secret-token" }))).returning();
      await assert.rejects(queueQueries.listZaloQueue(sale, { page: 1 }), /Forbidden/);
      await assert.rejects(conn.transaction((tx) => queueRecords.retryQueueRecord(tx as never, sale, { id: items[0].id })), /quyền/);
      await assert.rejects(conn.transaction((tx) => queueRecords.retryQueueRecord(tx as never, admin, { id: items[52].id })), /Không còn/);
      await assert.rejects(conn.transaction((tx) => queueRecords.retryQueueRecord(tx as never, admin, { all: true })), /xác nhận/);
      assert.equal((await queueQueries.listZaloQueue(admin, { page: 1, status: "failed" })).total, 52);
      assert.doesNotMatch(JSON.stringify(await queueQueries.listZaloQueue(admin, { page: 1 })), /unstructured-secret-token|fixture-chat/);
      const result = await conn.transaction((tx) => queueRecords.retryQueueRecord(tx as never, admin, { all: true, confirmed: true }));
      assert.equal(result.count, 50);
      const summary = await queueQueries.getZaloQueueSummary(admin); assert.equal(summary.pendingCount, 50); assert.equal(summary.failedCount, 2);
      assert.equal((await queueQueries.getZaloQueueSummary({ ...sale, sourceIds: [] })).pendingCount, 0);
      const pending = (await conn.select().from(schema.zaloBotOutbox).where(orm.eq(schema.zaloBotOutbox.status, "pending")))[0];
      assert.equal(pending.attempts, 0); assert.equal(pending.lastError, null);
      assert.equal((await logs.listAuditLog(admin, { page: 1, action: "zalo.retried" })).total, 1);
      assert.equal((await conn.select().from(schema.zaloBotOutbox).where(orm.eq(schema.zaloBotOutbox.id, items[52].id)))[0].status, "sent");
    });
    await t.test("audit count and offset stay bounded at 10,000 newest matches on a 12,050-row fixture", async () => {
      await pg.query(`insert into audit_log(actor_id, action, entity, entity_id, data, created_at)
        select $1, 'scale.bulk', 'fixture', $2, jsonb_build_object('before','new','after','consulting'),
        '2026-01-01'::timestamptz + n * interval '1 second' from generate_series(1,12050) n`, [admin.id, student.id]);
      await pg.exec("ANALYZE audit_log");
      const started = performance.now();
      const first = await logs.listAuditLog(admin, { page: 1, action: "scale.bulk" });
      const elapsed = performance.now() - started;
      assert.equal(first.total, 10000); assert.equal(first.totalCapped, true); assert.equal(first.hasNext, true); assert.equal(first.rows.length, 50);
      assert.ok(first.rows.every((row) => row.action === "scale.bulk"));
      const actual = lastQuery;
      assert.match(actual.query, /limit \$\d+/);
      assert.ok(actual.params.includes(10001));
      const plan = await pg.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${actual.query}`, actual.params);
      const json = JSON.stringify(plan.rows);
      // Planner choices vary between PGlite/Postgres versions; record the actual
      // plan and timing rather than force an index or a brittle fixed node tree.
      t.diagnostic(JSON.stringify({ auditRows: 12050, elapsedMs: Math.round(elapsed), plan: plan.rows }));
      assert.match(json, /audit_log_(created_id|action_created)_index/);
      const last = await logs.listAuditLog(admin, { page: 99999, action: "scale.bulk" });
      assert.equal(last.page, 200); assert.equal(last.rows.length, 50); assert.equal(last.hasNext, false);
      assert.equal(first.rows.some((a) => last.rows.some((b) => a.id === b.id)), false);
      assert.ok(new Date(first.rows[49].createdAt) > new Date(last.rows[0].createdAt));
      const filtered = await logs.listAuditLog(admin, { page: 1, action: "scale.bulk", from: "2026-01-02", to: "2026-01-02" });
      assert.equal(filtered.total, 0); assert.equal(filtered.totalCapped, false); assert.equal(filtered.page, 1); assert.equal(filtered.hasNext, false);
    });
    await t.test("audit distinguishes exactly 10,000 matches from the 10,001 overflow sentinel", async () => {
      await pg.query(`insert into audit_log(actor_id, action, entity, created_at)
        select $1, 'scale.boundary', 'fixture', '2026-02-01'::timestamptz + n * interval '1 second'
        from generate_series(1,10000) n`, [admin.id]);
      const exact = await logs.listAuditLog(admin, { page: 200, action: "scale.boundary", actor: "Fixture admin", entity: "fixture" });
      assert.equal(exact.total, 10000); assert.equal(exact.totalCapped, false); assert.equal(exact.hasNext, false); assert.equal(exact.rows.length, 50);
      await conn.insert(schema.auditLog).values({ actorId: admin.id, action: "scale.boundary", entity: "fixture" });
      const capped = await logs.listAuditLog(admin, { page: 1, action: "scale.boundary" });
      assert.equal(capped.total, 10000); assert.equal(capped.totalCapped, true); assert.equal(capped.hasNext, true);
    });
  } finally { await pg.close(); }
});
