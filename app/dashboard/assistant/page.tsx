"use client";

import { useEffect, useRef, useState } from "react";
import { BotMessageSquare, Plus, Send, Square } from "lucide-react";
import ModuleHeader, { PageWrap } from "@/components/ui/ModuleHeader";
import Markdown from "@/components/ui/Markdown";
import CopyButton from "@/components/ui/CopyButton";
import Avatar from "@/components/shell/Avatar";
import { useAuth } from "@/components/AuthProvider";
import { modules } from "@/lib/modules";
import { aiStream } from "@/lib/ai-client";
import { logActivity } from "@/lib/activity";

type Msg = { role: "user" | "assistant"; content: string; error?: boolean };

const storeKey = (uid: string) => `campusai:assistant:${uid}`;
// Serverga yuboriladigan tarix chegarasi (API 40 tagacha qabul qiladi)
const HISTORY = 30;

const STARTERS = [
  "Integralni oddiy tilda tushuntirib ber",
  "Nyutonning 3 qonunini misollar bilan izohla",
  "Ingliz tilida motivatsion xat uchun reja tuzib ber",
  "Python'da ro'yxatni saralashning 3 usuli",
];

function load(uid: string): Msg[] {
  try {
    const raw = localStorage.getItem(storeKey(uid));
    return raw ? (JSON.parse(raw) as Msg[]) : [];
  } catch {
    return [];
  }
}

export default function AssistantPage() {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Msg[]>(() => load(user.id));
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (busy) return; // oqim tugagach saqlaymiz
    try {
      localStorage.setItem(storeKey(user.id), JSON.stringify(messages.slice(-100)));
    } catch {
      // saqlab bo'lmasa ham suhbat davom etadi
    }
  }, [messages, busy, user.id]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  useEffect(() => () => abort.current?.abort(), []);

  async function send(raw: string) {
    const content = raw.trim();
    if (!content || busy) return;
    setText("");

    const history = [...messages.filter((m) => !m.error && m.content), { role: "user" as const, content }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setBusy(true);
    const controller = new AbortController();
    abort.current = controller;

    const setLast = (patch: Partial<Msg>) =>
      setMessages((cur) => [...cur.slice(0, -1), { ...cur.at(-1)!, ...patch }]);

    try {
      // Tarix foydalanuvchi xabari bilan boshlanishi kerak
      let payload = history.slice(-HISTORY);
      while (payload[0]?.role !== "user") payload = payload.slice(1);
      await aiStream("/api/ai/chat", { messages: payload.map(({ role, content }) => ({ role, content })) }, (full) => setLast({ content: full }), controller.signal);
      if (messages.length === 0) logActivity("assistant", content.slice(0, 60));
    } catch (e) {
      if (controller.signal.aborted) return;
      setMessages((cur) => {
        const last = cur.at(-1)!;
        const note = e instanceof Error ? e.message : "Xatolik yuz berdi.";
        return [...cur.slice(0, -1), ...(last.content ? [last] : []), { role: "assistant", content: note, error: true }];
      });
    } finally {
      setBusy(false);
      abort.current = null;
    }
  }

  function stop() {
    abort.current?.abort();
    setMessages((cur) => (cur.at(-1)?.content ? cur : cur.slice(0, -1)));
  }

  function reset() {
    stop();
    setMessages([]);
  }

  return (
    <PageWrap>
      <ModuleHeader module={modules.assistant}>
        <button onClick={reset} disabled={!messages.length} className="chip disabled:opacity-40">
          <Plus size={15} /> Yangi suhbat
        </button>
      </ModuleHeader>

      <section className="glass flex h-[min(74vh,760px)] min-h-[480px] flex-col overflow-hidden rounded-3xl">
        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-6 sm:px-6" aria-live="polite">
          {messages.length === 0 && (
            <div className="mx-auto flex max-w-xl flex-col items-center pt-8 text-center">
              <span className="accent-gradient grid size-14 place-items-center rounded-2xl"><BotMessageSquare size={26} /></span>
              <p className="mt-4 text-lg font-medium">Qanday yordam bera olaman?</p>
              <p className="mt-1 text-sm text-zinc-500">O&apos;zbek, rus yoki ingliz tilida yozing — o&apos;sha tilda javob beraman.</p>
              <div className="mt-6 grid w-full gap-2 sm:grid-cols-2">
                {STARTERS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-sm text-zinc-300 transition hover:border-white/25 hover:bg-white/[0.06]">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="animate-bubble-in flex flex-row-reverse items-end gap-2">
                <Avatar profile={profile} className="size-8 text-xs" />
                <p className="accent-gradient max-w-[80%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md px-4 py-2.5 text-sm leading-relaxed text-white">{m.content}</p>
              </div>
            ) : (
              <div key={i} className="animate-bubble-in flex items-start gap-3">
                <span className="accent-soft grid size-8 shrink-0 place-items-center rounded-full"><BotMessageSquare size={15} /></span>
                <div className="min-w-0 flex-1 pt-1 text-sm">
                  {m.error ? (
                    <p className="rounded-xl border border-rose-400/25 bg-rose-400/10 px-3 py-2 text-rose-200">{m.content}</p>
                  ) : m.content ? (
                    <>
                      <Markdown text={m.content} className="text-zinc-200" />
                      {!(busy && i === messages.length - 1) && (
                        <div className="mt-2"><CopyButton text={m.content} /></div>
                      )}
                    </>
                  ) : (
                    <div className="flex gap-1 py-2">
                      {[0, 1, 2].map((d) => <span key={d} className="typing-dot size-1.5 rounded-full bg-zinc-300" />)}
                    </div>
                  )}
                </div>
              </div>
            ),
          )}
          <div ref={bottom} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(text);
          }}
          className="flex items-end gap-2 border-t border-white/5 p-3"
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(text);
              }
            }}
            rows={1}
            maxLength={8000}
            aria-label="Savol"
            placeholder="Savolingizni yozing… (Shift+Enter — yangi qator)"
            className="field accent-ring max-h-40 min-h-[46px] resize-none !py-2.5"
          />
          {busy ? (
            <button type="button" onClick={stop} aria-label="To'xtatish" className="chip shrink-0 !px-3.5 !py-3">
              <Square size={15} />
            </button>
          ) : (
            <button type="submit" disabled={!text.trim()} aria-label="Yuborish" className="btn-accent shrink-0 !px-3.5 !py-3">
              <Send size={17} />
            </button>
          )}
        </form>
      </section>
      <p className="mt-3 px-1 text-xs text-zinc-500">AI xato qilishi mumkin — muhim fakt va raqamlarni tekshiring.</p>
    </PageWrap>
  );
}
