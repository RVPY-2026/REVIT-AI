import type { StudentStatus } from "@/lib/constants";

/** What the import page shows before anything is written. Names are for admins only. */
export type ImportSummary = {
  newCount: number;
  newByStatus: Partial<Record<StudentStatus, number>>;
  newSample: { code: string; fullName: string; status: StudentStatus }[];
  existingCount: number;
  withChanges: number;
  fillCount: number;
  newNotes: number;
  statusFollow: { count: number; sample: { code: string; fullName: string; from: StudentStatus; to: StudentStatus }[] };
  statusConflict: { count: number; sample: { code: string; fullName: string; site: StudentStatus; sheet: StudentStatus }[] };
  missingSources: string[];
  problems: { badCode: number[]; badPhone: number[]; unknownStatus: number[]; duplicateCode: number[]; badEmail: number; blank: number };
};

export type ImportOutcome = { inserted: number; updated: number; statusChanged: number; notesAdded: number; createdSources: string[]; skippedFields: number; skippedStatuses: number };
