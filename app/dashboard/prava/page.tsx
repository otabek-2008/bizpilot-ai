"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpenCheck, CarFront, ClipboardList, Layers, ListChecks, RotateCcw, Timer, Trophy } from "lucide-react";
import ModuleHeader, { PageWrap } from "@/components/ui/ModuleHeader";
import { FormError } from "@/components/AuthShell";
import { Spinner } from "@/components/LoadingScreen";
import { useAuth } from "@/components/AuthProvider";
import TestRunner, { type TestSession } from "@/components/prava/TestRunner";
import { modules } from "@/lib/modules";
import { latinToCyrillic } from "@/lib/translit";
import { EXAM_FORMATS, byPosition, examFormat, maxMistakes, shuffle, type ExamSize, type PravaMode } from "@/lib/prava";
import { fetchIndex, fetchMistakeIds, fetchQuestions, fetchResults, type PravaResult, type QuestionIndex } from "@/lib/prava-db";

type Script = "latin" | "cyrillic";
const SCRIPT_KEY = "campusai:prava:script";

type Spec = { mode: PravaMode; ticket?: number; topic?: string; size?: ExamSize };

export default function PravaPage() {
  const { user } = useAuth();
  const [index, setIndex] = useState<QuestionIndex[] | null>(null);
  const [mistakes, setMistakes] = useState<number[]>([]);
  const [results, setResults] = useState<PravaResult[]>([]);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState<string | null>(null);
  const [session, setSession] = useState<(TestSession & { spec: Spec }) | null>(null);
  const [script, setScript] = useState<Script>(() => {
    try {
      return localStorage.getItem(SCRIPT_KEY) === "cyrillic" ? "cyrillic" : "latin";
    } catch {
      return "latin";
    }
  });

  const tr = useCallback((s: string) => (script === "cyrillic" ? latinToCyrillic(s) : s), [script]);

  const load = useCallback(async () => {
    try {
      const [idx, mis, res] = await Promise.all([fetchIndex(), fetchMistakeIds(user.id), fetchResults(user.id)]);
      setIndex(idx);
      setMistakes(mis);
      setResults(res);
    } catch (e) {
      setError((e as Error).message);
      setIndex([]);
    }
  }, [user.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- ma'lumot Supabase'dan yuklanadi
    void load();
  }, [load]);

  function changeScript(s: Script) {
    setScript(s);
    try {
      localStorage.setItem(SCRIPT_KEY, s);
    } catch {
      // brauzer saqlashga ruxsat bermasa — faqat shu seans uchun
    }
  }

  const tickets = useMemo(() => {
    const m = new Map<number, number>();
    for (const q of index ?? []) if (q.ticket != null) m.set(q.ticket, (m.get(q.ticket) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [index]);

  const topics = useMemo(() => {
    const m = new Map<string, number>();
    for (const q of index ?? []) if (q.topic) m.set(q.topic, (m.get(q.topic) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], "uz"));
  }, [index]);

  // Har bir bilet bo'yicha eng so'nggi natija
  const lastByTicket = useMemo(() => {
    const m = new Map<number, PravaResult>();
    for (const r of results) if (r.mode === "ticket" && r.ticket != null && !m.has(r.ticket)) m.set(r.ticket, r);
    return m;
  }, [results]);

  const exams = results.filter((r) => r.mode === "exam");
  const examsPassed = exams.filter((r) => r.passed).length;

  async function start(spec: Spec) {
    if (!index) return;
    const key = `${spec.mode}:${spec.ticket ?? spec.topic ?? spec.size ?? ""}`;
    setError("");
    setStarting(key);
    try {
      let ids: number[];
      let title: string;
      const exam = spec.mode === "exam" ? examFormat(spec.size ?? 20) : undefined;
      if (exam) {
        // Norma to'liq formatga mo'ljallangan — savollar yetmasa imtihon boshlanmaydi
        if (index.length < exam.size) throw new Error(`${exam.size} savollik imtihon uchun bazada kamida ${exam.size} ta savol kerak.`);
        ids = shuffle(index.map((q) => q.id)).slice(0, exam.size);
        title = `Imtihon · ${exam.size} savol`;
      } else if (spec.mode === "ticket") {
        ids = index.filter((q) => q.ticket === spec.ticket).map((q) => q.id);
        title = `${spec.ticket}-bilet`;
      } else if (spec.mode === "topic") {
        ids = index.filter((q) => q.topic === spec.topic).map((q) => q.id);
        title = tr(spec.topic ?? "Mavzu");
      } else {
        // Bazadan o'chirilgan savollar xatolar ro'yxatida qolib ketmasin
        const known = new Set(index.map((q) => q.id));
        ids = shuffle(mistakes.filter((id) => known.has(id)));
        title = "Xatolarim";
      }
      if (!ids.length) throw new Error("Bu bo'limda savol yo'q.");

      let questions = await fetchQuestions(ids);
      if (spec.mode === "ticket" || spec.mode === "topic") questions = questions.sort(byPosition);
      setSession({ key: crypto.randomUUID(), mode: spec.mode, title, questions, ticket: spec.ticket, topic: spec.topic, exam, spec });
      window.scrollTo({ top: 0 });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStarting(null);
    }
  }

  const exit = () => {
    setSession(null);
    void load();
  };

  const scriptToggle = (
    <div className="flex gap-1 self-start rounded-xl bg-white/[0.04] p-1 sm:self-auto" role="group" aria-label="Yozuv">
      {(["latin", "cyrillic"] as const).map((s) => (
        <button
          key={s}
          onClick={() => changeScript(s)}
          className={`rounded-lg px-3 py-1.5 text-sm transition ${script === s ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"}`}
        >
          {s === "latin" ? "Lotin" : "Кирилл"}
        </button>
      ))}
    </div>
  );

  if (session) {
    return (
      <PageWrap>
        <TestRunner
          key={session.key}
          session={session}
          tr={tr}
          onExit={exit}
          onRestart={() => void start(session.spec)}
        />
      </PageWrap>
    );
  }

  return (
    <PageWrap>
      <ModuleHeader module={modules.prava}>{scriptToggle}</ModuleHeader>
      <FormError message={error} />

      {index === null ? (
        <div className="grid min-h-[300px] place-items-center">
          <Spinner className="size-6" />
        </div>
      ) : index.length === 0 ? (
        !error && (
          <div className="glass rounded-3xl px-6 py-14 text-center">
            <CarFront size={36} className="mx-auto text-zinc-500" />
            <p className="mt-4 text-lg font-medium">Savollar bazasi tayyorlanmoqda</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-zinc-500">
              Biletlar tez orada qo&apos;shiladi. Shu orada boshqa vositalardan foydalanib turing.
            </p>
          </div>
        )
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat icon={ListChecks} label="Savollar" value={index.length} />
            <Stat icon={Layers} label="Biletlar" value={tickets.length} />
            <Stat icon={RotateCcw} label="Xatolarim" value={mistakes.length} />
            <Stat icon={Trophy} label="O'tilgan imtihonlar" value={exams.length ? `${examsPassed}/${exams.length}` : "—"} />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {EXAM_FORMATS.map((f) => {
              const enough = index.length >= f.size;
              return (
                <ModeCard
                  key={f.size}
                  icon={Timer}
                  title={`Imtihon · ${f.size} savol`}
                  desc={
                    `${f.size} ta tasodifiy savol · ${f.minutes} daqiqa. O'tish normasi: kamida ${f.minCorrect} ta to'g'ri ` +
                    `(ko'pi bilan ${maxMistakes(f)} ta xato).` +
                    (enough ? "" : ` Bazada hozircha ${index.length} ta savol bor.`)
                  }
                  action="Imtihonni boshlash"
                  busy={starting === `exam:${f.size}`}
                  disabled={!enough || starting !== null}
                  onClick={() => void start({ mode: "exam", size: f.size })}
                />
              );
            })}
            <ModeCard
              icon={RotateCcw}
              title="Xatolar ustida ishlash"
              desc={
                mistakes.length
                  ? `Xato javob bergan ${mistakes.length} ta savolingiz. To'g'ri javob bersangiz, ro'yxatdan chiqadi.`
                  : "Hozircha xato yo'q. Test ishlaganingizda xato javoblar shu yerga yig'iladi."
              }
              action="Takrorlash"
              busy={starting === "mistakes:"}
              disabled={!mistakes.length}
              onClick={() => void start({ mode: "mistakes" })}
            />
          </div>

          {tickets.length > 0 && (
            <section className="mt-10">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <ClipboardList size={19} className="text-[var(--accent)]" /> Biletlar
                </h2>
                <p className="text-xs text-zinc-500">
                  <span className="mr-1 inline-block size-2 rounded-full bg-emerald-400" /> hammasi to&apos;g&apos;ri
                  <span className="ml-3 mr-1 inline-block size-2 rounded-full bg-amber-400" /> xato bor
                </p>
              </div>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
                {tickets.map(([t, count]) => {
                  const r = lastByTicket.get(t);
                  const done = r && r.correct === r.total;
                  return (
                    <button
                      key={t}
                      onClick={() => void start({ mode: "ticket", ticket: t })}
                      disabled={starting !== null}
                      title={r ? `So'nggi natija: ${r.correct}/${r.total}` : `${count} ta savol`}
                      className={`relative grid aspect-square place-items-center rounded-2xl border text-lg font-semibold tabular-nums transition hover:-translate-y-0.5 ${
                        !r
                          ? "border-white/10 bg-white/[0.03] hover:border-white/25"
                          : done
                            ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
                            : "border-amber-400/40 bg-amber-500/10 text-amber-100"
                      }`}
                    >
                      {starting === `ticket:${t}` ? <Spinner className="size-5" /> : t}
                      {r && (
                        <span className="absolute bottom-1 text-[10px] font-normal text-zinc-400">
                          {r.correct}/{r.total}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {topics.length > 0 && (
            <section className="mt-10">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                <BookOpenCheck size={19} className="text-[var(--accent)]" /> Mavzular bo&apos;yicha
              </h2>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {topics.map(([topic, count]) => (
                  <button
                    key={topic}
                    onClick={() => void start({ mode: "topic", topic })}
                    disabled={starting !== null}
                    className="glass glass-hover flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-sm"
                  >
                    <span className="min-w-0 truncate">{tr(topic)}</span>
                    {starting === `topic:${topic}` ? (
                      <Spinner className="size-4" />
                    ) : (
                      <span className="shrink-0 text-xs text-zinc-500">{count} ta</span>
                    )}
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </PageWrap>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Timer; label: string; value: number | string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between text-sm text-zinc-400">
        {label} <Icon size={17} className="text-[var(--accent)]" />
      </div>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function ModeCard({
  icon: Icon,
  title,
  desc,
  action,
  busy,
  disabled,
  onClick,
}: {
  icon: typeof Timer;
  title: string;
  desc: string;
  action: string;
  busy: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <div className="glass relative flex flex-col overflow-hidden rounded-3xl p-6">
      <div aria-hidden className="accent-gradient absolute -right-16 -top-16 size-44 rounded-full opacity-20 blur-3xl" />
      <span className="accent-gradient relative grid size-11 place-items-center rounded-2xl">
        <Icon size={20} />
      </span>
      <h3 className="relative mt-4 text-lg font-semibold">{title}</h3>
      <p className="relative mt-1.5 flex-1 text-sm text-zinc-400">{desc}</p>
      <button onClick={onClick} disabled={disabled || busy} className="btn-accent relative mt-5 self-start">
        {busy && <Spinner className="size-4" />} {action}
      </button>
    </div>
  );
}
