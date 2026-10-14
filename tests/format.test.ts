import assert from "node:assert/strict";
import test from "node:test";
import { formatDate, formatDateTime } from "../src/lib/format";

test("Vietnam dates and times stay consistent across UTC and non-Vietnam hosts", () => {
  const previousTimezone = process.env.TZ;
  try {
    for (const timeZone of ["UTC", "America/Los_Angeles", "Asia/Ho_Chi_Minh"]) {
      process.env.TZ = timeZone;
      const instant = "2026-09-30T17:30:00.000Z";
      assert.equal(formatDate(instant), "01/10/2026", timeZone);
      assert.equal(formatDateTime(new Date(instant)), "01/10/2026 00:30", timeZone);
      assert.equal(formatDateTime("2026-12-31T17:00:00Z"), "01/01/2027 00:00", timeZone);
      assert.equal(formatDate("2026-10-09"), "09/10/2026", timeZone);
      assert.equal(formatDateTime("2026-10-09"), "09/10/2026 00:00", timeZone);
    }
  } finally {
    if (previousTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = previousTimezone;
  }
});
