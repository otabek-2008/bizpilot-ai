"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Download, Eraser, Mic, Pause, Play, Square, Volume2 } from "lucide-react";
import ModuleHeader, { PageWrap } from "@/components/ui/ModuleHeader";
import CopyButton from "@/components/ui/CopyButton";
import { Group, Pill } from "@/components/ui/Pills";
import { FormError } from "@/components/AuthShell";
import { modules } from "@/lib/modules";
import { logActivity } from "@/lib/activity";
import { downloadBlob } from "@/lib/download";
import { DICT_LANGS, type DictLang, appendDictation, splitForSpeech } from "@/lib/dictation";

// Hammasi brauzerning o'zida ishlaydi (Web Speech API) — API kalit va AI kerak emas.

const MAX_TTS = 20000;
const RATES = [0.75, 1, 1.25, 1.5] as const;

const bcp47 = (lang: DictLang) => DICT_LANGS.find((l) => l.id === lang)!.bcp47;

type Tab = "stt" | "tts";

// Brauzer imkoniyatini tekshirish: serverda null (hali noma'lum), brauzerda true/false
const noSubscribe = () => () => {};
const useBrowserCheck = (check: () => boolean) => useSyncExternalStore<boolean | null>(noSubscribe, check, () => null);

export default function AudioPage() {
  const [tab, setTab] = useState<Tab>("stt");

  return (
    <PageWrap>
      <ModuleHeader module={modules.audio} />
      <div className="mb-5">
        <Group label="">
          <Pill active={tab === "stt"} onClick={() => setTab("stt")}>
            Ovoz → Matn
          </Pill>
          <Pill active={tab === "tts"} onClick={() => setTab("tts")}>
            Matn → Ovoz
          </Pill>
        </Group>
      </div>
      {/* Ikkala bo'lim ham ochiq turadi — tab almashganda natija yo'qolmaydi */}
      <div hidden={tab !== "stt"}>
        <SpeechToText />
      </div>
      <div hidden={tab !== "tts"}>
        <TextToSpeech />
      </div>
    </PageWrap>
  );
}

function LangPills({ value, onChange, disabled }: { value: DictLang; onChange: (l: DictLang) => void; disabled?: boolean }) {
  return (
    <Group label="Til">
      {DICT_LANGS.map((l) => (
        <Pill key={l.id} active={value === l.id} onClick={() => !disabled && onChange(l.id)}>
          {l.label}
        </Pill>
      ))}
    </Group>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-sm text-amber-100/90">{children}</p>;
}

// ---------------- Ovoz → Matn ----------------

// Web Speech API turlari TypeScript DOM kutubxonasida yo'q — kerakli qismi.
type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const RECOGNITION_ERRORS: Record<string, string> = {
  "not-allowed": "Mikrofonga ruxsat berilmadi. Brauzer sozlamalaridan ruxsat bering.",
  "service-not-allowed": "Brauzer ovozni tanish xizmatini o'chirib qo'ygan. Google Chrome yoki Microsoft Edge'da oching.",
  "audio-capture": "Mikrofon topilmadi. Mikrofon ulanganini tekshiring.",
  network: "Internet aloqasi yo'q — ovozni tanish uchun internet kerak.",
  "language-not-supported": "Brauzeringiz bu tilni tanimaydi. Boshqa til yoki Google Chrome'ni sinab ko'ring.",
};

const COMMAND_HINT: Record<DictLang, string> = {
  uz: "«nuqta», «vergul», «so'roq belgisi», «undov belgisi», «ikki nuqta», «tire», «yangi qator», «yangi xatboshi»",
  ru: "«точка», «запятая», «вопросительный знак», «восклицательный знак», «двоеточие», «тире», «новая строка», «новый абзац»",
  en: "“period”, “comma”, “question mark”, “exclamation mark”, “colon”, “dash”, “new line”, “new paragraph”",
};

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

function SpeechToText() {
  const supported = useBrowserCheck(() => !!recognitionCtor());
  const [lang, setLang] = useState<DictLang>("uz");
  const [commands, setCommands] = useState(true);
  const [text, setText] = useState("");
  const [interim, setInterim] = useState("");
  const [listening, setListening] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const rec = useRef<Recognition | null>(null);
  const wanted = useRef(false); // foydalanuvchi to'xtatmaguncha qayta ulanadi
  const settings = useRef({ lang, commands });
  useEffect(() => {
    settings.current = { lang, commands };
  }, [lang, commands]);

  useEffect(
    () => () => {
      wanted.current = false;
      rec.current?.abort();
    },
    [],
  );
  useEffect(() => {
    if (!listening) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [listening]);

  function start() {
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    setError("");
    const r = new Ctor();
    r.lang = bcp47(lang);
    // Android Chrome uzluksiz rejimda natijalarni takrorlaydi — u yerda har gapdan keyin qayta ulanadi
    r.continuous = !/Android/i.test(navigator.userAgent);
    r.interimResults = true;
    r.onresult = (e) => {
      let pending = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) {
          const { lang: l, commands: c } = settings.current;
          setText((prev) => appendDictation(prev, res[0].transcript, l, c));
        } else {
          pending += res[0].transcript;
        }
      }
      setInterim(pending);
    };
    r.onerror = (e) => {
      // "no-speech" va "aborted" — oddiy holat, qayta ulanish davom etadi
      if (e.error === "no-speech" || e.error === "aborted") return;
      wanted.current = false;
      setError(RECOGNITION_ERRORS[e.error] ?? "Ovozni tanishda xatolik yuz berdi. Qayta urinib ko'ring.");
    };
    r.onend = () => {
      setInterim("");
      if (wanted.current) {
        try {
          r.start();
          return;
        } catch {
          // qayta ulanib bo'lmadi — to'xtaymiz
        }
      }
      wanted.current = false;
      setListening(false);
    };
    rec.current = r;
    wanted.current = true;
    try {
      r.start();
    } catch {
      wanted.current = false;
      setError("Ovoz yozishni boshlab bo'lmadi. Sahifani yangilab qayta urinib ko'ring.");
      return;
    }
    setSeconds(0);
    setListening(true);
  }

  function stop() {
    wanted.current = false;
    rec.current?.stop();
    if (text) logActivity("audio", `Ovoz → matn (${text.length} belgi)`);
  }

  if (supported === false) {
    return (
      <Notice>
        Brauzeringiz ovozli yozishni qo&apos;llamaydi. Saytni <b>Google Chrome</b>, <b>Microsoft Edge</b> yoki <b>Safari</b>&apos;da oching.
      </Notice>
    );
  }

  return (
    <>
      <FormError message={error} />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass flex flex-col gap-4 rounded-3xl p-5">
          {listening ? (
            <button onClick={stop} className="chip w-full justify-center py-6 text-base">
              <span className="size-2.5 animate-pulse rounded-full bg-rose-500" /> {clock(seconds)} · <Square size={15} /> To&apos;xtatish
            </button>
          ) : (
            <button onClick={start} disabled={!supported} className="btn-accent w-full py-6 text-base">
              <Mic size={18} /> Gapirishni boshlash
            </button>
          )}

          <LangPills value={lang} onChange={setLang} disabled={listening} />

          <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={commands}
              onChange={(e) => setCommands(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-pink-500"
            />
            <span>
              Tinish belgilarini ovoz bilan qo&apos;yish
              <span className="mt-1 block text-xs text-zinc-500">Ayting: {COMMAND_HINT[lang]}</span>
            </span>
          </label>

          <p className="mt-auto text-xs leading-relaxed text-zinc-500">
            Mikrofonga aniq va o&apos;rtacha tezlikda gapiring. Ovozni brauzer taniydi, shuning uchun internet kerak; eng yaxshi natija —
            Google Chrome&apos;da.
          </p>
        </div>

        <div className="glass relative flex flex-col overflow-hidden rounded-3xl p-5">
          <div aria-hidden className="accent-gradient absolute -right-16 -top-16 size-48 rounded-full opacity-20 blur-3xl" />
          <div className="relative mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-300">Matn</span>
            <span className="text-xs tabular-nums text-zinc-500">{text.length.toLocaleString()} belgi</span>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Gapirgan so'zlaringiz shu yerda yoziladi. Matnni qo'lda tahrirlash ham mumkin."
            aria-label="Olingan matn"
            className="field accent-ring relative min-h-[280px] w-full flex-1 resize-y leading-relaxed"
          />
          {interim && <p className="relative mt-2 text-sm italic text-zinc-500">{interim}…</p>}
          <div className="relative mt-3 flex flex-wrap items-center gap-2">
            <CopyButton text={text} />
            <button
              onClick={() => downloadBlob(new Blob([text], { type: "text/plain;charset=utf-8" }), `studyra-matn-${Date.now()}.txt`)}
              disabled={!text}
              className="chip disabled:opacity-40"
            >
              <Download size={15} /> TXT
            </button>
            <button onClick={() => setText("")} disabled={!text || listening} className="chip disabled:opacity-40">
              <Eraser size={15} /> Tozalash
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------- Matn → Ovoz ----------------

function useVoices(supported: boolean | null): SpeechSynthesisVoice[] | null {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[] | null>(null);
  useEffect(() => {
    if (!supported) return;
    const load = () => setVoices(speechSynthesis.getVoices());
    speechSynthesis.addEventListener("voiceschanged", load);
    // Ba'zi brauzerlar ovozlarni kechikib beradi va hodisa chiqarmaydi
    const timers = [setTimeout(load, 0), setTimeout(load, 1500)];
    return () => {
      speechSynthesis.removeEventListener("voiceschanged", load);
      timers.forEach(clearTimeout);
    };
  }, [supported]);
  return voices;
}

const voiceLabel = (v: SpeechSynthesisVoice) => `${v.name.replace(/^(Microsoft|Google)\s+/, "").replace(/\s*\(.*\)$/, "")} · ${v.lang}`;

function TextToSpeech() {
  const supported = useBrowserCheck(() => typeof speechSynthesis !== "undefined");
  const voices = useVoices(supported);
  const [input, setInput] = useState("");
  const [lang, setLang] = useState<DictLang>("uz");
  const [voiceURI, setVoiceURI] = useState("");
  const [rate, setRate] = useState<number>(1);
  const [chunks, setChunks] = useState<string[]>([]);
  const [index, setIndex] = useState(-1); // o'qilayotgan bo'lak; -1 — o'qilmayapti
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState("");
  const session = useRef(0); // eski o'qishdan kelgan hodisalarni e'tiborsiz qoldirish uchun
  const current = useRef<SpeechSynthesisUtterance | null>(null); // Chrome'da GC so'zlashuvni o'chirib qo'ymasin

  const langOf = (v: SpeechSynthesisVoice) => v.lang.toLowerCase().slice(0, 2);
  const matching = (voices ?? []).filter((v) => langOf(v) === lang);
  // O'zbek ovozi bo'lmasa, lotin harflarini o'zbekchaga yaqin o'qiydigan turk, keyin indonez ovozi birinchi turadi
  const near = lang === "uz" ? ["tr", "id"].flatMap((l) => (voices ?? []).filter((v) => langOf(v) === l)) : [];
  const list = matching.length ? matching : [...near, ...(voices ?? []).filter((v) => !near.includes(v))];
  const voice = list.find((v) => v.voiceURI === voiceURI) ?? (matching.length ? list.find((v) => v.default) : undefined) ?? list[0];
  const speaking = index >= 0;

  useEffect(
    () => () => {
      session.current++;
      if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    },
    [],
  );

  function speakFrom(parts: string[], i: number, id: number) {
    if (id !== session.current) return;
    if (i >= parts.length) {
      setIndex(-1);
      setPaused(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(parts[i]);
    if (voice) u.voice = voice;
    u.lang = voice?.lang ?? bcp47(lang);
    u.rate = rate;
    u.onend = () => speakFrom(parts, i + 1, id);
    u.onerror = (e) => {
      if (id !== session.current || e.error === "interrupted" || e.error === "canceled") return;
      setError(
        e.error === "audio-hardware" || e.error === "audio-busy"
          ? "Qurilmada ovoz chiqarib bo'lmadi. Karnay yoki quloqchin ulanganini tekshiring."
          : "Ovoz chiqarishda xatolik yuz berdi. Boshqa ovozni tanlab ko'ring.",
      );
      setIndex(-1);
    };
    current.current = u;
    setIndex(i);
    speechSynthesis.speak(u);
  }

  function play() {
    const text = input.trim();
    if (!text) return;
    setError("");
    speechSynthesis.cancel();
    const parts = splitForSpeech(text);
    const id = ++session.current;
    setChunks(parts);
    setPaused(false);
    speakFrom(parts, 0, id);
    logActivity("audio", `Matn → ovoz (${text.length} belgi)`);
  }

  function stop() {
    session.current++;
    speechSynthesis.cancel();
    setIndex(-1);
    setPaused(false);
  }

  function togglePause() {
    if (paused) speechSynthesis.resume();
    else speechSynthesis.pause();
    setPaused(!paused);
  }

  if (supported === false) {
    return <Notice>Brauzeringiz matnni ovoz chiqarib o&apos;qishni qo&apos;llamaydi. Google Chrome yoki Microsoft Edge&apos;da oching.</Notice>;
  }

  return (
    <>
      <FormError message={error} />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass flex flex-col gap-4 rounded-3xl p-5">
          <div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, MAX_TTS))}
              placeholder="Ovoz chiqarib o'qiladigan matn…"
              aria-label="Matn"
              className="field accent-ring min-h-[220px] w-full resize-y leading-relaxed"
            />
            <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
              <span className="tabular-nums">
                {input.length.toLocaleString()} / {MAX_TTS.toLocaleString()}
              </span>
              <button
                onClick={() => setInput("")}
                disabled={!input || speaking}
                className="flex items-center gap-1 rounded-lg px-2 py-1 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
              >
                <Eraser size={13} /> Tozalash
              </button>
            </div>
          </div>

          <LangPills value={lang} onChange={(l) => {
              setLang(l);
              setVoiceURI("");
            }} disabled={speaking} />

          {voices && !matching.length && (
            <Notice>
              Qurilmangizda {DICT_LANGS.find((l) => l.id === lang)!.label.toLowerCase()} tilidagi ovoz topilmadi, matn boshqa ovozda
              o&apos;qiladi.{lang === "uz" && " O'zbek ovozlari (Madina, Sardor) Microsoft Edge brauzerida bor."}
            </Notice>
          )}

          {list.length > 0 && (
            <label className="block">
              <span className="mb-2 block text-sm text-zinc-400">Ovoz</span>
              <select
                value={voice?.voiceURI ?? ""}
                onChange={(e) => setVoiceURI(e.target.value)}
                disabled={speaking}
                className="field accent-ring w-full"
              >
                {list.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {voiceLabel(v)}
                  </option>
                ))}
              </select>
            </label>
          )}

          <Group label="Tezlik">
            {RATES.map((r) => (
              <Pill key={r} active={rate === r} onClick={() => !speaking && setRate(r)}>
                {r}×
              </Pill>
            ))}
          </Group>

          {speaking ? (
            <div className="mt-auto grid grid-cols-2 gap-2">
              <button onClick={togglePause} className="chip justify-center py-3">
                {paused ? <Play size={15} /> : <Pause size={15} />} {paused ? "Davom etish" : "Pauza"}
              </button>
              <button onClick={stop} className="chip justify-center py-3">
                <Square size={15} /> To&apos;xtatish
              </button>
            </div>
          ) : (
            <button onClick={play} disabled={!input.trim() || !voices} className="btn-accent mt-auto w-full py-3">
              <Volume2 size={17} /> Tinglash
            </button>
          )}
        </div>

        <div className="glass relative flex flex-col overflow-hidden rounded-3xl p-5">
          <div aria-hidden className="accent-gradient absolute -right-16 -top-16 size-48 rounded-full opacity-20 blur-3xl" />
          <div className="relative mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-300">O&apos;qilmoqda</span>
            {speaking && (
              <span className="text-xs tabular-nums text-zinc-400">
                {index + 1} / {chunks.length}
              </span>
            )}
          </div>
          {speaking ? (
            <div className="relative min-h-[280px] flex-1 overflow-auto rounded-[0.875rem] border border-white/10 bg-black/30 px-4 py-3 leading-relaxed">
              {chunks.map((c, i) => (
                <span key={i} className={i === index ? "rounded bg-pink-500/25 text-white" : i < index ? "text-zinc-500" : "text-zinc-300"}>
                  {c}{" "}
                </span>
              ))}
            </div>
          ) : (
            <div className="relative grid min-h-[280px] flex-1 place-items-center rounded-[0.875rem] border border-dashed border-white/10 px-4 text-center text-sm text-zinc-600">
              «Tinglash»ni bosing — o&apos;qilayotgan gap shu yerda belgilanib boradi
            </div>
          )}
        </div>
      </div>
    </>
  );
}
