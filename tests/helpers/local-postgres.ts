import { execFile, spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

/** Explicit integration runner only: creates its own cluster, never reads DB URLs. */
export async function withLocalPostgres<T>(work: (url: string) => Promise<T>) {
  const directory = await mkdtemp(path.join(tmpdir(), "rvpy-source-locks-"));
  const data = path.join(directory, "cluster");
  const executable = (name: string) => path.join(process.env.RVPY_POSTGRES_BIN ?? "C:/Program Files/PostgreSQL/16/bin", `${name}${process.platform === "win32" ? ".exe" : ""}`);
  const port = await new Promise<number>((resolve, reject) => {
    const server = createServer(); server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address(); if (!address || typeof address === "string") return reject(new Error("Missing local port"));
      server.close((error) => error ? reject(error) : resolve(address.port));
    });
  });
  let started = false;
  try {
    await run(executable("initdb"), ["-D", data, "-U", "rvpy_fixture", "--auth=trust", "--no-locale", "-E", "UTF8"], { windowsHide: true });
    await new Promise<void>((resolve, reject) => {
      // On Windows the server can inherit pg_ctl's pipes; wait for pg_ctl's exit,
      // with no inherited stdio, rather than waiting for those pipes to close.
      const child = spawn(executable("pg_ctl"), ["-D", data, "-l", path.join(directory, "server.log"), "-o", `-h 127.0.0.1 -p ${port} -F`, "-w", "start"], { windowsHide: true, stdio: "ignore" });
      child.once("error", reject); child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`Fixture PostgreSQL start failed: ${code}`)));
    });
    started = true;
    return await work(`postgres://rvpy_fixture@127.0.0.1:${port}/postgres`);
  } finally {
    if (started) await run(executable("pg_ctl"), ["-D", data, "-m", "immediate", "-w", "stop"], { windowsHide: true });
    // Only remove this invocation's mkdtemp directory after verifying its boundary.
    if (path.dirname(directory) !== path.resolve(tmpdir()) || !path.basename(directory).startsWith("rvpy-source-locks-")) throw new Error("Unexpected fixture directory");
    await rm(directory, { recursive: true, force: true });
  }
}
