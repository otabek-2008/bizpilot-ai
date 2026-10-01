import "server-only";

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

// Service role mijozi RLS'ni chetlab o'tadi — faqat admin tekshiruvidan keyin ishlatiladi.
let client: SupabaseClient | null = null;

export function adminDb(): SupabaseClient {
  client ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

export const ADMIN_BUCKET = "admin-files";
export const BUCKETS = [ADMIN_BUCKET, "prava-images", "exam-files", "avatars"] as const;
export type Bucket = (typeof BUCKETS)[number];
export const isBucket = (b: string): b is Bucket => (BUCKETS as readonly string[]).includes(b);

/** Barcha foydalanuvchilar (Supabase Auth sahifalab beradi). */
export async function listAllUsers(): Promise<User[]> {
  const users: User[] = [];
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await adminDb().auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }
  return users;
}
