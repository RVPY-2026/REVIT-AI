import assert from "node:assert/strict";
import test from "node:test";
import { config } from "dotenv";
import postgres from "postgres";
import { POSTGRES_READ_CONNECTION_OPTIONS, POSTGRES_WRITE_CONNECTION_OPTIONS } from "../src/server/db/connection-options";

/** Opt-in network check: only SELECTs; no application records are changed. */
test("the real Postgres.js pool can reserve, commit, roll back and reuse a transaction connection", {
  skip: process.env.RVPY_VERIFY_DATABASE_TRANSACTIONS !== "1",
}, async () => {
  config({ path: ".env.local", quiet: true });
  assert.ok(process.env.DATABASE_URL);
  const client = postgres(process.env.DATABASE_URL, { ...POSTGRES_WRITE_CONNECTION_OPTIONS, max: 1 });
  const readClient = postgres(process.env.DATABASE_URL, { ...POSTGRES_READ_CONNECTION_OPTIONS, max: 1 });
  const rollback = new Error("intentional test rollback");
  try {
    // Warm the connection just as a management list does before a mutation.
    const [initial] = await client`select 1::int as value`;
    assert.equal(initial.value, 1);
    const committed = await client.begin(async (tx) => {
      const [row] = await tx`select 2::int as value`;
      return row.value;
    });
    assert.equal(committed, 2);
    await assert.rejects(client.begin(async (tx) => {
      await tx`select 3::int as value`;
      throw rollback;
    }), (error) => error === rollback);
    const parallel = await Promise.all([
      readClient`select 4::int as value`, readClient`select 5::int as value`,
    ]);
    assert.deepEqual(parallel.map(([row]) => row.value), [4, 5]);
    const [reused] = await client`select 6::int as value`;
    assert.equal(reused.value, 6);
  } finally {
    await Promise.all([client.end({ timeout: 1 }), readClient.end({ timeout: 1 })]);
  }
});
