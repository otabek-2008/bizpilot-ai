"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Download, Eraser, FileAudio, FileText, Mic, Pause, Play, Square, Upload, Volume2 } from "lucide-react";
import ModuleHeader, { PageWrap } from "@/components/ui/ModuleHeader";
import CopyButton from "@/components/ui/CopyButton";
import { Group, Pill } from "@/components/ui/Pills";
import { FormError } from "@/components/AuthShell";
import { Spinner } from "@/components/LoadingScreen";
import { modules } from "@/lib/modules";
import { logActivity } from "@/lib/activity";
import { downloadBlob } from "@/lib/download";
import { supabase } from "@/lib/supabase";
import { DICT_LANGS, type DictLang, appendDictation, splitForSpeech } from "@/lib/dictation";
import { VOSK_MODELS, type TranscribeStage, transcribeFile } from "@/lib/transcribe";

// Hammasi brauzerning o'zida ishlaydi (Web Speech API, Vosk) — API kalit kerak emas. Faqat MP3 serverda (eSpeak NG).

const MAX_TTS = 20000;
const MAX_AUDIO_MB = 200;
const MAX_TEXT_FILE_MB = 20;
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
  const [fileJob, setFileJob] = useState<{ name: string; stage: TranscribeStage; ratio: number } | null>(null);
  const fileAbort = useRef<AbortController | null>(null);
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
      fileAbort.current?.abort();
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

  async function fromFile(file: File | undefined) {
    if (!file || fileJob) return;
    if (file.size > MAX_AUDIO_MB * 1024 * 1024) return setError(`Fayl ${MAX_AUDIO_MB} MB dan oshmasin.`);
    setError("");
    const controller = new AbortController();
    fileAbort.current = controller;
    setFileJob({ name: file.name, stage: "decode", ratio: 0 });
    try {
      const segments = await transcribeFile(file, lang, (stage, ratio) => setFileJob({ name: file.name, stage, ratio }), controller.signal);
      if (!segments.length) throw new Error("Faylda nutq topilmadi. Til to'g'ri tanlanganini tekshiring.");
      // Model tinish belgisi qo'ymaydi — har bir pauza gap oxiri deb olinadi
      setText((prev) => {
        let out = prev.trim() ? prev.replace(/\s*$/, "\n\n") : "";
        for (const seg of segments) {
          out = appendDictation(out, seg, lang, commands);
          if (!/[.!?:;,]\s*$|\n$/.test(out)) out += ".";
        }
        return out;
      });
      logActivity("audio", `Audio fayl → matn: ${file.name}`);
    } catch (e) {
      if (!controller.signal.aborted) setError((e as Error).message);
    } finally {
      setFileJob(null);
    }
  }

  const busy = listening || !!fileJob;

  return (
    <>
      <FormError message={error} />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass flex flex-col gap-4 rounded-3xl p-5">
          {supported === false && (
            <Notice>
              Brauzeringiz mikrofondan yozishni qo&apos;llamaydi (Google Chrome, Microsoft Edge yoki Safari kerak), lekin audio faylni yuklab
              matnga aylantirishingiz mumkin.
            </Notice>
          )}
          {listening ? (
            <button onClick={stop} className="chip w-full justify-center py-6 text-base">
              <span className="size-2.5 animate-pulse rounded-full bg-rose-500" /> {clock(seconds)} · <Square size={15} /> To&apos;xtatish
            </button>
          ) : (
            <button onClick={start} disabled={!supported || !!fileJob} className="btn-accent w-full py-6 text-base">
              <Mic size={18} /> Gapirishni boshlash
            </button>
          )}

          {fileJob ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm text-zinc-300">
                <Spinner className="size-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{fileJob.name}</span>
                <button onClick={() => fileAbort.current?.abort()} className="chip shrink-0 px-3 py-1 text-xs">
                  Bekor qilish
                </button>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`accent-gradient h-full rounded-full transition-[width] ${fileJob.stage === "model" ? "w-1/3 animate-pulse" : ""}`}
                  style={fileJob.stage === "model" ? undefined : { width: `${Math.round((fileJob.stage === "decode" ? 0 : fileJob.ratio) * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                {fileJob.stage === "decode"
                  ? "Fayl o'qilmoqda…"
                  : fileJob.stage === "model"
                    ? `Nutq modeli yuklanmoqda (~${VOSK_MODELS[lang].mb} MB, faqat birinchi marta)…`
                    : `Matnga aylantirilmoqda… ${Math.round(fileJob.ratio * 100)}%`}
              </p>
            </div>
          ) : (
            <label className={`chip w-full justify-center py-3 ${listening ? "pointer-events-none opacity-40" : "cursor-pointer"}`}>
              <Upload size={16} /> Audio yoki video fayl yuklash
              <input
                type="file"
                accept="audio/*,video/*,.mp3,.wav,.m4a,.ogg,.oga,.opus,.webm,.mp4,.aac,.flac"
                className="sr-only"
                disabled={listening}
                onChange={(e) => {
                  void fromFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
          )}

          <LangPills value={lang} onChange={setLang} disabled={busy} />

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
            Google Chrome&apos;da. Yuklangan fayl serverga yuborilmaydi — qurilmangizning o&apos;zida matnga aylantiriladi.
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
            placeholder="Gapirgan so'zlaringiz yoki fayldagi nutq shu yerda yoziladi. Matnni qo'lda tahrirlash ham mumkin."
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
            <button onClick={() => setText("")} disabled={!text || busy} className="chip disabled:opacity-40">
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
  const [mp3, setMp3] = useState<{ blob: Blob; url: string } | null>(null);
  const [making, setMaking] = useState(false);
  const [reading, setReading] = useState(false);
  const mp3Abort = useRef<AbortController | null>(null);
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
      mp3Abort.current?.abort();
      if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    },
    [],
  );
  useEffect(() => () => {
    if (mp3) URL.revokeObjectURL(mp3.url);
  }, [mp3]);

  // MP3 serverda yaratiladi (eSpeak NG) — brauzer ovozlarini faylga yozib bo'lmaydi
  async function makeMp3() {
    const text = input.trim();
    if (!text || making) return;
    setError("");
    setMp3(null);
    setMaking(true);
    const controller = new AbortController();
    mp3Abort.current = controller;
    try {
      const {
        data: { session: auth },
      } = await supabase.auth.getSession();
      if (!auth) throw new Error("Sessiya tugagan. Qayta kiring.");
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.access_token}` },
        body: JSON.stringify({ text, lang, rate }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Audio yaratib bo'lmadi.");
      const blob = await res.blob();
      setMp3({ blob, url: URL.createObjectURL(blob) });
      logActivity("audio", `Matn → MP3 (${text.length} belgi)`);
    } catch (e) {
      if (!controller.signal.aborted) setError((e as Error).message);
    } finally {
      setMaking(false);
    }
  }

  async function fromFile(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_TEXT_FILE_MB * 1024 * 1024) return setError(`Fayl ${MAX_TEXT_FILE_MB} MB dan oshmasin.`);
    setError("");
    setReading(true);
    try {
      const text = (await readTextFile(file)).trim();
      if (!text) throw new Error("Faylda matn topilmadi.");
      if (text.length > MAX_TTS) setError(`Fayldagi matn uzun — dastlabki ${MAX_TTS.toLocaleString()} belgisi olindi.`);
      setInput(text.slice(0, MAX_TTS));
      setMp3(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setReading(false);
    }
  }

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

  return (
    <>
      <FormError message={error} />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass flex flex-col gap-4 rounded-3xl p-5">
          <div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, MAX_TTS))}
              placeholder="Ovoz chiqarib o'qiladigan matnni yozing yoki fayldan yuklang…"
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

          <label className={`chip w-full justify-center py-3 ${speaking || reading ? "pointer-events-none opacity-40" : "cursor-pointer"}`}>
            {reading ? <Spinner className="size-4" /> : <FileText size={16} />} Fayldan yuklash (TXT, DOCX, PDF)
            <input
              type="file"
              accept=".txt,.md,.docx,.pdf,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="sr-only"
              disabled={speaking || reading}
              onChange={(e) => {
                void fromFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>

          <LangPills
            value={lang}
            onChange={(l) => {
              setLang(l);
              setVoiceURI("");
            }}
            disabled={speaking}
          />

          {supported === false && (
            <Notice>Brauzeringiz matnni ovoz chiqarib o&apos;qishni qo&apos;llamaydi, lekin MP3 faylni yaratib tinglashingiz mumkin.</Notice>
          )}
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
            <div className="mt-auto grid grid-cols-2 gap-2">
              <button onClick={play} disabled={!input.trim() || !voices} className="btn-accent py-3">
                <Volume2 size={17} /> Tinglash
              </button>
              {making ? (
                <button onClick={() => mp3Abort.current?.abort()} className="chip justify-center py-3">
                  <Spinner className="size-4" /> Bekor qilish
                </button>
              ) : (
                <button onClick={() => void makeMp3()} disabled={!input.trim()} className="chip justify-center py-3 disabled:opacity-40">
                  <FileAudio size={16} /> MP3 yaratish
                </button>
              )}
            </div>
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
              {making ? "MP3 tayyorlanmoqda…" : "«Tinglash»ni bosing — o'qilayotgan gap shu yerda belgilanib boradi"}
            </div>
          )}
          {mp3 && (
            <div className="relative mt-3 flex flex-col gap-2">
              <audio src={mp3.url} controls className="w-full" />
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => downloadBlob(mp3.blob, `studyra-audio-${Date.now()}.mp3`)} className="chip">
                  <Download size={15} /> MP3 yuklab olish
                </button>
                <span className="text-xs text-zinc-500">MP3 alohida, standart ovozda yaratiladi.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/** TXT/MD, DOCX yoki PDF fayldan oddiy matn. */
async function readTextFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    try {
      return (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value;
    } catch {
      throw new Error("Word faylni o'qib bo'lmadi. Fayl .docx formatida ekanini tekshiring.");
    }
  }
  if (name.endsWith(".pdf")) {
    const { extractPdf } = await import("@/lib/doc-convert");
    const { pages } = await extractPdf(file);
    return pages.map((p) => p.lines.map((l) => l.text).join("\n")).join("\n\n");
  }
  if (name.endsWith(".doc")) throw new Error("Eski .doc formati qo'llanmaydi — faylni .docx qilib saqlang.");
  return file.text();
}
