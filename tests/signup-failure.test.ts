import assert from "node:assert/strict";
import test from "node:test";
import * as orm from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import * as permissions from "../src/lib/auth/permissions";
import * as leadSchemas from "../src/lib/schemas/lead";
import * as schema from "../src/server/db/schema";
import { loadServerModule } from "./helpers/server-module";

class DuplicateSignupError extends Error {}
class SignupProtectionError extends Error {}
class DuplicatePhoneError extends Error {}

const input: leadSchemas.LeadSignupInput = {
  fullName: "Fixture Applicant", phone: "0900000099", email: "fixture.applicant@gmail.com",
  occupation: "Đang đi làm", birthYear: 1995, specialty: "Architecture", hometown: "Fixture City",
  organization: "Fixture Studio", facebookLink: "https://www.facebook.com/fixture", answers: {},
};

async function fixture(options: {
  error?: unknown;
  failAt?: "limits" | "insert" | "confirmation";
  mock?: boolean;
  noSource?: boolean;
} = {}) {
  const logs: unknown[][] = [];
  let writes = 0;
  const query = {
    from: () => query, where: () => query, orderBy: () => query,
    for: async () => options.noSource ? [] : [{ id: "source-r", code: "R" }],
  };
  const actions = await loadServerModule<typeof import("../src/server/actions/leads")>("src/server/actions/leads.ts", {
    "drizzle-orm": orm,
    "next/headers": {
      cookies: async () => ({ get: () => undefined, set: () => {
        if (options.failAt === "confirmation") throw options.error;
      } }),
      headers: async () => new Headers(),
    },
    "next/cache": { revalidatePath: () => {} },
    "@/lib/runtime-mode": { USE_MOCK: options.mock ?? false },
    "@/lib/auth/permissions": permissions,
    "@/lib/schemas/lead": leadSchemas,
    "@/server/auth/session": { requirePermission: () => { throw new Error("Unexpected staff action"); } },
    "@/server/db": { db: { transaction: async (operation: (tx: unknown) => unknown) => operation({
      select: () => query, insert: () => ({ values: async () => { writes++; } }),
    }) } },
    "@/server/db/schema": schema,
    "@/server/env": { serverEnv: {} },
    "@/server/lead-record": {
      DuplicateSignupError,
      insertLeadRecord: async () => {
        if (options.failAt === "insert") throw options.error;
        writes++;
        return { id: "fixture-id", code: "R2610001" };
      },
    },
    "@/server/signup-session": {
      SIGNUP_COOKIE: "signup", ZALO_LINK_COOKIE: "zalo", SIGNUP_SESSION_SECONDS: 3600,
      hashSignupToken: () => "fixture-hash", newSignupToken: () => "fixture-token",
      getSignupSession: async () => null, renewSignupZaloCode: async () => null,
    },
    "@/server/signup-protection": {
      SignupProtectionError, signupClientIp: () => "unknown", validateSignupCaptcha: async () => {},
      requireSignupLimits: async () => { if (!options.failAt || options.failAt === "limits") {
        if (options.error) throw options.error;
      } },
    },
    "@/server/phone-matches": { DuplicatePhoneError, requirePhoneAcknowledgment: async () => {} },
  }, {}, { console: { error: (...parts: unknown[]) => { logs.push(parts); } } });
  return { actions, logs, writes: () => writes };
}

test("signup identifies wrapped schema errors with a support ID and logs no query or personal data", async () => {
  for (const code of ["42703", "42P01", "42883"]) {
    const app = await fixture({ failAt: "insert", error: {
      message: `Failed query ${input.email} ${input.phone}`, params: [input.fullName],
      cause: { code, message: "Missing internal schema details" },
    } });
    const result = await app.actions.submitLeadSignup(input);
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("Expected signup failure");
    assert.match(result.error, /chưa được cập nhật/);
    const reference = result.error.match(/Mã hỗ trợ: ([a-f0-9]{8})/)?.[1];
    assert.ok(reference);
    assert.equal(app.logs.length, 1);
    assert.deepEqual(JSON.parse(JSON.stringify(app.logs[0][1])), { incidentId: reference, stage: "lead-record", code });
    assert.doesNotMatch(JSON.stringify({ result, logs: app.logs }), /fixture\.applicant|0900000099|Fixture Applicant|Failed query|internal schema/);
    assert.equal(app.writes(), 0);
  }
});

test("signup distinguishes connection outages, missing source and post-commit confirmation failure", async () => {
  const disconnected = await fixture({ error: { cause: { code: "ECONNREFUSED" } } });
  const connectionResult = await disconnected.actions.submitLeadSignup(input);
  assert.equal(connectionResult.ok, false);
  if (!connectionResult.ok) assert.match(connectionResult.error, /Kết nối lưu đăng ký đang gián đoạn/);
  const noSource = await fixture({ noSource: true });
  const sourceResult = await noSource.actions.submitLeadSignup(input);
  assert.equal(sourceResult.ok, false);
  if (!sourceResult.ok) assert.match(sourceResult.error, /chưa cấu hình nơi tiếp nhận/);
  assert.equal(noSource.writes(), 0);
  const confirmation = await fixture({ failAt: "confirmation", error: new Error("Cookie failure with private data") });
  const confirmationResult = await confirmation.actions.submitLeadSignup(input);
  assert.equal(confirmationResult.ok, false);
  if (!confirmationResult.ok) assert.match(confirmationResult.error, /tránh đăng ký trùng/);
  assert.equal(confirmation.writes(), 2);
  assert.doesNotMatch(JSON.stringify(confirmation.logs), /private data/);
});

test("signup preserves actionable duplicate/protection messages, contains unknown failures, and never writes in mock mode", async () => {
  for (const error of [new DuplicateSignupError("Đã đăng ký trước đó."), new SignupProtectionError("Bạn xác minh lại nhé.")]) {
    const app = await fixture({ error });
    const result = await app.actions.submitLeadSignup(input);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error, error.message);
    assert.equal(app.logs.length, 0);
  }
  const unexpected = await fixture({ error: { cause: { code: "not-an-allowed-code", cause: { code: "XX000" } } } });
  const result = await unexpected.actions.submitLeadSignup(input);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /Mã hỗ trợ: [a-f0-9]{8}/);
  const mock = await fixture({ mock: true, error: new Error("Must not run") });
  assert.equal((await mock.actions.submitLeadSignup(input)).ok, false);
  assert.equal(mock.writes(), 0);
  assert.equal(mock.logs.length, 0);
});

test("signup limiter binds raw SQL timestamps as ISO strings for the Postgres.js driver", async () => {
  const protection = await loadServerModule<typeof import("../src/server/signup-protection")>("src/server/signup-protection.ts", {
    "drizzle-orm": orm, "@/server/db": { db: {} }, "@/server/db/schema": schema,
    "@/server/env": { serverEnv: {} },
  });
  const dialect = new PgDialect({ casing: "snake_case" });
  const queries: { sql: string; params: unknown[] }[] = [];
  const tx = {
    insert: () => ({ values: () => ({ onConflictDoUpdate: (config: {
      set: { used: orm.SQL; resetsAt: orm.SQL }; setWhere: orm.SQL;
    }) => ({ returning: async () => {
      queries.push(...[config.set.used, config.set.resetsAt, config.setWhere].map(query => dialect.sqlToQuery(query)));
      return [{ used: 1 }];
    } }) }) }),
  };
  const now = new Date("2026-10-20T00:00:00.000Z");
  assert.equal(await protection.consumeSignupLimits(tx as never, [{ key: "fixture", limit: 3, windowMs: 60000 }], now, "fixture-secret"), true);
  assert.equal(queries.length, 3);
  for (const query of queries) {
    assert.ok(query.params.every(value => !(value instanceof Date)), "raw date parameters bypass the driver timestamp mapper");
    assert.match(query.sql, /::timestamptz/);
    assert.ok(query.params.includes("2026-10-20T00:00:00.000Z"));
  }
  assert.ok(queries[1].params.includes("2026-10-20T00:01:00.000Z"));
});
