import Link from "next/link";
import { Trash2 } from "lucide-react";
import { adminDb, listAllUsers } from "@/lib/admin/db";
import { deleteMessageAction } from "@/app/admin/actions";
import ConfirmButton from "@/components/admin/ConfirmButton";
import ReplyForm from "@/components/admin/ReplyForm";
import { Empty, PageTitle, fmt, userLabel } from "@/components/admin/ui";

export const metadata = { title: "Xabarlar" };

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  const showAll = (await searchParams).all === "1";

  let query = adminDb()
    .from("support_messages")
    .select("id, user_id, kind, name, contact, subject, message, reply, replied_at, created_at")
    .order("created_at", { ascending: false })
    .limit(300);
  if (!showAll) query = query.is("reply", null);

  const [{ data: messages, error }, users] = await Promise.all([query, listAllUsers()]);
  const byId = new Map(users.map((u) => [u.id, u]));

  const tab = (active: boolean) =>
    `rounded-xl px-3 py-1.5 text-sm transition ${active ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"}`;

  return (
    <>
      <PageTitle title="Xabarlar" desc="Chat va aloqa formasidan kelgan savollar. Javobingiz foydalanuvchining chatida ko'rinadi.">
        <div className="flex gap-1">
          <Link href="/admin/messages" className={tab(!showAll)}>Javobsiz</Link>
          <Link href="/admin/messages?all=1" className={tab(showAll)}>Hammasi</Link>
        </div>
      </PageTitle>

      {error && <p className="mb-4 text-sm text-rose-300">Xabarlarni yuklab bo&apos;lmadi: {error.message}</p>}

      {messages?.length ? (
        <div className="space-y-4">
          {messages.map((m) => {
            const l = userLabel(byId.get(m.user_id));
            return (
              <article key={m.id} className="glass rounded-2xl p-5">
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/admin/users/${m.user_id}`} className="font-medium hover:text-brand-300">{l.name}</Link>
                    <p className="text-xs text-zinc-500">
                      {m.kind === "chat" ? "Chat" : "Aloqa formasi"} · {fmt(m.created_at)}
                      {m.contact && ` · ${m.contact}`}
                    </p>
                  </div>
                  <form action={deleteMessageAction}>
                    <input type="hidden" name="id" value={m.id} />
                    <ConfirmButton message="Bu xabarni o'chirasizmi?">
                      <Trash2 size={15} /> O&apos;chirish
                    </ConfirmButton>
                  </form>
                </header>
                {m.subject && <p className="mt-3 font-medium">{m.subject}</p>}
                <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-200">{m.message}</p>
                <ReplyForm id={m.id} reply={m.reply ?? ""} repliedAt={m.replied_at ? fmt(m.replied_at) : ""} />
              </article>
            );
          })}
        </div>
      ) : (
        <Empty>{showAll ? "Hali xabar yo'q." : "Javobsiz xabar yo'q. 🎉"}</Empty>
      )}
    </>
  );
}
