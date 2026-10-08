// Seeds reference data only: the R source and starter message templates.
// Fake people for local testing live in src/mocks, never here.
// Run: pnpm db:seed
import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { db } = await import("@/server/db");
  const { adSources, messageTemplates } = await import("@/server/db/schema");

  await db
    .insert(adSources)
    .values({ code: "R", name: "RVPY tự tìm" })
    .onConflictDoNothing({ target: adSources.code });

  const existing = await db.$count(messageTemplates);
  if (existing === 0) {
    await db.insert(messageTemplates).values([
      {
        title: "Mời vào 2 nhóm Zalo",
        forStatus: "zalo_added",
        sortOrder: 10,
        body: "Chào {{ten}}, mời bạn tham gia 2 nhóm Zalo cộng đồng RVPY:\n{{zalo_nhom_1}}\n{{zalo_nhom_2}}",
      },
    ]);
  }
  console.log("Seed done");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
