import Link from "next/link";
import { Activity, Briefcase, Building2, MessagesSquare, UserPlus, Users } from "lucide-react";
import { adminDb, listAllUsers } from "@/lib/admin/db";
import { modules, type ModuleId } from "@/lib/modules";
import { universityById } from "@/lib/universities";
import { Empty, PageTitle, Stat, fmt, userLabel } from "@/components/admin/ui";

export const metadata = { title: "Umumiy" };

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const isoAgo = (ms: number) => new Date(Date.now() - ms).toISOString();

export default async function AdminHome() {
  const db = adminDb();
  const weekAgo = isoAgo(WEEK_MS);

  const [users, projects, unanswered, activity, profiles] = await Promise.all([
    listAllUsers(),
    db.from("projects").select("id", { count: "exact", head: true }),
    db
      .from("support_messages")
      .select("id, user_id, kind, subject, message, created_at")
      .is("reply", null)
      .order("created_at", { ascending: false })
      .limit(50),
    db.from("activity_log").select("module").gte("created_at", weekAgo).limit(10000),
    db.from("profiles").select("status, university_id, university_name").limit(100000),
  ]);

  const byId = new Map(users.map((u) => [u.id, u]));
  const newUsers = users.filter((u) => u.created_at >= weekAgo).length;
  const recentUsers = [...users].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6);

  const moduleCounts = new Map<string, number>();
  for (const row of activity.data ?? []) moduleCounts.set(row.module, (moduleCounts.get(row.module) ?? 0) + 1);
  const topModules = [...moduleCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxCount = topModules[0]?.[1] ?? 1;
  // Foydalanuvchilar tarkibi: talaba / abituriyent / shaxsiy va eng ko'p foydalanuvchiga ega oliygohlar
  const statusCounts = { talaba: 0, abituriyent: 0, shaxsiy: 0 } as Record<string, number>;
  const uniCounts = new Map<string, { name: string; count: number }>();
  for (const p of profiles.data ?? []) {
    statusCounts[p.status] = (statusCounts[p.status] ?? 0) + 1;
    if (p.status !== "talaba" || !p.university_name) continue;
    const key = p.university_id ?? p.university_name.trim().toLowerCase();
    const cur = uniCounts.get(key) ?? { name: universityById(p.university_id)?.name ?? p.university_name, count: 0 };
    cur.count++;
    uniCounts.set(key, cur);
  }
  const topUnis = [...uniCounts.values()].sort((a, b) => b.count - a.count).slice(0, 15);
  const maxUni = topUnis[0]?.count ?? 1;
  const filled = profiles.data?.length ?? 0;

  const schemaMissing = activity.error?.code === "PGRST205" || activity.error?.code === "42P01";

  return (
    <>
      <PageTitle title="Umumiy ko'rinish" desc="Saytdagi asosiy ko'rsatkichlar" />

      {schemaMissing && (
        <p className="mb-6 rounded-xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-200">
          <code>activity_log</code> jadvali topilmadi. Supabase SQL Editor&apos;da <code>supabase/schema.sql</code> ni qayta
          ishga tushiring.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Foydalanuvchilar" value={users.length} icon={Users} />
        <Stat label="Yangi (7 kun)" value={newUsers} icon={UserPlus} />
        <Stat label="Javobsiz xabarlar" value={unanswered.data?.length ?? 0} icon={MessagesSquare} />
        <Stat label="Biznes loyihalar" value={projects.count ?? 0} icon={Briefcase} />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Yangi foydalanuvchilar</h2>
            <Link href="/admin/users" className="text-sm text-brand-400 hover:text-brand-300">Hammasi →</Link>
          </div>
          {recentUsers.length ? (
            <ul className="glass divide-y divide-white/5 rounded-2xl">
              {recentUsers.map((u) => {
                const l = userLabel(u);
                return (
                  <li key={u.id}>
                    <Link href={`/admin/users/${u.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/[0.03]">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{l.name}</span>
                        <span className="block truncate text-xs text-zinc-500">{l.sub}</span>
                      </span>
                      <span className="shrink-0 text-xs text-zinc-500">{fmt(u.created_at)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty>Hali foydalanuvchi yo&apos;q.</Empty>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Javob kutayotgan xabarlar</h2>
            <Link href="/admin/messages" className="text-sm text-brand-400 hover:text-brand-300">Hammasi →</Link>
          </div>
          {unanswered.data?.length ? (
            <ul className="glass divide-y divide-white/5 rounded-2xl">
              {unanswered.data.slice(0, 6).map((m) => (
                <li key={m.id} className="px-4 py-3">
                  <p className="flex justify-between gap-3 text-xs text-zinc-500">
                    <span className="truncate">{userLabel(byId.get(m.user_id)).name}</span>
                    <span className="shrink-0">{fmt(m.created_at)}</span>
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm">{m.subject ? `${m.subject}: ` : ""}{m.message}</p>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Javobsiz xabar yo&apos;q.</Empty>
          )}
        </section>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 font-semibold">
          <Activity size={17} className="text-brand-400" /> Eng ko&apos;p ishlatilgan vositalar (7 kun)
        </h2>
        {topModules.length ? (
          <div className="glass space-y-3 rounded-2xl p-5">
            {topModules.map(([id, count]) => (
              <div key={id} className="flex items-center gap-3 text-sm">
                <span className="w-44 shrink-0 truncate text-zinc-300">{modules[id as ModuleId]?.title ?? id}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                  <span className="block h-full rounded-full bg-brand-500" style={{ width: `${(count / maxCount) * 100}%` }} />
                </span>
                <span className="w-10 shrink-0 text-right tabular-nums text-zinc-400">{count}</span>
              </div>
            ))}
          </div>
        ) : (
          <Empty>Oxirgi 7 kunda faoliyat qayd etilmagan.</Empty>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 font-semibold">
          <Building2 size={17} className="text-brand-400" /> Foydalanuvchilar tarkibi
        </h2>
        {filled ? (
          <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
            <div className="glass space-y-3 rounded-2xl p-5 text-sm">
              {[
                ["talaba", "Talabalar"],
                ["abituriyent", "Abituriyentlar"],
                ["shaxsiy", "Shaxsiy foydalanish"],
              ].map(([k, label]) => (
                <p key={k} className="flex justify-between">
                  <span className="text-zinc-400">{label}</span>
                  <span className="tabular-nums">
                    {statusCounts[k]} <span className="text-zinc-500">({Math.round((statusCounts[k] / filled) * 100)}%)</span>
                  </span>
                </p>
              ))}
              <p className="border-t border-white/5 pt-3 text-xs text-zinc-500">
                {filled} / {users.length} foydalanuvchi ma&apos;lumotini to&apos;ldirgan
              </p>
            </div>
            <div className="glass space-y-3 rounded-2xl p-5">
              <p className="text-sm text-zinc-400">Eng ko&apos;p talabasi bor oliygohlar</p>
              {topUnis.length ? (
                topUnis.map((u) => (
                  <div key={u.name} className="flex items-center gap-3 text-sm">
                    <span className="w-64 shrink-0 truncate text-zinc-300" title={u.name}>{u.name}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                      <span className="block h-full rounded-full bg-brand-500" style={{ width: `${(u.count / maxUni) * 100}%` }} />
                    </span>
                    <span className="w-10 shrink-0 text-right tabular-nums text-zinc-400">{u.count}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-500">Hali talaba yo&apos;q.</p>
              )}
            </div>
          </div>
        ) : (
          <Empty>
            {profiles.error ? "profiles jadvali topilmadi — supabase/schema.sql ni qayta ishga tushiring." : "Hali hech kim ro'yxatdan o'tish ma'lumotlarini to'ldirmagan."}
          </Empty>
        )}
      </section>
    </>
  );
}
