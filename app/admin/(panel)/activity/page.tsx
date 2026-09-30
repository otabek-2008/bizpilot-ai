import Link from "next/link";
import { adminDb, listAllUsers } from "@/lib/admin/db";
import { modules, type ModuleId } from "@/lib/modules";
import { Empty, PageTitle, fmt, userLabel } from "@/components/admin/ui";

export const metadata = { title: "Faoliyat" };

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m = "" } = await searchParams;
  const filter = m in modules ? (m as ModuleId) : "";

  let query = adminDb().from("activity_log").select("id, user_id, module, title, created_at").order("created_at", { ascending: false }).limit(500);
  if (filter) query = query.eq("module", filter);

  const [{ data, error }, users] = await Promise.all([query, listAllUsers()]);
  const byId = new Map(users.map((u) => [u.id, u]));
  const tools = Object.values(modules).filter((x) => !["dashboard", "profile", "contact", "chat"].includes(x.id));

  const chip = (active: boolean) =>
    `shrink-0 rounded-xl px-3 py-1.5 text-sm transition ${active ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"}`;

  return (
    <>
      <PageTitle title="Faoliyat" desc="Foydalanuvchilar qaysi vositalardan qachon foydalangani (oxirgi 500 ta)" />

      <div className="mb-5 flex gap-1 overflow-x-auto pb-1">
        <Link href="/admin/activity" className={chip(!filter)}>Hammasi</Link>
        {tools.map((t) => (
          <Link key={t.id} href={`/admin/activity?m=${t.id}`} className={chip(filter === t.id)}>
            {t.short}
          </Link>
        ))}
      </div>

      {error && (
        <p className="mb-4 rounded-xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-200">
          Faoliyatni yuklab bo&apos;lmadi ({error.message}). Supabase&apos;da <code>supabase/schema.sql</code> ni qayta ishga tushiring.
        </p>
      )}

      {data?.length ? (
        <div className="glass overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-zinc-500">
              <tr className="border-b border-white/5">
                <th className="px-4 py-3 font-medium">Vaqt</th>
                <th className="px-4 py-3 font-medium">Foydalanuvchi</th>
                <th className="px-4 py-3 font-medium">Vosita</th>
                <th className="px-4 py-3 font-medium">Nima qildi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.map((a) => (
                <tr key={a.id} className="hover:bg-white/[0.03]">
                  <td className="whitespace-nowrap px-4 py-2.5 text-zinc-400">{fmt(a.created_at)}</td>
                  <td className="px-4 py-2.5">
                    <Link href={`/admin/users/${a.user_id}`} className="hover:text-brand-300">{userLabel(byId.get(a.user_id)).name}</Link>
                  </td>
                  <td className="px-4 py-2.5 text-brand-300">{modules[a.module as ModuleId]?.short ?? a.module}</td>
                  <td className="px-4 py-2.5 text-zinc-300">{a.title}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !error && <Empty>Faoliyat hali qayd etilmagan.</Empty>
      )}
    </>
  );
}
