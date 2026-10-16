"use client";

import { useEffect, useRef, useState } from "react";
import { AudioLines, Download, Eraser, FileAudio, Mic, Square, Wand2 } from "lucide-react";
import ModuleHeader, { PageWrap } from "@/components/ui/ModuleHeader";
import CopyButton from "@/components/ui/CopyButton";
import Dropzone from "@/components/ui/Dropzone";
import { Group, Pill } from "@/components/ui/Pills";
import { FormError } from "@/components/AuthShell";
import { Spinner } from "@/components/LoadingScreen";
import { modules } from "@/lib/modules";
import { aiBlob, aiJson, aiStream } from "@/lib/ai-client";
import { logActivity } from "@/lib/activity";
import { downloadBlob, formatBytes } from "@/lib/download";

const MAX_AUDIO = 25 * 1024 * 1024;
const MAX_TTS = 4000;
const ACCEPT = ".mp3,.mp4,.mpeg,.mpga,.m4a,.wav,.webm,.ogg,.oga,.flac,audio/*";

const LANGS = [
  { id: "", label: "Avto" },
  { id: "uz", label: "O'zbek" },
  { id: "ru", label: "Rus" },
  { id: "en", label: "Ingliz" },
] as const;

const VOICES = [
  { id: "nova", label: "Nova · ayol" },
  { id: "shimmer", label: "Shimmer · ayol, yumshoq" },
  { id: "coral", label: "Coral · ayol, iliq" },
  { id: "alloy", label: "Alloy · neytral" },
  { id: "echo", label: "Echo · erkak" },
  { id: "onyx", label: "Onyx · erkak, past" },
] as const;

type Tab = "stt" | "tts";

export default function AudioPage() {
  const [tab, setTab] = useState<Tab>("stt");

  return (
    <PageWrap>
      <ModuleHeader module={modules.audio} />
      <div className="mb-5">
        <Group label="">
          <Pill active={tab === "stt"} onClick={() => setTab("stt")}>
            Audio → Matn
          </Pill>
          <Pill active={tab === "tts"} onClick={() => setTab("tts")}>
            Matn → Audio
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

function PolishToggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-pink-500" />
      {label}
    </label>
  );
}

function ResultBox({ text, busy, placeholder, children }: { text: string; busy: string; placeholder: string; children?: React.ReactNode }) {
  return (
    <div className="glass relative flex flex-col overflow-hidden rounded-3xl p-5">
      <div aria-hidden className="accent-gradient absolute -right-16 -top-16 size-48 rounded-full opacity-20 blur-3xl" />
      <div className="relative mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-300">Natija</span>
        {busy && (
          <span className="flex items-center gap-2 text-xs text-zinc-400">
            <Spinner className="size-4" /> {busy}
          </span>
        )}
      </div>
      {text ? (
        <output className="animate-fade-in relative min-h-[280px] flex-1 overflow-auto whitespace-pre-wrap break-words rounded-[0.875rem] border border-white/10 bg-black/30 px-4 py-3 leading-relaxed">
          {text}
        </output>
      ) : (
        <div className="relative grid min-h-[280px] flex-1 place-items-center rounded-[0.875rem] border border-dashed border-white/10 px-4 text-center text-sm text-zinc-600">
          {busy || placeholder}
        </div>
      )}
      {children && <div className="relative mt-3 flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

// ---------------- Audio → Matn ----------------

function pickMime(): { mime: string; ext: string } {
  for (const [mime, ext] of [
    ["audio/webm;codecs=opus", "webm"],
    ["audio/webm", "webm"],
    ["audio/mp4", "mp4"],
  ]) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mime)) return { mime, ext };
  }
  return { mime: "", ext: "webm" };
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

function SpeechToText() {
  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState("");
  const [polish, setPolish] = useState(true);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      abort.current?.abort();
      recorder.current?.stream.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);

  function choose(f: File) {
    setError("");
    if (f.size > MAX_AUDIO) {
      setError("Audio fayl 25 MB dan oshmasin.");
      return;
    }
    setFile(f);
  }

  async function startRecording() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Brauzeringiz ovoz yozishni qo'llamaydi. Audio faylni yuklang.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Mikrofonga ruxsat berilmadi. Brauzer sozlamalaridan ruxsat bering.");
      return;
    }
    const { mime, ext } = pickMime();
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
      if (blob.size) choose(new File([blob], `yozuv-${Date.now()}.${ext}`, { type: blob.type }));
      setRecording(false);
    };
    recorder.current = rec;
    rec.start();
    setSeconds(0);
    setRecording(true);
  }

  async function run() {
    if (!file || busy) return;
    setError("");
    setText("");
    const controller = new AbortController();
    abort.current = controller;
    try {
      setBusy("Nutq matnga aylantirilmoqda…");
      const form = new FormData();
      form.append("file", file);
      form.append("language", language);
      const { text: raw } = await aiJson<{ text: string }>("/api/ai/transcribe", form, controller.signal);
      setText(raw);
      if (polish) {
        setBusy("AI matnni mukammallashtirmoqda…");
        try {
          await aiStream("/api/ai/polish", { text: raw, kind: "transcript" }, setText, controller.signal);
        } catch (e) {
          // Tahrir bo'lmasa ham asl matn qoladi
          if (controller.signal.aborted) return;
          setText(raw);
          setError(`Matn olindi, lekin tahrirlab bo'lmadi: ${(e as Error).message}`);
        }
      }
      logActivity("audio", `Audio → matn (${raw.length} belgi)`);
    } catch (e) {
      if (!controller.signal.aborted) setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <FormError message={error} />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass flex flex-col gap-4 rounded-3xl p-5">
          {recording ? (
            <button onClick={() => recorder.current?.stop()} className="chip w-full justify-center py-6 text-base">
              <span className="size-2.5 animate-pulse rounded-full bg-rose-500" /> {clock(seconds)} · <Square size={15} /> To&apos;xtatish
            </button>
          ) : (
            <>
              <Dropzone
                accept={ACCEPT}
                onFiles={([f]) => choose(f)}
                title="Audio faylni tashlang yoki tanlang"
                hint="MP3, M4A, WAV, OGG, WEBM, MP4 · 25 MB gacha"
                compact
                disabled={!!busy}
              />
              <button onClick={() => void startRecording()} disabled={!!busy} className="chip w-full justify-center py-3">
                <Mic size={16} /> Mikrofondan yozib olish
              </button>
            </>
          )}

          {file && !recording && (
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">
              <FileAudio size={18} className="shrink-0 text-pink-300" />
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              <span className="shrink-0 text-xs text-zinc-500">{formatBytes(file.size)}</span>
            </div>
          )}

          <Group label="Audio tili">
            {LANGS.map((l) => (
              <Pill key={l.id} active={language === l.id} onClick={() => setLanguage(l.id)}>
                {l.label}
              </Pill>
            ))}
          </Group>
          <PolishToggle checked={polish} onChange={setPolish} label="Matnni AI bilan mukammallashtirish (tinish belgilari, imlo, ortiqcha so'zlar)" />

          {busy ? (
            <button onClick={() => abort.current?.abort()} className="chip mt-auto w-full justify-center py-3">
              <Square size={15} /> To&apos;xtatish
            </button>
          ) : (
            <button onClick={() => void run()} disabled={!file || recording} className="btn-accent mt-auto w-full py-3">
              <AudioLines size={17} /> Matnga aylantirish
            </button>
          )}
        </div>

        <ResultBox text={text} busy={busy} placeholder="Audiodan olingan matn shu yerda paydo bo'ladi">
          {text && !busy && <CopyButton text={text} />}
        </ResultBox>
      </div>
    </>
  );
}

// ---------------- Matn → Audio ----------------

function TextToSpeech() {
  const [input, setInput] = useState("");
  const [voice, setVoice] = useState<(typeof VOICES)[number]["id"]>("nova");
  const [polish, setPolish] = useState(true);
  const [text, setText] = useState("");
  const [audio, setAudio] = useState<{ blob: Blob; url: string } | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const abort = useRef<AbortController | null>(null);

  useEffect(() => () => abort.current?.abort(), []);
  useEffect(() => () => {
    if (audio) URL.revokeObjectURL(audio.url);
  }, [audio]);

  async function run() {
    if (!input.trim() || busy) return;
    setError("");
    setText("");
    setAudio(null);
    const controller = new AbortController();
    abort.current = controller;
    try {
      let final = input.trim();
      if (polish) {
        setBusy("AI matnni mukammallashtirmoqda…");
        final = (await aiStream("/api/ai/polish", { text: final, kind: "speech" }, setText, controller.signal)).trim();
        if (final.length > MAX_TTS) throw new Error(`Tahrirlangan matn ${MAX_TTS} belgidan oshib ketdi. Matnni qisqartiring.`);
      } else {
        setText(final);
      }
      setBusy("Ovoz yaratilmoqda…");
      const blob = await aiBlob("/api/ai/speech", { text: final, voice }, controller.signal);
      setAudio({ blob, url: URL.createObjectURL(blob) });
      logActivity("audio", `Matn → audio (${final.length} belgi)`);
    } catch (e) {
      if (!controller.signal.aborted) setError((e as Error).message);
    } finally {
      setBusy("");
    }
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
              placeholder="Ovozga aylantiriladigan matn…"
              aria-label="Matn"
              className="field accent-ring min-h-[220px] w-full resize-y leading-relaxed"
            />
            <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
              <span className="tabular-nums">
                {input.length.toLocaleString()} / {MAX_TTS.toLocaleString()}
              </span>
              <button
                onClick={() => setInput("")}
                disabled={!input}
                className="flex items-center gap-1 rounded-lg px-2 py-1 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
              >
                <Eraser size={13} /> Tozalash
              </button>
            </div>
          </div>

          <Group label="Ovoz">
            {VOICES.map((v) => (
              <Pill key={v.id} active={voice === v.id} onClick={() => setVoice(v.id)}>
                {v.label}
              </Pill>
            ))}
          </Group>
          <PolishToggle checked={polish} onChange={setPolish} label="Avval matnni AI bilan mukammallashtirish" />

          {busy ? (
            <button onClick={() => abort.current?.abort()} className="chip mt-auto w-full justify-center py-3">
              <Square size={15} /> To&apos;xtatish
            </button>
          ) : (
            <button onClick={() => void run()} disabled={!input.trim()} className="btn-accent mt-auto w-full py-3">
              <Wand2 size={17} /> Audio yaratish
            </button>
          )}
        </div>

        <ResultBox text={text} busy={busy} placeholder="Tayyor matn va audio shu yerda paydo bo'ladi">
          {audio && (
            <>
              <audio src={audio.url} controls autoPlay className="w-full" />
              <button onClick={() => downloadBlob(audio.blob, `studyra-audio-${Date.now()}.mp3`)} className="chip">
                <Download size={15} /> MP3 yuklab olish
              </button>
            </>
          )}
          {text && !busy && <CopyButton text={text} />}
        </ResultBox>
      </div>
    </>
  );
}
