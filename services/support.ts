import { supabase } from "@/lib/supabase";

export type SupportMessage = {
  id: string;
  kind: "chat" | "contact";
  subject: string | null;
  message: string;
  reply: string | null;
  replied_at: string | null;
  created_at: string;
};

const TABLE = "support_messages";

export async function sendSupportMessage(input: {
  userId: string;
  kind: "chat" | "contact";
  message: string;
  name?: string;
  contact?: string;
  subject?: string;
}): Promise<SupportMessage> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      user_id: input.userId,
      kind: input.kind,
      message: input.message.trim(),
      name: input.name?.trim() || null,
      contact: input.contact?.trim() || null,
      subject: input.subject?.trim() || null,
    })
    .select("id, kind, subject, message, reply, replied_at, created_at")
    .single();

  if (error) {
    console.error("Support message error:", error);
    throw new Error(
      error.code === "42P01" || error.code === "PGRST205"
        ? "Xabarlar jadvali hali yaratilmagan (supabase/schema.sql ni ishga tushiring)."
        : "Xabarni yuborib bo'lmadi. Keyinroq urinib ko'ring.",
    );
  }
  return data as SupportMessage;
}

export async function listSupportMessages(userId: string): Promise<SupportMessage[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, kind, subject, message, reply, replied_at, created_at")
    .eq("user_id", userId)
    .eq("kind", "chat")
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) {
    console.error("Support list error:", error);
    return [];
  }
  return data as SupportMessage[];
}
