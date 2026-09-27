"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, Loader2, Mail, Send } from "lucide-react";
import ModuleHeader, { PageWrap } from "@/components/ui/ModuleHeader";
import { useAuth } from "@/components/AuthProvider";
import { modules } from "@/lib/modules";
import { faqs } from "@/lib/faq";
import { logActivity } from "@/lib/activity";
import { mailtoUrl, site, telegramUrl } from "@/lib/site";
import { sendSupportMessage } from "@/services/support";

const SUBJECTS = ["Savol", "Taklif", "Xatolik haqida", "Hamkorlik"];

export default function ContactPage() {
  const { user, profile } = useAuth();
  const [name, setName] = useState(profile.name);
  const [contact, setContact] = useState(profile.email || profile.phone);
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  const [open, setOpen] = useState<number | null>(0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (message.trim().length < 5) {
      setError("Xabar juda qisqa.");
      return;
    }
    setState("sending");
    try {
      await sendSupportMessage({ userId: user.id, kind: "contact", name, contact, subject, message });
      setState("sent");
      setMessage("");
      logActivity("contact", `Adminga xabar: ${subject}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xabar yuborilmadi.");
      setState("idle");
    }
  }

  return (
    <PageWrap>
      <ModuleHeader module={modules.contact} />

      <div className="stagger grid gap-4 sm:grid-cols-2">
        {telegramUrl ? (
          <a href={telegramUrl} target="_blank" rel="noreferrer" className="glass lift group flex items-center gap-4 rounded-3xl p-5" style={{ "--accent": "#0ea5e9" } as React.CSSProperties}>
            <span className="lift-icon grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600">
              <Send size={20} />
            </span>
            <div>
              <p className="font-medium">Telegram</p>
              <p className="text-sm text-zinc-400">@{site.adminTelegram.replace(/^@/, "")}</p>
            </div>
          </a>
        ) : (
          <div className="glass flex items-center gap-4 rounded-3xl p-5 opacity-70">
            <span className="grid size-12 place-items-center rounded-2xl bg-white/5">
              <Send size={20} />
            </span>
            <div>
              <p className="font-medium">Telegram</p>
              <p className="text-sm text-zinc-500">Tez orada</p>
            </div>
          </div>
        )}
        <a href={mailtoUrl()} className="glass lift group flex items-center gap-4 rounded-3xl p-5">
          <span className="accent-gradient lift-icon grid size-12 place-items-center rounded-2xl">
            <Mail size={20} />
          </span>
          <div className="min-w-0">
            <p className="font-medium">Email</p>
            <p className="truncate text-sm text-zinc-400">{site.adminEmail}</p>
          </div>
        </a>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Forma */}
        <section className="glass relative overflow-hidden rounded-3xl p-6">
          <div aria-hidden className="accent-gradient absolute -right-20 -top-20 size-56 rounded-full opacity-20 blur-3xl" />
          <h2 className="relative text-lg font-semibold">Xabar yuborish</h2>
          <p className="relative mt-1 text-sm text-zinc-500">Xabaringiz to&apos;g&apos;ridan-to&apos;g&apos;ri adminga yetkaziladi.</p>

          {state === "sent" ? (
            <div className="enter-pop relative mt-8 flex flex-col items-center py-8 text-center">
              <CheckCircle2 size={52} className="text-emerald-300" />
              <p className="mt-4 text-lg font-medium">Xabaringiz yuborildi!</p>
              <p className="mt-1 text-sm text-zinc-400">Javobni {contact || "profilingiz"} orqali olasiz.</p>
              <button onClick={() => setState("idle")} className="btn-ghost mt-6">Yana yozish</button>
            </div>
          ) : (
            <form onSubmit={submit} className="relative mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Ismingiz" id="c-name">
                  <input id="c-name" value={name} onChange={(e) => setName(e.target.value)} className="field accent-ring" />
                </Field>
                <Field label="Email yoki telefon" id="c-contact">
                  <input id="c-contact" value={contact} onChange={(e) => setContact(e.target.value)} className="field accent-ring" />
                </Field>
              </div>
              <div>
                <p className="mb-2 text-sm text-zinc-400">Mavzu</p>
                <div className="flex flex-wrap gap-2">
                  {SUBJECTS.map((s) => (
                    <button type="button" key={s} onClick={() => setSubject(s)} data-active={subject === s} className="chip">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <Field label="Xabar" id="c-msg">
                <textarea id="c-msg" value={message} onChange={(e) => setMessage(e.target.value)} rows={5} placeholder="Xabaringizni yozing…" className="field accent-ring resize-none" />
              </Field>
              {error && (
                <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>
              )}
              <button type="submit" disabled={state === "sending"} className="btn-accent w-full py-3.5">
                {state === "sending" ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                Yuborish
              </button>
            </form>
          )}
        </section>

        {/* FAQ */}
        <section>
          <h2 className="mb-4 text-lg font-semibold">Ko&apos;p so&apos;raladigan savollar</h2>
          <div className="space-y-2">
            {faqs.map((f, i) => {
              const isOpen = open === i;
              return (
                <div key={f.q} className={`glass overflow-hidden rounded-2xl transition ${isOpen ? "!border-[color:var(--accent)]/40" : ""}`}>
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center gap-3 px-5 py-4 text-left text-sm font-medium"
                  >
                    <span className="flex-1">{f.q}</span>
                    <ChevronDown size={17} className={`shrink-0 text-zinc-500 transition duration-300 ${isOpen ? "rotate-180 text-white" : ""}`} />
                  </button>
                  <div className={`grid transition-all duration-300 ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                    <p className="overflow-hidden px-5 text-sm leading-relaxed text-zinc-400">
                      <span className="block pb-4">{f.a}</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </PageWrap>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm text-zinc-400">{label}</label>
      {children}
    </div>
  );
}
