// Dev helper: lets the admin account see /hoc-vien with real data by linking ONE test student to it.
//   pnpm exec tsx scripts/dev-student-fixture.ts setup [trial|formal] [studentCode]
//   pnpm exec tsx scripts/dev-student-fixture.ts cleanup [studentCode]
// Default student is R2610003 (a leftover test row). It never touches other students and never
// changes roles. Everything it creates is removed by `cleanup`.
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import postgres from "postgres";

const TAG = "[TEST] ";

async function main() {
  const [mode, a, b] = process.argv.slice(2);
  const kind = mode === "setup" && (a === "trial" || a === "formal") ? a : "trial";
  const code = (mode === "setup" ? (a === "trial" || a === "formal" ? b : a) : a) ?? "R2610003";
  if (mode !== "setup" && mode !== "cleanup") throw new Error("Usage: setup [trial|formal] [code] | cleanup [code]");
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });
  try {
    const [student] = await sql`select id, full_name from students where code = ${code}`;
    if (!student) throw new Error(`Student ${code} not found`);
    await sql.begin(async (tx) => {
      const [enrollment] = await tx`select id from enrollments where student_id = ${student.id}`;
      if (mode === "cleanup") {
        if (enrollment) {
          await tx`delete from study_plan_lessons where enrollment_id = ${enrollment.id}`;
          await tx`delete from enrollments where id = ${enrollment.id}`;
        }
        await tx`delete from learning_resources where title like ${TAG + "%"}`;
        await tx`delete from licenses where student_id = ${student.id}`;
        await tx`update students set user_id = null where id = ${student.id}`;
        console.log(`Cleaned ${code}`);
        return;
      }
      const [admin] = await tx`select u.id, u.email from users u join user_roles r on r.user_id = u.id where r.role = 'admin' order by u.created_at limit 1`;
      if (!admin) throw new Error("No admin user");
      if (enrollment) throw new Error(`${code} already has an enrollment; run cleanup first`);
      await tx`update students set user_id = ${admin.id} where id = ${student.id}`;
      const [created] = await tx`insert into enrollments (student_id, kind, status, start_date, trial_started_at, formal_started_at)
        values (${student.id}, ${kind}, 'active', ${kind === "formal" ? new Date().toISOString().slice(0, 10) : null}, now(), ${kind === "formal" ? new Date() : null}) returning id`;
      await tx`insert into study_plan_lessons (enrollment_id, lesson_id, phase, lesson_numbers, title, base_days, sort_order, trial_order)
        select ${created.id}, id, phase, lesson_numbers, title, base_days, sort_order, trial_order from lessons where active`;
      const embed = "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ";
      const [trialLesson] = await tx`select id from lessons where trial_order = 1`;
      await tx`insert into learning_resources (title, lesson_id, external_url, audience, mode, sort_order) values
        (${TAG + "Video giới thiệu"}, null, ${embed}, 'all', 'view', 1),
        (${TAG + "Video bài học thử 1"}, ${trialLesson.id}, ${embed}, 'trial', 'view', 2)`;
      await tx`insert into licenses (student_id, email, product, expires_at) values (${student.id}, ${admin.email}, 'suite', now() + interval '60 days')`;
      console.log(`Linked ${code} to admin ${admin.email} with a ${kind} enrollment. Open /hoc-vien.`);
    });
  } finally {
    await sql.end();
  }
}
main().catch((error) => { console.error(error.message); process.exit(1); });
