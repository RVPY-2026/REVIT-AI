import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema/index.ts",
  out: "./src/server/db/migrations",
  casing: "snake_case",
  dbCredentials: {
    // Migrations use the direct/session connection, not the transaction pooler.
    url: process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL!,
  },
  entities: { roles: { provider: "supabase" } },
  strict: true,
  verbose: true,
});
