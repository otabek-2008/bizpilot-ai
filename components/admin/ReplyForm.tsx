"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";
import { replyMessageAction } from "@/app/admin/actions";
import { Spinner } from "@/components/LoadingScreen";

export default function ReplyForm({ id, reply, repliedAt }: { id: string; reply: string; repliedAt: string }) {
  const [state, action, pending] = useActionState(replyMessageAction, null);

  return (
    <form action={action} className="mt-4 border-t border-white/5 pt-4">
      <input type="hidden" name="id" value={id} />
      <label className="mb-1.5 block text-xs text-zinc-500">
        {repliedAt ? `Javob (${repliedAt})` : "Javob yozish"}
      </label>
      <textarea name="reply" defaultValue={reply} rows={3} maxLength={5000} placeholder="Javobingiz..." className="field text-sm" />
      <div className="mt-2 flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary !px-4 !py-2 text-sm">
          {pending ? <Spinner className="size-4" /> : <Send size={15} />} Saqlash
        </button>
        {state?.ok && <span className="text-sm text-emerald-300">{state.ok}</span>}
        {state?.error && <span className="text-sm text-rose-300">{state.error}</span>}
      </div>
    </form>
  );
}
