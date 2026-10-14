import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";
import { POSTGRES_WRITE_CONNECTION_OPTIONS, POSTGRES_READ_CONNECTION_OPTIONS } from "../src/server/db/connection-options";

test("the configured Postgres.js pool permits one in-flight query and transaction reservation", async () => {
  // Constructing a client does not connect until a query is executed.
  const client = postgres("postgres://test:test@localhost:5432/test", POSTGRES_WRITE_CONNECTION_OPTIONS);
  try {
    const actual = client.options as typeof client.options & { max_pipeline: number };
    assert.equal(actual.max_pipeline, 1);
    assert.equal(actual.prepare, false);
    assert.equal(POSTGRES_READ_CONNECTION_OPTIONS.max_pipeline, 0);
    assert.equal(POSTGRES_WRITE_CONNECTION_OPTIONS.max, 2);
  } finally {
    await client.end({ timeout: 1 });
  }
});
