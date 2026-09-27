"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  ArrowUpRight,
  CalendarDays,
  FileText,
  FolderKanban,
  LogOut,
  Plus,
  Rocket,
  Sparkles,
} from "lucide-react";
import CreateProjectModal from "@/components/CreateProjectModal";
import Backdrop from "@/components/Backdrop";
import Logo from "@/components/Logo";
import LoadingScreen from "@/components/LoadingScreen";

type Project = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
};

export default function DashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  async function initializeDashboard() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      setEmail(user.email || "");

      // Muhim:
      // Dashboard Supabase projects query'sini kutmaydi.
      setLoading(false);

      // Projectlarni alohida yuklaymiz.
      loadProjects(user.id);
    } catch (error) {
      console.error("Dashboard initialization error:", error);

      setLoading(false);
      router.replace("/login");
    }
  }

  async function loadProjects(userId: string) {
    setProjectsLoading(true);

    try {
      const { data, error } = await supabase
        .from("projects")
        .select("id, title, description, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Load projects error:", error);
        return;
      }

      setProjects(data || []);
    } catch (error) {
      console.error("Projects fetch error:", error);
    } finally {
      setProjectsLoading(false);
    }
  }

  async function createProject(title: string) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: "",
        })
        .select()
        .single();

      if (error) {
        console.error("Create project error:", error);
        alert(error.message);
        return;
      }

      if (data) {
        setProjects((current) => [data, ...current]);
      }
    } catch (error) {
      console.error("Create project error:", error);
      alert("Loyiha yaratishda xatolik yuz berdi.");
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void initializeDashboard();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <main className="relative flex min-h-screen text-white">
        <Backdrop />
        <LoadingScreen label="Dashboard yuklanmoqda..." />
      </main>
    );
  }

  const name = email.split("@")[0];

  return (
    <main className="relative min-h-screen text-white">
      <Backdrop />

      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-ink/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo href="/dashboard" />

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2.5 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-4 sm:flex">
              <span className="grid size-7 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-indigo-600 text-xs font-semibold uppercase">
                {name.charAt(0)}
              </span>
              <span className="max-w-[200px] truncate text-sm text-zinc-300">{email}</span>
            </div>

            <button onClick={logout} className="btn-ghost !px-3.5 !py-2 text-sm" title="Chiqish">
              <LogOut size={16} />
              <span className="hidden sm:inline">Chiqish</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-12">
        {/* HERO */}
        <div className="animate-fade-up flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-brand-400">Dashboard</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
              Salom, <span className="text-gradient">{name}</span> 👋
            </h1>
            <p className="mt-3 text-zinc-400">Keyingi biznesingizni AI bilan quring.</p>
          </div>

          <button onClick={() => setModalOpen(true)} className="btn-primary shrink-0">
            <Plus size={18} /> Yangi loyiha
          </button>
        </div>

        {/* STATS */}
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            { icon: FolderKanban, label: "Loyihalar", value: projectsLoading ? "—" : String(projects.length) },
            { icon: FileText, label: "Har loyihada hujjat", value: "3" },
            { icon: Sparkles, label: "AI model", value: "Claude" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="glass flex items-center gap-4 rounded-2xl p-5">
              <span className="grid size-11 place-items-center rounded-xl bg-brand-500/15 text-brand-300">
                <Icon size={20} />
              </span>
              <div>
                <p className="text-2xl font-semibold">{value}</p>
                <p className="text-sm text-zinc-500">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* PROJECTS */}
        <div className="mt-14">
          <h2 className="mb-6 text-xl font-semibold">Mening loyihalarim</h2>

          {projectsLoading ? (
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
              <div aria-hidden className="absolute left-1/2 top-0 h-40 w-96 -translate-x-1/2 rounded-full bg-brand-500/20 blur-3xl" />
              <div className="relative mx-auto grid size-16 place-items-center rounded-2xl border border-white/10 bg-white/5">
                <Rocket size={28} className="text-brand-300" />
              </div>
              <h3 className="relative mt-6 text-xl font-semibold">Hali loyiha yo&apos;q</h3>
              <p className="relative mx-auto mt-2 max-w-sm text-zinc-400">
                Birinchi loyihangizni yarating va AI sizga biznes reja tayyorlab bersin.
              </p>
              <button onClick={() => setModalOpen(true)} className="btn-primary relative mt-8">
                <Plus size={18} /> Loyiha yaratish
              </button>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              <button
                onClick={() => setModalOpen(true)}
                className="group flex min-h-[190px] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-white/15 text-zinc-500 transition hover:border-brand-400/60 hover:bg-brand-500/5 hover:text-brand-300"
              >
                <span className="grid size-12 place-items-center rounded-2xl border border-current/30 transition group-hover:scale-110">
                  <Plus size={22} />
                </span>
                Yangi loyiha
              </button>

              {projects.map((project, i) => (
                <Link
                  href={`/dashboard/project/${project.id}`}
                  key={project.id}
                  className="glass glass-hover group relative flex min-h-[190px] flex-col overflow-hidden rounded-3xl p-6"
                >
                  <div aria-hidden className={`absolute -right-12 -top-12 size-36 rounded-full bg-gradient-to-br ${accents[i % accents.length]} to-transparent blur-2xl`} />
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
                      {new Date(project.created_at).toLocaleDateString("uz-UZ", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <ArrowUpRight size={18} className="text-zinc-500 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-300" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={createProject}
      />
    </main>
  );
}

const accents = ["from-brand-500/30", "from-cyan-500/25", "from-fuchsia-500/25", "from-emerald-500/25"];
