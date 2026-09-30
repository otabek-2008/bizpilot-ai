"use client";

import { useActionState, useState } from "react";
import { Save } from "lucide-react";
import { saveTextFileAction } from "@/app/admin/actions";
import { Spinner } from "@/components/LoadingScreen";

export default function TextEditor({ bucket, path, initial }: { bucket: string; path: string; initial: string }) {
  const [text, setText] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [state, action, pending] = useActionState(async (prev: Parameters<typeof saveTextFileAction>[0], fd: FormData) => {
    const result = await saveTextFileAction(prev, fd);
    if (result?.ok) setSaved(String(fd.get("content") ?? ""));
    return result;
  }, null);

  // JSON fayllarda saqlashdan oldin xatoni ko'rsatamiz
  let jsonError = "";
  if (path.toLowerCase().endsWith(".json") && text.trim()) {
    try {
      JSON.parse(text);
    } catch (e) {
      jsonError = (e as Error).message;
    }
  }
  const dirty = text !== saved;

  return (
    <form action={action}>
      <input type="hidden" name="bucket" value={bucket} />
      <input type="hidden" name="path" value={path} />
      <textarea
        name="content"
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
        aria-label="Fayl matni"
        className="field min-h-[60vh] font-mono text-sm leading-relaxed"
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending || !dirty} className="btn-primary">
          {pending ? <Spinner className="size-4" /> : <Save size={16} />} Saqlash
        </button>
        {dirty && <span className="text-sm text-zinc-400">Saqlanmagan o&apos;zgarishlar bor</span>}
        {jsonError && <span className="text-sm text-amber-300">JSON xatosi: {jsonError}</span>}
        {state?.ok && !dirty && <span className="text-sm text-emerald-300">{state.ok}</span>}
        {state?.error && <span className="text-sm text-rose-300">{state.error}</span>}
      </div>
    </form>
  );
}
