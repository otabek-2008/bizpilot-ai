"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { GeneratedDocuments, Project } from "@/types";
import { getCurrentUser, getDocument } from "@/services/projects";
import { supabase } from "@/lib/supabase";

export function useProjectWorkspace() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [documents, setDocuments] = useState<GeneratedDocuments | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const user = await getCurrentUser();
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
    setDocuments(docs);
    setLoading(false);
  }

  // load() awaits external Supabase calls before every setState, so no
  // cascading render occurs on mount.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  return {
    projectId,
    project,
    documents,
    loading,
    setDocuments,
  };
}


