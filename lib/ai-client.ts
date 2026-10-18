"use client";

import { supabase } from "@/lib/supabase";

// Brauzerdan AI route'lariga so'rov yuborish. Server bilan kelishilgan xato belgisi: lib/ai-server.ts
const STREAM_ERROR = "\u0000ERR:";

async function post(path: string, body: unknown, signal?: AbortSignal): Promise<Response> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Sessiya tugagan. Qayta kiring.");

  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || "AI xizmatida xatolik yuz berdi.");
  }
  return res;
}

export async function aiJson<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  return (await post(path, body, signal)).json() as Promise<T>;
}

/** Matnni bo'laklab oladi; onText har safar to'plangan to'liq matn bilan chaqiriladi. */
export async function aiStream(
  path: string,
  body: unknown,
  onText: (full: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const res = await post(path, body, signal);
  const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
  let full = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    full += value;
    const cut = full.indexOf(STREAM_ERROR);
    onText(cut === -1 ? full : full.slice(0, cut));
  }
  const cut = full.indexOf(STREAM_ERROR);
  // Xato oqim oxirida keladi; ungacha yozilgan matn ekranda qoladi.
  if (cut !== -1) throw new Error(full.slice(cut + STREAM_ERROR.length));
  return full;
}
