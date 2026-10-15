export const NOTE_CORRECTION_WINDOW_MS = 15 * 60_000;

/** Corrections cannot move the original contact time or restart the author window. */
export function canCorrectContactNote(createdAt: Date, authorId: string | null, userId: string, now = new Date()): boolean {
  const elapsed = now.getTime() - createdAt.getTime();
  return authorId === userId && elapsed >= 0 && elapsed <= NOTE_CORRECTION_WINDOW_MS;
}
