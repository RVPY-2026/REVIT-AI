import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const requirePackage = createRequire(import.meta.url);

/** Execute the actual server module with explicit request/DB boundaries. Never fall through to a live DB. */
export async function loadServerModule<T>(path: string, dependencies: Record<string, unknown>): Promise<T> {
  const source = await readFile(new URL(`../../${path}`, import.meta.url), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  const loaded = { exports: {} };
  runInNewContext(output, { module: loaded, exports: loaded.exports, Date, Buffer, URL, Headers, Response,
    AbortSignal, fetch, process: { env: { NODE_ENV: "production", NEXT_PUBLIC_SITE_URL: "https://signup.example.test", VERCEL: "1" } },
    require: (name: string) => {
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      if (name === "server-only") return {};
      if (name.startsWith("@/") || name.startsWith("next/")) throw new Error(`Missing test boundary: ${name}`);
      return requirePackage(name);
    },
  }, { filename: path });
  return loaded.exports as T;
}
