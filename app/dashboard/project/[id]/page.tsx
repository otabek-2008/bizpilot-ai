"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Project } from "@/types";
import { generateWithAI } from "@/services/generator";
import { saveDocument, getDocument } from "@/services/projects";
import { logActivity } from "@/lib/activity";
import {
  ArrowRight,
  Briefcase,
  Coins,
  Lightbulb,
  MapPin,
  Megaphone,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import LoadingScreen, { Spinner } from "@/components/LoadingScreen";
import { PageContainer } from "@/components/PlanSection";

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();

  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [hasDocs, setHasDocs] = useState(false);
  const [error, setError] = useState("");

  const [idea, setIdea] = useState("");
  const [audience, setAudience] = useState("");
  const [budget, setBudget] = useState("");
  const [location, setLocation] = useState("");

  async function loadProject() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();

    if (error || !data) {
      router.replace("/dashboard/business");
      return;
    }

    setProject(data);

    const docs = await getDocument(projectId);
    setHasDocs(!!docs);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadProject();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function generate() {
    setError("");

    if (!idea.trim()) {
      setError("Avval biznes g'oyangizni yozing.");
      return;
    }

    setGenerating(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      const docs = await generateWithAI(
        { idea, audience, budget, location },
        session.access_token,
      );

      const saved = await saveDocument(projectId, docs);
      if (!saved) {
        setError(
          "Hujjatlar saqlanmadi. Supabase'da 'project_documents' jadvali mavjudligini tekshiring.",
        );
      } else {
        setHasDocs(true);
        logActivity("business", `AI hujjatlar tayyor: ${project?.title ?? "loyiha"}`);
      }
    } catch (e) {
      console.error(e);
      setError(
        e instanceof Error ? e.message : "Hujjatlar yaratishda xatolik yuz berdi.",
      );
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return <LoadingScreen />;
  }

  if (!project) {
    return null;
  }

  const base = `/dashboard/project/${projectId}`;

  const summaryCards = [
    { href: `${base}/biznes-plan`, icon: Briefcase, title: "Biznes reja", desc: "Strategiya, bozor va SWOT tahlili", accent: "from-brand-500/30" },
    { href: `${base}/marketing`, icon: Megaphone, title: "Marketing", desc: "Kanallar, kampaniyalar va KPI", accent: "from-fuchsia-500/25" },
    { href: `${base}/finance`, icon: Wallet, title: "Moliyaviy reja", desc: "Xarajatlar va 3 yillik prognoz", accent: "from-emerald-500/25" },
  ];

  return (
    <PageContainer>
      <div className="animate-fade-up mb-10">
        <p className="text-sm font-medium text-brand-400">Loyiha</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">{project.title}</h1>
        <p className="mt-3 max-w-2xl text-zinc-400">
          CampusAI sizning biznes g&apos;oyangiz asosida biznes reja, marketing
          strategiyasi va moliyaviy reja yaratadi.
        </p>
      </div>

      <div className="glass relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <div aria-hidden className="absolute -right-24 -top-24 size-72 rounded-full bg-brand-500/15 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-brand-500/15 text-brand-300">
            <Lightbulb size={20} />
          </span>
          <div>
            <h2 className="text-xl font-semibold">Biznesingiz haqida</h2>
            <p className="text-sm text-zinc-500">Qanchalik batafsil yozsangiz, natija shunchalik aniq bo&apos;ladi.</p>
          </div>
        </div>

        <div className="relative mt-8 space-y-6">
          <div>
            <label htmlFor="idea" className="mb-2 block text-sm text-zinc-400">Biznes g&apos;oya</label>
            <textarea
              id="idea"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              rows={6}
              disabled={generating}
              placeholder="Masalan: Toshkentda kichik bizneslar uchun AI marketing xizmatini yaratmoqchiman..."
              className="field resize-none"
            />
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              { id: "audience", label: "Maqsadli auditoriya", icon: Users, value: audience, set: setAudience, ph: "18-35 yoshli tadbirkorlar" },
              { id: "budget", label: "Byudjet", icon: Coins, value: budget, set: setBudget, ph: "$5,000" },
              { id: "location", label: "Joylashuv", icon: MapPin, value: location, set: setLocation, ph: "Toshkent, O'zbekiston" },
            ].map(({ id, label, icon: Icon, value, set, ph }) => (
              <div key={id}>
                <label htmlFor={id} className="mb-2 block text-sm text-zinc-400">{label}</label>
                <div className="relative">
                  <Icon size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    id={id}
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    disabled={generating}
                    placeholder={ph}
                    className="field !pl-10"
                  />
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          <button onClick={generate} disabled={generating} className="btn-primary w-full py-4 text-base">
            {generating ? (
              <>
                <Spinner className="size-5" /> AI hujjatlarni tayyorlamoqda (1–2 daqiqa)...
              </>
            ) : (
              <>
                <Sparkles size={18} /> {hasDocs ? "Hujjatlarni qayta yaratish" : "Biznes reja yaratish"}
              </>
            )}
          </button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              href={card.href}
              className="glass glass-hover group relative overflow-hidden rounded-3xl p-6"
            >
              <div aria-hidden className={`absolute -right-12 -top-12 size-36 rounded-full bg-gradient-to-br ${card.accent} to-transparent blur-2xl`} />
              <div className="relative flex items-center justify-between">
                <span className="grid size-11 place-items-center rounded-xl border border-white/10 bg-white/5 text-brand-300">
                  <Icon size={20} />
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    hasDocs ? "bg-emerald-500/15 text-emerald-400" : "bg-white/5 text-zinc-500"
                  }`}
                >
                  {hasDocs ? "Tayyor" : "Kutilmoqda"}
                </span>
              </div>
              <h3 className="relative mt-5 font-semibold text-white">{card.title}</h3>
              <p className="relative mt-1 text-sm text-zinc-500">{card.desc}</p>
              <div className="relative mt-4 flex items-center gap-1 text-sm text-brand-300">
                {hasDocs ? "Ko'rish" : "Avval biznes rejani yarating"}
                {hasDocs && <ArrowRight size={15} className="transition group-hover:translate-x-1" />}
              </div>
            </Link>
          );
        })}
      </div>
    </PageContainer>
  );
}
