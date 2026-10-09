type PlanTiming = { baseDays: number | null; dueDateOverride?: string | null };

const DAY_MS = 86_400_000;
function dateMillis(value: string): number {
  const millis = Date.parse(`${value}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(millis)
    || new Date(millis).toISOString().slice(0, 10) !== value) {
    throw new RangeError("Invalid calendar date");
  }
  return millis;
}

/** Input rows follow plan order. Overrides reset the spreadsheet recurrence.
 * Unknown durations stay unknown until an explicit date establishes a new anchor.
 * Calculate each phase independently; priority flags do not remove topic durations.
 */
export function commitmentDates(startDate: string | null, multiplier: number, rows: PlanTiming[]): (string | null)[] {
  if (!Number.isFinite(multiplier) || multiplier <= 0 || multiplier > 100) {
    throw new RangeError("Invalid duration multiplier");
  }
  let cursor = startDate === null ? null : dateMillis(startDate);
  return rows.map((row) => {
    if (row.baseDays !== null && (!Number.isInteger(row.baseDays) || row.baseDays < 0 || row.baseDays > 3650)) {
      throw new RangeError("Invalid base duration");
    }
    if (row.dueDateOverride) cursor = dateMillis(row.dueDateOverride);
    else if (cursor !== null && row.baseDays !== null) cursor += row.baseDays * multiplier * DAY_MS;
    else cursor = null;
    return cursor === null ? null : new Date(cursor).toISOString().slice(0, 10);
  });
}
