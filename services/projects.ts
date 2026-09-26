import { supabase } from "@/lib/supabase";
import type { GeneratedDocuments } from "@/types";

const DOC_TABLE = "project_documents";

export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getDocument(
  projectId: string,
): Promise<GeneratedDocuments | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from(DOC_TABLE)
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) return null;

  return {
    businessPlan: data.business_plan,
    marketing: data.marketing,
    finance: data.finance,
    updated_at: data.updated_at,
  };
}

export async function saveDocument(
  projectId: string,
  docs: GeneratedDocuments,
): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const payload = {
    project_id: projectId,
    user_id: user.id,
    business_plan: docs.businessPlan,
    marketing: docs.marketing,
    finance: docs.finance,
    updated_at: docs.updated_at,
  };

  const { error } = await supabase.from(DOC_TABLE).upsert(payload, {
    onConflict: "project_id",
  });

  if (error) {
    console.error("Save document error:", error);
    return false;
  }

  return true;
}
