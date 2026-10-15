import "server-only";
import { USE_MOCK } from "@/lib/runtime-mode";
/** Explicit local-only fixtures for reproducible visual acceptance checks. */
export function adminPreviewState(params: Record<string, string | string[] | undefined>) {
  return USE_MOCK && process.env.RVPY_ADMIN_VIEWER_TEST_STATES === "1" && typeof params.previewState === "string" ? params.previewState : "";
}
