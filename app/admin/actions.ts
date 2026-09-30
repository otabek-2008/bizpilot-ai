"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertAdmin, checkLogin, logout } from "@/lib/admin/auth";
import { adminDb, isBucket, type Bucket } from "@/lib/admin/db";
import { extOf } from "@/lib/admin/files";

// Har bir funksiya POST orqali to'g'ridan-to'g'ri chaqirilishi mumkin — shuning uchun hammasida assertAdmin().

export type FormState = { error?: string; ok?: string } | null;

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const refresh = () => revalidatePath("/admin", "layout");

export async function loginAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const result = await checkLogin(str(fd, "username"), String(fd.get("password") ?? ""));
  if (!result.ok) return { error: result.error };
  redirect("/admin");
}

export async function logoutAction() {
  await logout();
  redirect("/admin/login");
}

// ---------------- Foydalanuvchilar ----------------

export async function deleteUserAction(fd: FormData) {
  await assertAdmin();
  const id = str(fd, "id");
  const { error } = await adminDb().auth.admin.deleteUser(id);
  if (error) throw new Error(`Foydalanuvchini o'chirib bo'lmadi: ${error.message}`);
  refresh();
  redirect("/admin/users");
}

export async function deleteProjectAction(fd: FormData) {
  await assertAdmin();
  const { error } = await adminDb().from("projects").delete().eq("id", str(fd, "id"));
  if (error) throw new Error(`Loyihani o'chirib bo'lmadi: ${error.message}`);
  refresh();
}

// ---------------- Xabarlar ----------------

export async function replyMessageAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await assertAdmin();
  const reply = str(fd, "reply");
  const { error } = await adminDb()
    .from("support_messages")
    .update({ reply: reply || null, replied_at: reply ? new Date().toISOString() : null })
    .eq("id", str(fd, "id"));
  if (error) return { error: `Saqlab bo'lmadi: ${error.message}` };
  refresh();
  return { ok: reply ? "Javob yuborildi." : "Javob o'chirildi." };
}

export async function deleteMessageAction(fd: FormData) {
  await assertAdmin();
  const { error } = await adminDb().from("support_messages").delete().eq("id", str(fd, "id"));
  if (error) throw new Error(`Xabarni o'chirib bo'lmadi: ${error.message}`);
  refresh();
}

// ---------------- Fayllar ----------------

/** "papka/fayl.pdf" ko'rinishidagi xavfsiz yo'l; ".." va bo'sh qismlarga yo'l qo'yilmaydi. */
function cleanPath(raw: string): string {
  const parts = raw.replace(/\\/g, "/").split("/").map((p) => p.trim()).filter(Boolean);
  if (!parts.length || parts.some((p) => p === "." || p === "..")) throw new Error("Fayl yo'li noto'g'ri.");
  return parts.join("/");
}

function bucketOf(raw: string): Bucket {
  if (!isBucket(raw)) throw new Error("Noma'lum bo'lim.");
  return raw;
}

/** Brauzer faylni to'g'ridan-to'g'ri Supabase'ga yuklashi uchun bir martalik ruxsat (katta fayllar Next.js orqali o'tmaydi). */
export async function createUploadUrlAction(bucket: string, path: string) {
  await assertAdmin();
  const safe = cleanPath(path);
  const { data, error } = await adminDb().storage.from(bucketOf(bucket)).createSignedUploadUrl(safe, { upsert: true });
  if (error) throw new Error(`Yuklash ruxsatini olib bo'lmadi: ${error.message}`);
  return { path: data.path, token: data.token };
}

export async function afterUploadAction() {
  await assertAdmin();
  refresh();
}

export async function downloadUrlAction(bucket: string, path: string): Promise<string> {
  await assertAdmin();
  const { data, error } = await adminDb()
    .storage.from(bucketOf(bucket))
    .createSignedUrl(cleanPath(path), 60, { download: true });
  if (error) throw new Error(`Havola yaratib bo'lmadi: ${error.message}`);
  return data.signedUrl;
}

export async function deleteFileAction(fd: FormData) {
  await assertAdmin();
  const bucket = bucketOf(str(fd, "bucket"));
  const path = cleanPath(str(fd, "path"));
  const { error } = await adminDb().storage.from(bucket).remove([path]);
  if (error) throw new Error(`Faylni o'chirib bo'lmadi: ${error.message}`);
  refresh();
}

export async function renameFileAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await assertAdmin();
  try {
    const bucket = bucketOf(str(fd, "bucket"));
    const from = cleanPath(str(fd, "from"));
    const to = cleanPath(str(fd, "to"));
    if (from === to) return null;
    const { error } = await adminDb().storage.from(bucket).move(from, to);
    if (error) return { error: `Nomini o'zgartirib bo'lmadi: ${error.message}` };
  } catch (e) {
    return { error: (e as Error).message };
  }
  refresh();
  return { ok: "Saqlandi." };
}

export async function createFolderAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await assertAdmin();
  try {
    const bucket = bucketOf(str(fd, "bucket"));
    const folder = cleanPath(`${str(fd, "prefix")}/${str(fd, "name")}`);
    // Supabase Storage'da bo'sh papka bo'lmaydi — ichiga yashirin belgi-fayl qo'yamiz
    const { error } = await adminDb()
      .storage.from(bucket)
      .upload(`${folder}/.keep`, new Blob([""]), { upsert: true, contentType: "text/plain" });
    if (error) return { error: `Papka yaratib bo'lmadi: ${error.message}` };
  } catch (e) {
    return { error: (e as Error).message };
  }
  refresh();
  return { ok: "Papka yaratildi." };
}

const TEXT_TYPES: Record<string, string> = {
  json: "application/json",
  csv: "text/csv;charset=utf-8",
  html: "text/html;charset=utf-8",
  xml: "application/xml",
  md: "text/markdown;charset=utf-8",
};

export async function saveTextFileAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await assertAdmin();
  try {
    const bucket = bucketOf(str(fd, "bucket"));
    const path = cleanPath(str(fd, "path"));
    const content = String(fd.get("content") ?? "");
    const { error } = await adminDb()
      .storage.from(bucket)
      .upload(path, new Blob([content], { type: TEXT_TYPES[extOf(path)] ?? "text/plain;charset=utf-8" }), { upsert: true });
    if (error) return { error: `Saqlab bo'lmadi: ${error.message}` };
  } catch (e) {
    return { error: (e as Error).message };
  }
  refresh();
  return { ok: "Saqlandi." };
}
