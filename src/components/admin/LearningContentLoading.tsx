import { ManagementLoading } from "./ManagementLoading";

/** Retain the learning route/showcase API while sharing management skeletons. */
export function LearningContentLoading({ embedded = false }: { embedded?: boolean } = {}) {
  return <ManagementLoading embedded={embedded} variant="learning" />;
}
