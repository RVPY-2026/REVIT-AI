import "server-only";

export const RESOURCE_BUCKET = "learning-resources";

/** The private path nonce is independent of the public reservation ID. */
export function resourceObjectPath(filename: string, nonce: string): string {
  const basename = filename.replaceAll("\\", "/").split("/").pop() ?? "file";
  let safe = basename.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9._-]/g, "-").slice(-120).replace(/^\.+/, "") || "file";
  if (!safe.includes(".") && basename.includes(".")) safe = `file.${basename.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin"}`;
  return `resources/${nonce}/${safe}`;
}
