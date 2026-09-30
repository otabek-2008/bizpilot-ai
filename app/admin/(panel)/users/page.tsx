import Link from "next/link";
import { Search } from "lucide-react";
import { listAllUsers } from "@/lib/admin/db";
import { Empty, PageTitle, fmt, userLabel } from "@/components/admin/ui";

export const metadata = { title: "Foydalanuvchilar" };

const PROVIDER: Record<string, string> = { email: "Email", google: "Google" };

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const query = q.trim().toLowerCase();

  const users = (await listAllUsers())
    .map((u) => ({ u, l: userLabel(u) }))
    .filter(({ u, l }) => !query || `${l.name} ${l.sub} ${u.email ?? ""} ${u.id}`.toLowerCase().includes(query))
    .sort((a, b) => b.u.created_at.localeCompare(a.u.created_at));

  return (
    <>
      <PageTitle title="Foydalanuvchilar" desc={`Jami: ${users.length}`}>
        <form className="relative w-full sm:w-72">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input name="q" defaultValue={q} placeholder="Ism, email yoki Telegram" aria-label="Qidirish" className="field !py-2.5 !pl-10 text-sm" />
        </form>
      </PageTitle>

      {users.length ? (
        <div className="glass overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-zinc-500">
              <tr className="border-b border-white/5">
                <th className="px-4 py-3 font-medium">Foydalanuvchi</th>
                <th className="px-4 py-3 font-medium">Kirish usuli</th>
                <th className="px-4 py-3 font-medium">Ro&apos;yxatdan o&apos;tgan</th>
                <th className="px-4 py-3 font-medium">Oxirgi kirish</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map(({ u, l }) => {
                const tg = !!u.app_metadata?.telegram_id;
                const provider = tg ? "Telegram" : (PROVIDER[u.app_metadata?.provider as string] ?? u.app_metadata?.provider ?? "—");
                return (
                  <tr key={u.id} className="hover:bg-white/[0.03]">
                    <td className="px-4 py-3">
                      <Link href={`/admin/users/${u.id}`} className="block">
                        <span className="block font-medium hover:text-brand-300">{l.name}</span>
                        <span className="block text-xs text-zinc-500">{l.sub}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      {provider}
                      {!u.email_confirmed_at && !tg && <span className="ml-2 text-xs text-amber-300">tasdiqlanmagan</span>}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{fmt(u.created_at)}</td>
                    <td className="px-4 py-3 text-zinc-400">{fmt(u.last_sign_in_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>{query ? "Hech narsa topilmadi." : "Hali foydalanuvchi yo'q."}</Empty>
      )}
    </>
  );
}
