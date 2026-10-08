/** Return shape of every Server Action. Errors are Vietnamese, ready to show in a toast. */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };
