"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, Crown, Info, Medal, Users, X } from "lucide-react";
import ModuleHeader, { PageWrap } from "@/components/ui/ModuleHeader";
import { Group, Pill } from "@/components/ui/Pills";
import { FormError } from "@/components/AuthShell";
import { Spinner } from "@/components/LoadingScreen";
import { useAuth } from "@/components/AuthProvider";
import { useStudentProfile } from "@/components/profile/ProfileGate";
import { modules } from "@/lib/modules";
import type { UserStatus } from "@/lib/student-profile";
import { universityById } from "@/lib/universities";
import {
  PERIODS,
  fetchRatingMe,
  fetchRatingUniversities,
  fetchRatingUsers,
  type Period,
  type RatingMe,
  type RatingUniversity,
  type RatingUser,
} from "@/lib/rating";

type Tab = "users" | "universities";
type Filter = { status?: UserStatus; university?: string; universityLabel?: string };

const MEDALS = ["text-amber-300", "text-zinc-300", "text-orange-400"];

export default function RatingPage() {
  const { user } = useAuth();
  const { student } = useStudentProfile();
  const [period, setPeriod] = useState<Period>("week");
  const [tab, setTab] = useState<Tab>("users");
  const [filter, setFilter] = useState<Filter>({});
  const [users, setUsers] = useState<RatingUser[] | null>(null);
  const [unis, setUnis] = useState<RatingUniversity[] | null>(null);
  const [me, setMe] = useState<RatingMe | null>(null);
  const [error, setError] = useState("");

  const myUni = student?.status === "talaba" ? (student.university_id ?? student.university_name) : null;

  useEffect(() => {
    let active = true;
    const run = async () => {
      setError("");
      try {
        const [m, list] = await Promise.all([
          fetchRatingMe(period),
          tab === "users" ? fetchRatingUsers(period, filter) : fetchRatingUniversities(period),
        ]);
        if (!active) return;
        setMe(m);
        if (tab === "users") setUsers(list as RatingUser[]);
        else setUnis(list as RatingUniversity[]);
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- ma'lumot Supabase'dan yuklanadi
    if (tab === "users") setUsers(null);
    else setUnis(null);
    void run();
    return () => {
      active = false;
    };
  }, [period, tab, filter]);

  const maxUniPoints = useMemo(() => Math.max(1, ...(unis ?? []).map((u) => u.points)), [unis]);

  return (
    <PageWrap>
      <ModuleHeader module={modules.reyting}>
        <div className="flex gap-1 self-start rounded-xl bg-white/[0.04] p-1 sm:self-auto" role="group" aria-label="Davr">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`rounded-lg px-3 py-1.5 text-sm transition ${period === p.id ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </ModuleHeader>

      <FormError message={error} />

      {/* Mening o'rnim */}
      <div className="glass relative mb-6 overflow-hidden rounded-3xl p-6">
        <div aria-hidden className="accent-gradient absolute -right-16 -top-16 size-48 rounded-full opacity-25 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-x-10 gap-y-4">
          <div>
            <p className="text-sm text-zinc-400">Mening o&apos;rnim</p>
            <p className="mt-1 text-4xl font-semibold tabular-nums">{me ? `#${me.rank}` : "—"}</p>
          </div>
          <Metric label="Ball" value={me?.points ?? 0} />
          <Metric label="Testlar" value={me?.tests ?? 0} />
          <Metric label="Ishtirokchilar" value={me?.participants ?? "—"} />
          {!me && !error && (
            <p className="text-sm text-zinc-500">
              Reytingga kirish uchun prava yoki abituriyent bo&apos;limida test ishlang — har bir to&apos;g&apos;ri javob 1 ball.
            </p>
          )}
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-2xl bg-white/[0.04] p-1" role="tablist">
          {(
            [
              ["users", "Foydalanuvchilar", Users],
              ["universities", "Oliygohlar", Building2],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition ${tab === id ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"}`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {tab === "users" && (
          <Group label="">
            <Pill active={!filter.status && !filter.university} onClick={() => setFilter({})}>
              Hammasi
            </Pill>
            <Pill active={filter.status === "talaba" && !filter.university} onClick={() => setFilter({ status: "talaba" })}>
              Talabalar
            </Pill>
            <Pill active={filter.status === "abituriyent"} onClick={() => setFilter({ status: "abituriyent" })}>
              Abituriyentlar
            </Pill>
            {myUni && (
              <Pill
                active={filter.university === myUni}
                onClick={() => setFilter({ university: myUni, universityLabel: student?.university_name ?? undefined })}
              >
                Mening oliygohim
              </Pill>
            )}
          </Group>
        )}
      </div>

      {tab === "users" && filter.university && filter.university !== myUni && (
        <p className="mb-4 flex items-center gap-2 text-sm text-zinc-400">
          {filter.universityLabel}
          <button onClick={() => setFilter({})} className="rounded-lg p-1 hover:bg-white/5 hover:text-white" title="Filtrni olib tashlash">
            <X size={14} />
          </button>
        </p>
      )}

      {tab === "users" ? (
        users === null ? (
          <Loading />
        ) : users.length === 0 ? (
          <Empty text="Bu davrda hali hech kim ball to'plamagan. Birinchi bo'ling!" />
        ) : (
          <div className="glass overflow-hidden rounded-2xl">
            <ol className="divide-y divide-white/5">
              {users.map((u) => (
                <UserRow key={u.user_id} u={u} me={u.user_id === user.id} />
              ))}
            </ol>
          </div>
        )
      ) : unis === null ? (
        <Loading />
      ) : unis.length === 0 ? (
        <Empty text="Hali talabalar ma'lumoti yo'q." />
      ) : (
        <div className="glass overflow-hidden rounded-2xl">
          <ol className="divide-y divide-white/5">
            {unis.map((u, i) => {
              const key = u.university_id ?? u.university_name;
              const mine = key === myUni;
              return (
                <li key={key}>
                  <button
                    onClick={() => {
                      setFilter({ university: key, universityLabel: u.university_name });
                      setTab("users");
                    }}
                    className={`flex w-full items-center gap-4 px-5 py-3.5 text-left transition hover:bg-white/[0.03] ${mine ? "bg-[color:var(--accent)]/10" : ""}`}
                  >
                    <Rank n={i + 1} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{universityById(u.university_id)?.name ?? u.university_name}</span>
                      <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-white/5">
                        <span className="accent-gradient block h-full rounded-full" style={{ width: `${(u.points / maxUniPoints) * 100}%` }} />
                      </span>
                      <span className="mt-1 block text-xs text-zinc-500">
                        {u.students} ta talaba · {u.active} tasi faol
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-semibold tabular-nums">{u.points}</span>
                      <span className="text-xs text-zinc-500">ball</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      <p className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-zinc-500">
        <Info size={14} className="mt-0.5 shrink-0" />
        Ball: prava va abituriyent testlaridagi har bir to&apos;g&apos;ri javob — 1 ball. Hafta va oy — so&apos;nggi 7 va 30 kun.
      </p>
    </PageWrap>
  );
}

function UserRow({ u, me }: { u: RatingUser; me: boolean }) {
  const name = u.full_name || "Foydalanuvchi";
  const sub =
    u.status === "talaba"
      ? [universityById(u.university_id)?.name ?? u.university_name, u.faculty].filter(Boolean).join(" · ")
      : u.status === "abituriyent"
        ? "Abituriyent"
        : "";
  return (
    <li className={`flex items-center gap-4 px-5 py-3 ${me ? "bg-[color:var(--accent)]/10" : ""}`}>
      <Rank n={u.rank} />
      <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-white/10 text-sm font-semibold">
        {u.avatar_url ? (
          // Avatar Supabase Storage yoki Google/Telegram'dan keladi
          // eslint-disable-next-line @next/next/no-img-element
          <img src={u.avatar_url} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          name.replace(/^[@+]/, "").charAt(0).toUpperCase()
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          {name}
          {me && <span className="ml-2 text-xs text-[var(--accent)]">siz</span>}
        </span>
        {sub && <span className="block truncate text-xs text-zinc-500">{sub}</span>}
      </span>
      <span className="shrink-0 text-right">
        <span className="block font-semibold tabular-nums">{u.points}</span>
        <span className="text-xs text-zinc-500">{u.tests} test</span>
      </span>
    </li>
  );
}

function Rank({ n }: { n: number }) {
  if (n <= 3) {
    const Icon = n === 1 ? Crown : Medal;
    return (
      <span className={`grid w-8 shrink-0 place-items-center ${MEDALS[n - 1]}`} title={`${n}-o'rin`}>
        <Icon size={20} />
      </span>
    );
  }
  return <span className="w-8 shrink-0 text-center text-sm tabular-nums text-zinc-500">{n}</span>;
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Loading() {
  return (
    <div className="grid min-h-[240px] place-items-center">
      <Spinner className="size-6" />
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="glass rounded-2xl p-8 text-center text-sm text-zinc-400">{text}</p>;
}
