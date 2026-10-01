"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertAdmin, checkLogin, logout } from "@/lib/admin/auth";
import { adminDb, isBucket, type Bucket } from "@/lib/admin/db";
import { extOf } from "@/lib/admin/files";
import { normalizeQuestion, type QuestionInput } from "@/lib/prava";
import { normalizeExamQuestion, type ExamQuestionInput } from "@/lib/exam-questions";
import { examById } from "@/lib/exams";

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

// ---------------- Prava savollari ----------------

export async function saveQuestionAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await assertAdmin();
  const id = str(fd, "id");
  let row: QuestionInput;
  try {
    row = normalizeQuestion({
      ticket: fd.get("ticket"),
      position: fd.get("position"),
      topic: fd.get("topic"),
      question: fd.get("question"),
      options: fd.getAll("option"),
      correct: fd.get("correct"),
      correctIsIndex: true,
      explanation: fd.get("explanation"),
      image: fd.get("image"),
      active: fd.get("active") ? "1" : "0",
    });
  } catch (e) {
    return { error: (e as Error).message };
  }

  const table = adminDb().from("prava_questions");
  const { data, error } = id
    ? await table.update({ ...row, updated_at: new Date().toISOString() }).eq("id", id).select("id").single()
    : await table.insert(row).select("id").single();
  if (error) return { error: `Saqlab bo'lmadi: ${error.message}` };
  refresh();
  if (!id) redirect(`/admin/prava/${data.id}?saved=1`);
  return { ok: "Saqlandi." };
}

export async function deleteQuestionAction(fd: FormData) {
  await assertAdmin();
  const { error } = await adminDb().from("prava_questions").delete().eq("id", str(fd, "id"));
  if (error) throw new Error(`Savolni o'chirib bo'lmadi: ${error.message}`);
  refresh();
  if (str(fd, "back")) redirect("/admin/prava");
}

export async function toggleQuestionAction(fd: FormData) {
  await assertAdmin();
  const { error } = await adminDb()
    .from("prava_questions")
    .update({ active: str(fd, "active") === "1", updated_at: new Date().toISOString() })
    .eq("id", str(fd, "id"));
  if (error) throw new Error(`Saqlab bo'lmadi: ${error.message}`);
  refresh();
}

/** Brauzerda o'qilgan savollar bo'laklab yuboriladi (Server Action 1 MB chegarasi). Har biri qayta tekshiriladi. */
export async function importQuestionsAction(rows: QuestionInput[], replaceAll: boolean): Promise<{ inserted: number }> {
  await assertAdmin();
  if (!Array.isArray(rows) || rows.length > 500) throw new Error("Bir martada ko'pi bilan 500 ta savol.");
  const clean = rows.map((r, i) => {
    try {
      return normalizeQuestion({ ...r, correctIsIndex: true });
    } catch (e) {
      throw new Error(`${i + 1}-savol: ${(e as Error).message}`);
    }
  });

  const db = adminDb();
  if (replaceAll) {
    const { error } = await db.from("prava_questions").delete().gte("id", 0);
    if (error) throw new Error(`Eski savollarni o'chirib bo'lmadi: ${error.message}`);
  }
  if (clean.length) {
    const { error } = await db.from("prava_questions").insert(clean);
    if (error) throw new Error(`Saqlab bo'lmadi: ${error.message}`);
  }
  refresh();
  return { inserted: clean.length };
}

// ---------------- Abituriyent savollari va materiallari ----------------

const EXAM_BUCKET = "exam-files";

export async function saveExamQuestionAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await assertAdmin();
  const id = str(fd, "id");
  let row: ExamQuestionInput;
  try {
    row = normalizeExamQuestion({
      exam: fd.get("exam"),
      subject: fd.get("subject"),
      topic: fd.get("topic"),
      question: fd.get("question"),
      options: fd.getAll("option"),
      correct: fd.get("correct"),
      correctIsIndex: true,
      explanation: fd.get("explanation"),
      passage: fd.get("passage"),
      image: fd.get("image"),
      active: fd.get("active") ? "1" : "0",
    });
  } catch (e) {
    return { error: (e as Error).message };
  }

  const table = adminDb().from("exam_questions");
  const { data, error } = id
    ? await table.update({ ...row, updated_at: new Date().toISOString() }).eq("id", id).select("id").single()
    : await table.insert(row).select("id").single();
  if (error) return { error: `Saqlab bo'lmadi: ${error.message}` };
  refresh();
  if (!id) redirect(`/admin/exams/${data.id}?saved=1`);
  return { ok: "Saqlandi." };
}

export async function deleteExamQuestionAction(fd: FormData) {
  await assertAdmin();
  const { error } = await adminDb().from("exam_questions").delete().eq("id", str(fd, "id"));
  if (error) throw new Error(`Savolni o'chirib bo'lmadi: ${error.message}`);
  refresh();
  if (str(fd, "back")) redirect("/admin/exams");
}

export async function toggleExamQuestionAction(fd: FormData) {
  await assertAdmin();
  const { error } = await adminDb()
    .from("exam_questions")
    .update({ active: str(fd, "active") === "1", updated_at: new Date().toISOString() })
    .eq("id", str(fd, "id"));
  if (error) throw new Error(`Saqlab bo'lmadi: ${error.message}`);
  refresh();
}

/** Import bo'laklari; replace berilsa — avval shu imtihon/fandagi savollar o'chiriladi (faqat birinchi bo'lakda). */
export async function importExamQuestionsAction(
  rows: ExamQuestionInput[],
  replace: { exam: string; subject: string | null } | null,
): Promise<{ inserted: number }> {
  await assertAdmin();
  if (!Array.isArray(rows) || rows.length > 500) throw new Error("Bir martada ko'pi bilan 500 ta savol.");
  const clean = rows.map((r, i) => {
    try {
      return normalizeExamQuestion({ ...r, correctIsIndex: true });
    } catch (e) {
      throw new Error(`${i + 1}-savol: ${(e as Error).message}`);
    }
  });

  const db = adminDb();
  if (replace) {
    if (!examById(replace.exam)) throw new Error("Imtihon noto'g'ri.");
    let del = db.from("exam_questions").delete().eq("exam", replace.exam);
    if (replace.subject) del = del.eq("subject", replace.subject);
    const { error } = await del;
    if (error) throw new Error(`Eski savollarni o'chirib bo'lmadi: ${error.message}`);
  }
  if (clean.length) {
    const { error } = await db.from("exam_questions").insert(clean);
    if (error) throw new Error(`Saqlab bo'lmadi: ${error.message}`);
  }
  refresh();
  return { inserted: clean.length };
}

export async function addMaterialAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await assertAdmin();
  const exam = examById(str(fd, "exam"));
  if (!exam) return { error: "Imtihonni tanlang." };
  const subject = str(fd, "subject");
  if (subject && !exam.subjects.some((s) => s.id === subject)) return { error: "Fan noto'g'ri." };
  const kind = str(fd, "kind") === "file" ? "file" : "link";
  const title = str(fd, "title").slice(0, 200);
  const url = str(fd, "url");
  if (!title) return { error: "Sarlavhani kiriting." };
  if (kind === "link" && !/^https?:\/\/\S+$/.test(url)) return { error: "Havola http:// yoki https:// bilan boshlanishi kerak." };
  if (kind === "file" && (!url || url.split("/").includes(".."))) return { error: "Faylni yuklang." };

  const { error } = await adminDb()
    .from("exam_materials")
    .insert({ exam: exam.id, subject: subject || null, title, description: str(fd, "description").slice(0, 1000) || null, kind, url });
  if (error) return { error: `Saqlab bo'lmadi: ${error.message}` };
  refresh();
  return { ok: "Material qo'shildi." };
}

export async function deleteMaterialAction(fd: FormData) {
  await assertAdmin();
  const db = adminDb();
  const { data, error } = await db.from("exam_materials").delete().eq("id", str(fd, "id")).select("kind, url").maybeSingle();
  if (error) throw new Error(`O'chirib bo'lmadi: ${error.message}`);
  // Yuklangan fayl ham o'chiriladi (havola bo'lsa — faqat yozuv)
  if (data?.kind === "file") await db.storage.from(EXAM_BUCKET).remove([data.url]);
  refresh();
}
