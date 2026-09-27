"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bot, Mail, Send, ShieldCheck, Trash2, UserRound } from "lucide-react";
import ModuleHeader, { PageWrap } from "@/components/ui/ModuleHeader";
import Avatar from "@/components/shell/Avatar";
import { useAuth } from "@/components/AuthProvider";
import { modules, type ModuleId } from "@/lib/modules";
import { faqs, findAnswer } from "@/lib/faq";
import { logActivity } from "@/lib/activity";
import { mailtoUrl, site, telegramUrl } from "@/lib/site";
import { listSupportMessages, sendSupportMessage, type SupportMessage } from "@/services/support";
import { formatTime } from "@/lib/date";

type LocalMsg = {
  id: string;
  role: "user" | "bot";
  text: string;
  at: number;
  ticketId?: string;
  link?: ModuleId;
};

type ViewMsg = LocalMsg | { id: string; role: "admin"; text: string; at: number };

const storeKey = (uid: string) => `campusai:chat:${uid}`;

const WELCOME: LocalMsg = {
  id: "welcome",
  role: "bot",
  text: "Salom! Men CampusAI yordamchisiman. Vositalar haqida savol bering — javob topa olmasam, savolingizni to'g'ridan-to'g'ri adminga yuboraman.",
  at: 0,
};

function loadLocal(uid: string): LocalMsg[] {
  try {
    const raw = localStorage.getItem(storeKey(uid));
    return raw ? (JSON.parse(raw) as LocalMsg[]) : [];
  } catch {
    return [];
  }
}

export default function ChatPage() {
  const { user, profile } = useAuth();
  const [local, setLocal] = useState<LocalMsg[]>(() => loadLocal(user.id));
  const [tickets, setTickets] = useState<SupportMessage[]>([]);
  const [text, setText] = useState("");
  const [toAdmin, setToAdmin] = useState(false);
  const [typing, setTyping] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(storeKey(user.id), JSON.stringify(local.slice(-200)));
    } catch {
      // Tarixni saqlab bo'lmasa, chat baribir ishlaydi
    }
  }, [local, user.id]);

  const refresh = useCallback(() => {
    listSupportMessages(user.id).then(setTickets);
  }, [user.id]);

  // Admin javoblarini davriy tekshirish
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);

  const view = useMemo<ViewMsg[]>(() => {
    const known = new Set(local.map((m) => m.ticketId).filter(Boolean));
    const extra: ViewMsg[] = [];
    for (const t of tickets) {
      if (!known.has(t.id)) {
        extra.push({ id: `u-${t.id}`, role: "user", text: t.message, at: Date.parse(t.created_at), ticketId: t.id });
      }
      if (t.reply) {
        extra.push({ id: `a-${t.id}`, role: "admin", text: t.reply, at: Date.parse(t.replied_at ?? t.created_at) });
      }
    }
    return [WELCOME, ...local, ...extra].sort((a, b) => a.at - b.at);
  }, [local, tickets]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [view.length, typing]);

  async function send(message: string) {
    const body = message.trim();
    if (!body || typing) return;
    setText("");

    const userMsg: LocalMsg = { id: crypto.randomUUID(), role: "user", text: body, at: Date.now() };
    setLocal((cur) => [...cur, userMsg]);
    setTyping(true);

    const answer = toAdmin ? null : findAnswer(body);
    await new Promise((r) => setTimeout(r, 650));

    if (answer) {
      setLocal((cur) => [
        ...cur,
        { id: crypto.randomUUID(), role: "bot", text: answer.a, at: Date.now(), link: answer.module },
      ]);
      setTyping(false);
      return;
    }

    try {
      const ticket = await sendSupportMessage({ userId: user.id, kind: "chat", message: body, name: profile.name });
      setLocal((cur) => [
        ...cur.map((m) => (m.id === userMsg.id ? { ...m, ticketId: ticket.id } : m)),
        {
          id: crypto.randomUUID(),
          role: "bot",
          text: "Savolingiz adminga yuborildi ✓ Javob shu chatda paydo bo'ladi. Shoshilinch bo'lsa, Telegram yoki email orqali yozing.",
          at: Date.now(),
        },
      ]);
      logActivity("chat", "Adminga savol yuborildi");
    } catch (e) {
      setLocal((cur) => [
        ...cur,
        {
          id: crypto.randomUUID(),
          role: "bot",
          text: `${e instanceof Error ? e.message : "Xabar yuborilmadi."} Hozircha ${site.adminEmail} manziliga yozishingiz mumkin.`,
          at: Date.now(),
        },
      ]);
    } finally {
      setTyping(false);
      setToAdmin(false);
    }
  }

  function clearHistory() {
    setLocal([]);
  }

  return (
    <PageWrap>
      <ModuleHeader module={modules.chat} />

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        {/* Chat oynasi */}
        <section className="glass flex h-[min(70vh,680px)] min-h-[460px] flex-col overflow-hidden rounded-3xl">
          <header className="flex items-center gap-3 border-b border-white/5 px-5 py-3.5">
            <span className="accent-gradient relative grid size-10 place-items-center rounded-full">
              <Bot size={19} />
              <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-emerald-400 ring-2 ring-surface" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium">CampusAI yordamchi</p>
              <p className="text-xs text-emerald-300/80">onlayn · admin javoblari shu yerda</p>
            </div>
            <button onClick={clearHistory} title="Tarixni tozalash" aria-label="Tarixni tozalash" className="rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-white">
              <Trash2 size={16} />
            </button>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-5" aria-live="polite">
            {view.map((m) => (
              <Bubble key={m.id} msg={m} avatar={<Avatar profile={profile} className="size-8 text-xs" />} />
            ))}
            {typing && (
              <div className="animate-bubble-in flex items-end gap-2">
                <span className="accent-soft grid size-8 place-items-center rounded-full"><Bot size={15} /></span>
                <div className="flex gap-1 rounded-2xl rounded-bl-md bg-white/[0.06] px-4 py-3">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="typing-dot size-1.5 rounded-full bg-zinc-300" />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottom} />
          </div>

          {/* Tezkor savollar */}
          <div className="flex gap-2 overflow-x-auto border-t border-white/5 px-4 py-2.5">
            {faqs.slice(0, 6).map((f) => (
              <button key={f.q} onClick={() => send(f.q)} className="chip shrink-0 !py-1.5 text-xs">
                {f.q}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(text);
            }}
            className="flex items-end gap-2 border-t border-white/5 p-3"
          >
            <button
              type="button"
              onClick={() => setToAdmin((v) => !v)}
              data-active={toAdmin}
              title="To'g'ridan-to'g'ri adminga yuborish"
              className="chip shrink-0 !px-3 !py-2.5"
            >
              <UserRound size={16} />
              <span className="hidden sm:inline">Adminga</span>
            </button>
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
              placeholder={toAdmin ? "Adminga xabar yozing…" : "Savolingizni yozing…"}
              className="field accent-ring max-h-32 min-h-[46px] resize-none !py-2.5"
            />
            <button type="submit" disabled={!text.trim() || typing} aria-label="Yuborish" className="btn-accent shrink-0 !px-3.5 !py-3">
              <Send size={17} />
            </button>
          </form>
        </section>

        {/* Yon panel */}
        <aside className="stagger space-y-4">
          <div className="glass rounded-3xl p-5">
            <p className="font-medium">Admin bilan bog&apos;lanish</p>
            <p className="mt-1 text-sm text-zinc-500">Odatda bir kun ichida javob beramiz.</p>
            <div className="mt-4 space-y-2">
              {telegramUrl && (
                <a href={telegramUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-3 transition hover:border-sky-400/40 hover:bg-sky-400/10">
                  <span className="grid size-9 place-items-center rounded-xl bg-sky-500/20 text-sky-300"><Send size={16} /></span>
                  <span className="text-sm">Telegram</span>
                  <ArrowRight size={15} className="ml-auto text-zinc-500" />
                </a>
              )}
              <a href={mailtoUrl()} className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-3 transition hover:border-violet-400/40 hover:bg-violet-400/10">
                <span className="grid size-9 place-items-center rounded-xl bg-violet-500/20 text-violet-300"><Mail size={16} /></span>
                <span className="min-w-0 truncate text-sm">{site.adminEmail}</span>
              </a>
            </div>
          </div>
          <Link href={modules.contact.href} className="glass lift block rounded-3xl p-5">
            <p className="font-medium">Ko&apos;p so&apos;raladigan savollar</p>
            <p className="mt-1 text-sm text-zinc-500">Barcha javoblar Aloqa bo&apos;limida</p>
          </Link>
          <p className="flex gap-2 px-1 text-xs text-zinc-500">
            <ShieldCheck size={14} className="mt-0.5 shrink-0" /> Adminga yuborilgan xabarlarni faqat siz va admin ko&apos;radi.
          </p>
        </aside>
      </div>
    </PageWrap>
  );
}

function Bubble({ msg, avatar }: { msg: ViewMsg; avatar: React.ReactNode }) {
  const mine = msg.role === "user";
  const link = "link" in msg && msg.link ? modules[msg.link] : null;
  return (
    <div className={`animate-bubble-in flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}>
      {mine ? (
        avatar
      ) : msg.role === "admin" ? (
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-xs font-semibold text-emerald-300">A</span>
      ) : (
        <span className="accent-soft grid size-8 shrink-0 place-items-center rounded-full"><Bot size={15} /></span>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          mine
            ? "accent-gradient rounded-br-md text-white"
            : msg.role === "admin"
              ? "rounded-bl-md border border-emerald-400/20 bg-emerald-400/10"
              : "rounded-bl-md bg-white/[0.06]"
        }`}
      >
        {msg.role === "admin" && <p className="mb-1 text-xs font-medium text-emerald-300">Admin javobi</p>}
        <p className="whitespace-pre-wrap break-words">{msg.text}</p>
        {link && (
          <Link href={link.href} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-white/90 underline-offset-4 hover:underline">
            {link.title} bo&apos;limiga o&apos;tish <ArrowRight size={13} />
          </Link>
        )}
        {msg.at > 0 && (
          <p className={`mt-1 text-[10px] ${mine ? "text-white/60" : "text-zinc-500"}`}>
            {formatTime(msg.at)}
          </p>
        )}
      </div>
    </div>
  );
}
