"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import CreateProjectModal from "@/components/CreateProjectModal";

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
      alert("Project yaratishda xatolik yuz berdi.");
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
      <main className="min-h-screen bg-[#0f0f0f] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-zinc-700 border-t-purple-500 rounded-full animate-spin mx-auto" />

          <p className="text-zinc-400 mt-4">
            Loading dashboard...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0f0f0f] text-white">

      {/* HEADER */}
      <header className="border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-8 py-5 flex items-center justify-between">

          <Link
            href="/dashboard"
            className="text-3xl font-bold text-purple-500"
          >
            BizPilot AI
          </Link>

          <div className="flex items-center gap-5">

            <span className="text-zinc-400 text-sm">
              {email}
            </span>

            <button
              onClick={logout}
              className="bg-red-600 hover:bg-red-700 px-5 py-2 rounded-lg transition"
            >
              Logout
            </button>

          </div>
        </div>
      </header>

      {/* MAIN */}
      <div className="max-w-7xl mx-auto px-8 py-12">

        <h1 className="text-5xl font-bold">
          Welcome 👋
        </h1>

        <p className="text-zinc-400 mt-3">
          Build your next AI business.
        </p>

        {/* NEW PROJECT */}
        <button
          onClick={() => setModalOpen(true)}
          className="mt-10 bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-xl font-semibold transition"
        >
          + New Project
        </button>

        {/* PROJECTS */}
        <div className="mt-14">

          <div className="flex items-center justify-between mb-6">

            <h2 className="text-2xl font-bold">
              My Projects
            </h2>

            {projectsLoading && (
              <span className="text-sm text-zinc-500">
                Loading projects...
              </span>
            )}

          </div>

          {projectsLoading ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">

              <div className="animate-pulse space-y-4">
                <div className="h-5 bg-zinc-800 rounded w-1/3" />
                <div className="h-4 bg-zinc-800 rounded w-1/2" />
              </div>

            </div>
          ) : projects.length === 0 ? (

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">

              <p className="text-zinc-500">
                No projects yet.
              </p>

              <button
                onClick={() => setModalOpen(true)}
                className="mt-4 text-purple-400 hover:text-purple-300"
              >
                Create your first project →
              </button>

            </div>

          ) : (

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

              {projects.map((project) => (

                <Link
                  href={`/dashboard/project/${project.id}`}
                  key={project.id}
                >
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-purple-500 transition cursor-pointer h-full">

                    <h3 className="text-xl font-bold">
                      {project.title}
                    </h3>

                    {project.description && (
                      <p className="text-zinc-400 mt-3">
                        {project.description}
                      </p>
                    )}

                    <p className="text-zinc-600 text-sm mt-5">
                      {new Date(
                        project.created_at
                      ).toLocaleString()}
                    </p>

                    <div className="mt-5 text-purple-400 text-sm">
                      Open project →
                    </div>

                  </div>
                </Link>

              ))}

            </div>

          )}

        </div>
      </div>

      {/* MODAL */}
      <CreateProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={createProject}
      />

    </main>
  );
}
