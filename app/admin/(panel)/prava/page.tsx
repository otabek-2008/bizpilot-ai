import Link from "next/link";
import { CircleCheck, CircleOff, FileUp, ImageIcon, Layers, ListChecks, Pencil, Plus, Trash2, Trophy } from "lucide-react";
import { adminDb } from "@/lib/admin/db";
import { deleteQuestionAction, toggleQuestionAction } from "@/app/admin/actions";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { Empty, PageTitle, Stat } from "@/components/admin/ui";

export const metadata = { title: "Prava savollari" };

const PER_PAGE = 50;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const isoAgo = (ms: number) => new Date(Date.now() - ms).toISOString();

type Row = {
  id: number;
  ticket: number | null;
  position: number | null;
  topic: string | null;
  question: string;
  options: string[];
  correct: number;
  image: string | null;
  active: boolean;
};

/** Barcha savollarning bilet raqamlari (statistika va filtr uchun; Data API 1000 qatordan sahifalaydi). */
async function allTickets(): Promise<{ ticket: number | null; active: boolean }[]> {
  const out: { ticket: number | null; active: boolean }[] = [];
  for (let from = 0; from < 50_000; from += 1000) {
    const { data, error } = await adminDb().from("prava_questions").select("ticket, active").order("id").range(from, from + 999);
    if (error) throw error;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

export default async function PravaAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ bilet?: string; q?: string; page?: string; holat?: string }>;
}) {
  const sp = await searchParams;
  const ticket = sp.bilet === "none" ? "none" : Number(sp.bilet) || null;
  const search = (sp.q ?? "").trim().slice(0, 100);
  const page = Math.max(1, Number(sp.page) || 1);
  const status = sp.holat === "off" ? "off" : null;

  const db = adminDb();
  let query = db
    .from("prava_questions")
    .select("id, ticket, position, topic, question, options, correct, image, active", { count: "exact" })
    .order("ticket", { ascending: true, nullsFirst: false })
    .order("position", { ascending: true, nullsFirst: false })
    .order("id")
    .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
  if (ticket === "none") query = query.is("ticket", null);
  else if (ticket) query = query.eq("ticket", ticket);
  if (search) query = query.ilike("question", `%${search.replace(/[%_\\]/g, (c) => `\\${c}`)}%`);
  if (status) query = query.eq("active", false);

  const weekAgo = isoAgo(WEEK_MS);
  const [list, tickets, results] = await Promise.all([
    query,
    allTickets().catch(() => null),
    db.from("prava_results").select("mode, passed").gte("created_at", weekAgo).limit(10000),
  ]);

  const schemaMissing = ["PGRST205", "42P01"].includes(list.error?.code ?? "");
  const rows = (list.data ?? []) as Row[];
  const total = list.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  const ticketNums = [...new Set((tickets ?? []).map((t) => t.ticket).filter((t): t is number => t != null))].sort((a, b) => a - b);
  const noTicket = (tickets ?? []).filter((t) => t.ticket == null).length;
  const inactive = (tickets ?? []).filter((t) => !t.active).length;
  const exams = (results.data ?? []).filter((r) => r.mode === "exam");
  const passRate = exams.length ? Math.round((exams.filter((r) => r.passed).length / exams.length) * 100) : null;

  const href = (p: Partial<Record<"bilet" | "q" | "page" | "holat", string | number | null>>) => {
    const params = new URLSearchParams();
    const merged = { bilet: sp.bilet, q: search || undefined, holat: status ?? undefined, ...p };
    for (const [k, v] of Object.entries(merged)) if (v != null && v !== "") params.set(k, String(v));
    const qs = params.toString();
    return `/admin/prava${qs ? `?${qs}` : ""}`;
  };
  const pill = (active: boolean) =>
    `shrink-0 rounded-lg px-2.5 py-1 text-sm tabular-nums transition ${active ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"}`;

  return (
    <>
      <PageTitle title="Prava savollari" desc="Biletlar va savollar bazasi. Faol savollar foydalanuvchilarga darhol ko'rinadi.">
        <div className="flex gap-2">
          <Link href="/admin/prava/import" className="btn-ghost !px-4 !py-2 text-sm">
            <FileUp size={16} /> Import
          </Link>
          <Link href="/admin/prava/new" className="btn-primary !px-4 !py-2 text-sm">
            <Plus size={16} /> Yangi savol
          </Link>
        </div>
      </PageTitle>

      {schemaMissing && (
        <p className="mb-6 rounded-xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-200">
          <code>prava_questions</code> jadvali topilmadi. Supabase SQL Editor&apos;da <code>supabase/schema.sql</code> ni qayta
          ishga tushiring.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Savollar" value={tickets?.length ?? total} icon={ListChecks} hint={inactive ? `${inactive} tasi o'chirilgan` : undefined} />
        <Stat label="Biletlar" value={ticketNums.length} icon={Layers} hint={noTicket ? `${noTicket} ta savol biletsiz` : undefined} />
        <Stat label="Testlar (7 kun)" value={results.data?.length ?? 0} icon={CircleCheck} />
        <Stat label="Imtihondan o'tish (7 kun)" value={passRate == null ? "—" : `${passRate}%`} icon={Trophy} hint={exams.length ? `${exams.length} ta imtihon` : undefined} />
      </div>

      {/* Filtrlar */}
      <div className="mt-8 space-y-3">
        <form action="/admin/prava" className="flex gap-2">
          {sp.bilet && <input type="hidden" name="bilet" value={sp.bilet} />}
          <input name="q" defaultValue={search} placeholder="Savol matni bo'yicha qidirish" aria-label="Qidirish" className="field !py-2 text-sm" />
          <button className="btn-ghost shrink-0 !px-4 !py-2 text-sm">Qidirish</button>
        </form>
        <div className="flex gap-1 overflow-x-auto pb-1">
          <Link href={href({ bilet: null, page: null, holat: null })} className={pill(!sp.bilet && !status)}>Hammasi</Link>
          {inactive > 0 && <Link href={href({ holat: status ? null : "off", page: null })} className={pill(!!status)}>O&apos;chirilganlar</Link>}
          {noTicket > 0 && <Link href={href({ bilet: "none", page: null })} className={pill(ticket === "none")}>Biletsiz</Link>}
          {ticketNums.map((t) => (
            <Link key={t} href={href({ bilet: t, page: null })} className={pill(ticket === t)}>
              {t}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-4">
        {rows.length ? (
          <div className="glass overflow-hidden rounded-2xl">
            <ul className="divide-y divide-white/5">
              {rows.map((r) => (
                <li key={r.id} className={`flex items-start gap-4 p-4 ${r.active ? "" : "opacity-50"}`}>
                  <span className="w-14 shrink-0 text-xs text-zinc-500 tabular-nums">
                    {r.ticket != null ? `${r.ticket}-bilet` : "—"}
                    {r.position != null && <span className="block">#{r.position}</span>}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/prava/${r.id}`} className="line-clamp-2 text-sm hover:text-brand-300">
                      {r.question}
                    </Link>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                      <span className="text-emerald-300/80">✓ {r.options[r.correct]}</span>
                      <span>{r.options.length} variant</span>
                      {r.image && (
                        <span className="flex items-center gap-1">
                          <ImageIcon size={12} /> rasm
                        </span>
                      )}
                      {r.topic && <span>{r.topic}</span>}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <form action={toggleQuestionAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="active" value={r.active ? "0" : "1"} />
                      <button className="text-zinc-400 transition hover:text-white" title={r.active ? "O'chirish (yashirish)" : "Yoqish"}>
                        {r.active ? <CircleCheck size={17} className="text-emerald-300" /> : <CircleOff size={17} />}
                      </button>
                    </form>
                    <Link href={`/admin/prava/${r.id}`} className="text-zinc-400 transition hover:text-white" title="Tahrirlash">
                      <Pencil size={16} />
                    </Link>
                    <form action={deleteQuestionAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <ConfirmButton message="Bu savolni butunlay o'chirasizmi?">
                        <Trash2 size={16} />
                      </ConfirmButton>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          !schemaMissing && (
            <Empty>
              {search || sp.bilet || status ? (
                "Hech narsa topilmadi."
              ) : (
                <>
                  Hali savol yo&apos;q. <Link href="/admin/prava/new" className="text-brand-400">Bittalab qo&apos;shing</Link> yoki{" "}
                  <Link href="/admin/prava/import" className="text-brand-400">CSV/JSON fayldan import qiling</Link>.
                </>
              )}
            </Empty>
          )
        )}
      </div>

      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-center gap-1 text-sm">
          {page > 1 && <Link href={href({ page: page - 1 })} className={pill(false)}>← Oldingi</Link>}
          <span className="px-3 text-zinc-500 tabular-nums">
            {page} / {pages} · {total} ta
          </span>
          {page < pages && <Link href={href({ page: page + 1 })} className={pill(false)}>Keyingi →</Link>}
        </nav>
      )}
    </>
  );
}
