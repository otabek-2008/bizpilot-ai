"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, Plus, Rocket } from "lucide-react";
import CreateProjectModal from "@/components/CreateProjectModal";
import ModuleHeader, { PageWrap } from "@/components/ui/ModuleHeader";
import { useAuth } from "@/components/AuthProvider";
import { modules } from "@/lib/modules";
import { logActivity } from "@/lib/activity";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/date";

type Project = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
};

const accents = ["#8b5cf6", "#06b6d4", "#d946ef", "#10b981"];

export default function BusinessPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    supabase
      .from("projects")
      .select("id, title, description, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error("Load projects error:", error);
        setProjects(data ?? []);
      });
  }, [user.id]);

  async function createProject(title: string) {
    const { data, error } = await supabase
      .from("projects")
      .insert({ user_id: user.id, title: title.trim(), description: "" })
      .select()
      .single();

    if (error) {
      console.error("Create project error:", error);
      alert(error.message);
      return;
    }
    if (data) {
      setProjects((current) => [data, ...(current ?? [])]);
      logActivity("business", `Yangi loyiha: ${data.title}`);
    }
  }

  return (
    <PageWrap>
      <ModuleHeader module={modules.business}>
        <button onClick={() => setModalOpen(true)} className="btn-accent shrink-0">
          <Plus size={18} /> Yangi loyiha
        </button>
      </ModuleHeader>

      {projects === null ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="glass space-y-4 rounded-3xl p-6">
              <div className="skeleton size-11 rounded-xl" />
              <div className="skeleton h-5 w-2/3 rounded-md" />
              <div className="skeleton h-4 w-1/3 rounded-md" />
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="glass relative overflow-hidden rounded-3xl px-8 py-16 text-center">
          <div aria-hidden className="accent-gradient absolute left-1/2 top-0 h-40 w-96 -translate-x-1/2 rounded-full opacity-25 blur-3xl" />
          <div className="accent-soft relative mx-auto grid size-16 place-items-center rounded-2xl animate-float">
            <Rocket size={28} />
          </div>
          <h3 className="relative mt-6 text-xl font-semibold">Hali loyiha yo&apos;q</h3>
          <p className="relative mx-auto mt-2 max-w-sm text-zinc-400">
            Birinchi loyihangizni yarating — AI sizga biznes reja, marketing va moliyaviy reja tayyorlab beradi.
          </p>
          <button onClick={() => setModalOpen(true)} className="btn-accent relative mt-8">
            <Plus size={18} /> Loyiha yaratish
          </button>
        </div>
      ) : (
        <div className="stagger grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <button
            onClick={() => setModalOpen(true)}
            className="group flex min-h-[190px] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-white/15 text-zinc-500 transition hover:border-[color:var(--accent)] hover:text-white"
          >
            <span className="grid size-12 place-items-center rounded-2xl border border-current/30 transition group-hover:rotate-90 group-hover:scale-110">
              <Plus size={22} />
            </span>
            Yangi loyiha
          </button>

          {projects.map((project, i) => (
            <Link
              href={`/dashboard/project/${project.id}`}
              key={project.id}
              className="glass lift group relative flex min-h-[190px] flex-col overflow-hidden rounded-3xl p-6"
            >
              <div
                aria-hidden
                className="absolute -right-12 -top-12 size-36 rounded-full opacity-30 blur-2xl"
                style={{ background: accents[i % accents.length] }}
              />
              <span className="relative grid size-11 place-items-center rounded-xl border border-white/10 bg-white/5 text-lg font-semibold uppercase text-brand-200">
                {project.title.charAt(0)}
              </span>
              <h3 className="relative mt-5 line-clamp-2 text-lg font-semibold">{project.title}</h3>
              {project.description && (
                <p className="relative mt-2 line-clamp-2 text-sm text-zinc-400">{project.description}</p>
              )}
              <div className="relative mt-auto flex items-center justify-between pt-5 text-sm">
                <span className="flex items-center gap-1.5 text-zinc-500">
                  <CalendarDays size={14} />
                  {formatDate(project.created_at)}
                </span>
                <ArrowUpRight size={18} className="text-zinc-500 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white" />
              </div>
            </Link>
          ))}
        </div>
      )}

      <CreateProjectModal open={modalOpen} onClose={() => setModalOpen(false)} onCreate={createProject} />
    </PageWrap>
  );
}
