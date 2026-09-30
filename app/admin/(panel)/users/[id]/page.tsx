import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { adminDb } from "@/lib/admin/db";
import { modules, type ModuleId } from "@/lib/modules";
import { toProfile } from "@/lib/profile";
import { deleteProjectAction, deleteUserAction } from "@/app/admin/actions";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { Empty, fmt, userLabel } from "@/components/admin/ui";

export const metadata = { title: "Foydalanuvchi" };

type ProjectDoc = { project_id: string; business_plan: object; marketing: object; finance: object; updated_at: string };

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const db = adminDb();
  const { data: userData } = await db.auth.admin.getUserById(id);
  const user = userData?.user;
  if (!user) notFound();

  const [projects, docs, messages, activity] = await Promise.all([
    db.from("projects").select("id, title, description, created_at").eq("user_id", id).order("created_at", { ascending: false }),
    db.from("project_documents").select("project_id, business_plan, marketing, finance, updated_at").eq("user_id", id),
    db.from("support_messages").select("id, kind, subject, message, reply, created_at").eq("user_id", id).order("created_at", { ascending: false }),
    db.from("activity_log").select("id, module, title, created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(200),
  ]);

  const p = toProfile(user);
  const l = userLabel(user);
  const docsById = new Map(((docs.data ?? []) as ProjectDoc[]).map((d) => [d.project_id, d]));
  const tgUsername = user.user_metadata?.telegram_username as string | undefined;

  const info: [string, string][] = [
    ["ID", user.id],
    ["Email", p.email || "—"],
    ["Telegram", user.app_metadata?.telegram_id ? `${tgUsername ? `@${tgUsername} · ` : ""}ID ${user.app_metadata.telegram_id}` : "—"],
    ["Kirish usuli", user.app_metadata?.telegram_id ? "Telegram" : String(user.app_metadata?.provider ?? "—")],
    ["O'qish joyi", [p.university, p.faculty, p.course].filter(Boolean).join(", ") || "—"],
    ["Bio", p.bio || "—"],
    ["Ro'yxatdan o'tgan", fmt(user.created_at)],
    ["Oxirgi kirish", fmt(user.last_sign_in_at)],
    ["Email tasdiqlangan", user.email_confirmed_at ? fmt(user.email_confirmed_at) : "yo'q"],
  ];

  return (
    <>
      <Link href="/admin/users" className="mb-5 inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft size={16} /> Foydalanuvchilar
      </Link>

      <div className="glass flex flex-col gap-5 rounded-3xl p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {p.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.avatar} alt="" className="size-16 rounded-2xl object-cover" />
          ) : (
            <span className="accent-gradient grid size-16 place-items-center rounded-2xl text-xl font-semibold">{p.initials}</span>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold">{l.name}</h1>
            <p className="truncate text-sm text-zinc-400">{l.sub}</p>
          </div>
        </div>
        <form action={deleteUserAction}>
          <input type="hidden" name="id" value={user.id} />
          <ConfirmButton
            message={`${l.name} hisobini va uning barcha ma'lumotlarini butunlay o'chirasizmi? Bu amalni qaytarib bo'lmaydi.`}
            className="btn-ghost !border-rose-400/30 !text-rose-300 hover:!bg-rose-400/10"
          >
            <Trash2 size={16} /> Hisobni o&apos;chirish
          </ConfirmButton>
        </form>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 font-semibold">Ma&apos;lumotlar</h2>
        <dl className="glass grid gap-x-6 rounded-2xl p-5 text-sm sm:grid-cols-[180px_1fr]">
          {info.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="pt-2 text-zinc-500 sm:py-2">{k}</dt>
              <dd className="break-all pb-2 sm:py-2">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-semibold">Biznes loyihalar ({projects.data?.length ?? 0})</h2>
        {projects.data?.length ? (
          <div className="space-y-3">
            {projects.data.map((pr) => {
              const doc = docsById.get(pr.id);
              return (
                <details key={pr.id} className="glass rounded-2xl p-4">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                    <span>
                      <span className="block font-medium">{pr.title}</span>
                      <span className="block text-xs text-zinc-500">
                        {fmt(pr.created_at)} · {doc ? "hujjatlar yaratilgan" : "hujjat yo'q"}
                      </span>
                    </span>
                    <form action={deleteProjectAction}>
                      <input type="hidden" name="id" value={pr.id} />
                      <ConfirmButton message={`"${pr.title}" loyihasini o'chirasizmi?`}>
                        <Trash2 size={15} />
                      </ConfirmButton>
                    </form>
                  </summary>
                  {pr.description && <p className="mt-3 text-sm text-zinc-300">{pr.description}</p>}
                  {doc && (
                    <pre className="mt-3 max-h-96 overflow-auto rounded-xl bg-black/40 p-3 text-xs text-zinc-300">
                      {JSON.stringify({ business_plan: doc.business_plan, marketing: doc.marketing, finance: doc.finance }, null, 2)}
                    </pre>
                  )}
                </details>
              );
            })}
          </div>
        ) : (
          <Empty>Loyiha yo&apos;q.</Empty>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-semibold">Xabarlar ({messages.data?.length ?? 0})</h2>
        {messages.data?.length ? (
          <ul className="glass divide-y divide-white/5 rounded-2xl">
            {messages.data.map((m) => (
              <li key={m.id} className="px-4 py-3 text-sm">
                <p className="text-xs text-zinc-500">
                  {m.kind === "chat" ? "Chat" : "Aloqa formasi"} · {fmt(m.created_at)}
                  {!m.reply && <span className="ml-2 text-amber-300">javobsiz</span>}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{m.subject ? `${m.subject}: ` : ""}{m.message}</p>
                {m.reply && <p className="mt-2 whitespace-pre-wrap border-l-2 border-brand-500 pl-3 text-zinc-300">{m.reply}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <Empty>Xabar yo&apos;q.</Empty>
        )}
        {!!messages.data?.length && (
          <Link href="/admin/messages" className="mt-2 inline-block text-sm text-brand-400 hover:text-brand-300">Javob yozish →</Link>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-semibold">Faoliyat ({activity.data?.length ?? 0})</h2>
        {activity.data?.length ? (
          <ul className="glass divide-y divide-white/5 rounded-2xl">
            {activity.data.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="text-brand-300">{modules[a.module as ModuleId]?.title ?? a.module}</span>
                  <span className="text-zinc-400"> — {a.title}</span>
                </span>
                <span className="shrink-0 text-xs text-zinc-500">{fmt(a.created_at)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>Faoliyat qayd etilmagan.</Empty>
        )}
      </section>
    </>
  );
}
