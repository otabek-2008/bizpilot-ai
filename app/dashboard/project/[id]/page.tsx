"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Project } from "@/types";
import { generateWithAI } from "@/services/generator";
import { saveDocument, getDocument } from "@/services/projects";

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
      router.replace("/dashboard");
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
    return (
      <main className="min-h-screen bg-[#0f0f0f] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-zinc-700 border-t-purple-500 rounded-full animate-spin mx-auto" />
          <p className="text-zinc-400 mt-4">Loading...</p>
        </div>
      </main>
    );
  }

  if (!project) {
    return null;
  }

  const base = `/dashboard/project/${projectId}`;

  const summaryCards = [
    { href: `${base}/biznes-plan`, icon: "📋", title: "Business Plan", desc: "AI-powered business strategy", ready: hasDocs },
    { href: `${base}/marketing`, icon: "📣", title: "Marketing", desc: "Marketing strategy and ideas", ready: hasDocs },
    { href: `${base}/finance`, icon: "💰", title: "Financial Plan", desc: "Revenue and cost planning", ready: hasDocs },
  ];

  return (
    <div className="max-w-5xl mx-auto px-8 py-12">
      <div className="mb-10">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-zinc-400 hover:text-white text-sm mb-3"
        >
          ← Back to Dashboard
        </button>
        <h2 className="text-4xl font-bold">Build Your Business 🚀</h2>
        <p className="text-zinc-400 mt-3">
          BizPilot AI sizning biznes g&apos;oyangiz asosida biznes reja, marketing
          strategiyasi va moliyaviy reja yaratadi.
        </p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
        <h3 className="text-2xl font-bold mb-6">Tell us about your business</h3>

        <div className="space-y-6">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Business Idea</label>
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              rows={6}
              placeholder="Masalan: Toshkentda kichik bizneslar uchun AI marketing xizmatini yaratmoqchiman..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-white outline-none focus:border-purple-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-2">Target Audience</label>
            <input
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="Masalan: 18-35 yoshdagi tadbirkorlar"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-white outline-none focus:border-purple-500"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Budget</label>
              <input
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="Masalan: $5,000"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-white outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Location</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Masalan: Tashkent, Uzbekistan"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-white outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-700/50 text-red-300 rounded-xl p-4 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={generate}
            disabled={generating}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed transition py-4 rounded-xl font-semibold text-lg"
          >
            {generating ? "⏳ AI hujjatlarni tayyorlamoqda (1-2 daqiqa)..." : "✨ Generate Business Plan"}
          </button>
        </div>
      </div>

      <div className="mt-8 grid md:grid-cols-3 gap-4">
        {summaryCards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-purple-500 transition"
          >
            <div className="text-2xl mb-2">{card.icon}</div>
            <h4 className="font-semibold text-white">{card.title}</h4>
            <p className="text-sm text-zinc-500 mt-1">{card.desc}</p>
            <div className="mt-3 text-sm text-purple-400">
              {card.ready ? `${card.title}ni ko'rish →` : "Avval biznes rejani yarating"}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
