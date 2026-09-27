import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Check,
  Globe2,
  Megaphone,
  PenLine,
  ShieldCheck,
  Sparkles,
  Timer,
  Wallet,
  Wand2,
} from "lucide-react";
import Logo from "@/components/Logo";
import analytics from "@/public/images/analytics.webp";
import city from "@/public/images/city.webp";
import meeting from "@/public/images/meeting.webp";

const features = [
  {
    icon: Briefcase,
    title: "Biznes reja",
    desc: "Xulosa, missiya, bozor tahlili, raqobatchilar, SWOT va keyingi qadamlar — to'liq tuzilmada.",
    className: "md:col-span-2",
    accent: "from-brand-500/30",
  },
  {
    icon: Megaphone,
    title: "Marketing strategiyasi",
    desc: "Kanallar, ustuvorliklar, kampaniyalar va KPI'lar.",
    className: "",
    accent: "from-fuchsia-500/25",
  },
  {
    icon: Wallet,
    title: "Moliyaviy reja",
    desc: "Boshlang'ich va oylik xarajatlar, 3 yillik prognoz, o'zini qoplash nuqtasi.",
    className: "",
    accent: "from-emerald-500/25",
  },
  {
    icon: Timer,
    title: "Daqiqalar ichida",
    desc: "Haftalab yoziladigan hujjatlar 1–2 daqiqada tayyor. Keyin ularni o'zingizga moslab takomillashtirasiz.",
    className: "md:col-span-2",
    accent: "from-cyan-500/25",
  },
];

const steps = [
  {
    icon: PenLine,
    title: "G'oyani yozing",
    desc: "Biznes g'oyangiz, auditoriya, byudjet va joylashuvni kiriting.",
  },
  {
    icon: Wand2,
    title: "AI tahlil qiladi",
    desc: "Claude AI ma'lumotlaringiz asosida uchta hujjatni tayyorlaydi.",
  },
  {
    icon: Sparkles,
    title: "Natijadan foydalaning",
    desc: "Biznes reja, marketing va moliya bo'limlari loyihangizda saqlanadi.",
  },
];

export default function HomePage() {
  return (
    <main className="relative overflow-hidden bg-ink text-white">
      {/* NAV */}
      <header className="fixed inset-x-0 top-0 z-50 px-4 sm:px-6">
        <div className="glass mx-auto mt-4 flex max-w-6xl items-center justify-between rounded-2xl px-4 py-2.5 sm:px-5">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm text-zinc-400 md:flex">
            <a href="#imkoniyatlar" className="transition hover:text-white">Imkoniyatlar</a>
            <a href="#qanday" className="transition hover:text-white">Qanday ishlaydi</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-xl px-4 py-2 text-sm text-zinc-300 transition hover:text-white">
              Kirish
            </Link>
            <Link href="/register" className="btn-primary !px-4 !py-2 text-sm">
              Boshlash
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative isolate pt-40 pb-24 sm:pt-48">
        <Image
          src={analytics}
          alt=""
          fill
          priority
          placeholder="blur"
          sizes="100vw"
          className="-z-20 object-cover opacity-[0.18] [mask-image:linear-gradient(to_bottom,#000_10%,transparent_85%)]"
        />
        <div aria-hidden className="absolute inset-0 -z-10">
          <div className="absolute -top-32 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-brand-600/35 blur-[140px] animate-aurora" />
          <div className="absolute top-40 right-[-10%] h-[380px] w-[480px] rounded-full bg-cyan-500/15 blur-[120px] animate-aurora [animation-delay:-8s]" />
          <div className="bg-grid absolute inset-0" />
          <div className="noise absolute inset-0" />
          <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-b from-transparent to-ink" />
        </div>

        <div className="mx-auto max-w-6xl px-6 text-center">
          <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-zinc-300 backdrop-blur">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-brand-400" />
            </span>
            Claude AI bilan ishlaydi
          </div>

          <h1 className="animate-fade-up mx-auto mt-8 max-w-4xl text-5xl font-semibold leading-[1.05] tracking-tight [animation-delay:80ms] sm:text-7xl">
            G&apos;oyangizni <span className="text-gradient">tayyor biznes rejaga</span> aylantiring
          </h1>

          <p className="animate-fade-up mx-auto mt-7 max-w-2xl text-lg text-zinc-400 [animation-delay:160ms] sm:text-xl">
            BizPilot AI biznes reja, marketing strategiyasi va moliyaviy prognozni bir necha
            daqiqada tayyorlaydi — tadbirkorlar va startaplar uchun.
          </p>

          <div className="animate-fade-up mt-10 flex flex-col items-center justify-center gap-3 [animation-delay:240ms] sm:flex-row">
            <Link href="/register" className="btn-primary px-7 py-3.5 text-base">
              Bepul boshlash <ArrowRight size={18} />
            </Link>
            <Link href="/login" className="btn-ghost px-7 py-3.5 text-base">
              Hisobga kirish
            </Link>
          </div>

          <ul className="animate-fade-up mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-zinc-500 [animation-delay:320ms]">
            {["Karta talab qilinmaydi", "O'zbek tilida", "3 ta hujjat bir vaqtda"].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <Check size={15} className="text-brand-400" /> {t}
              </li>
            ))}
          </ul>

          {/* PRODUCT MOCKUP */}
          <div className="animate-fade-up relative mx-auto mt-20 max-w-5xl [animation-delay:400ms]">
            <div aria-hidden className="absolute -inset-x-10 -top-10 bottom-0 -z-10 rounded-[3rem] bg-gradient-to-b from-brand-500/25 to-transparent blur-3xl" />
            <ProductMockup />
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="imkoniyatlar" className="relative mx-auto max-w-6xl scroll-mt-28 px-6 py-24">
        <SectionHeading
          eyebrow="Imkoniyatlar"
          title="Startapni boshlash uchun kerakli hammasi"
          desc="Bitta g'oyadan uchta professional hujjat. Har biri alohida bo'limda, qulay ko'rinishda."
        />

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className={`glass glass-hover group relative overflow-hidden rounded-3xl p-7 ${f.className}`}
              >
                <div aria-hidden className={`absolute -right-16 -top-16 size-48 rounded-full bg-gradient-to-br ${f.accent} to-transparent blur-2xl transition group-hover:scale-125`} />
                <div className="grid size-12 place-items-center rounded-2xl border border-white/10 bg-white/5">
                  <Icon size={22} className="text-brand-300" />
                </div>
                <h3 className="mt-6 text-xl font-semibold">{f.title}</h3>
                <p className="mt-2 max-w-md text-zinc-400">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* SHOWCASE */}
      <section className="relative mx-auto max-w-6xl px-6 py-12">
        <div className="glass grid overflow-hidden rounded-[2rem] lg:grid-cols-2">
          <div className="relative min-h-[320px]">
            <Image
              src={city}
              alt="Zamonaviy biznes markazi binolari"
              fill
              placeholder="blur"
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-indigo-900/20 lg:bg-gradient-to-r lg:from-transparent lg:via-ink/20 lg:to-ink" />
          </div>
          <div className="p-8 sm:p-12">
            <p className="text-sm font-medium text-brand-400">Nega BizPilot AI?</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Rejalashtirishga emas, biznesga vaqt ajrating
            </h2>
            <ul className="mt-8 space-y-5">
              {[
                { icon: Globe2, t: "Mahalliy kontekst", d: "Joylashuv va byudjetingizni hisobga olib tahlil qiladi." },
                { icon: ShieldCheck, t: "Ma'lumotlaringiz himoyada", d: "Har bir loyiha faqat sizning hisobingizga tegishli." },
                { icon: Sparkles, t: "Tuzilgan natija", d: "SWOT, jadval va ro'yxatlar — o'qish va taqdim etish oson." },
              ].map(({ icon: Icon, t, d }) => (
                <li key={t} className="flex gap-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-500/15 text-brand-300">
                    <Icon size={18} />
                  </span>
                  <div>
                    <p className="font-medium">{t}</p>
                    <p className="text-sm text-zinc-400">{d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="qanday" className="relative mx-auto max-w-6xl scroll-mt-28 px-6 py-24">
        <SectionHeading
          eyebrow="Qanday ishlaydi"
          title="Uch qadamda tayyor"
          desc="Ro'yxatdan o'ting, loyiha yarating va g'oyangizni yozing — qolganini AI bajaradi."
        />
        <div className="relative mt-14 grid gap-4 md:grid-cols-3">
          <div aria-hidden className="absolute left-0 right-0 top-12 hidden h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent md:block" />
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.title} className="glass relative rounded-3xl p-7">
                <div className="flex items-center justify-between">
                  <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 shadow-[0_10px_30px_-10px_rgb(139_92_246/0.9)]">
                    <Icon size={20} />
                  </span>
                  <span className="font-mono text-sm text-zinc-600">0{i + 1}</span>
                </div>
                <h3 className="mt-6 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-zinc-400">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="relative isolate overflow-hidden rounded-[2rem] border border-white/10 px-8 py-20 text-center sm:px-16">
          <Image
            src={meeting}
            alt=""
            fill
            placeholder="blur"
            sizes="(min-width: 1152px) 1152px, 100vw"
            className="-z-20 object-cover"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-brand-700/90 via-ink/85 to-indigo-900/90" />
          <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight sm:text-5xl">
            Keyingi biznesingizni bugun boshlang
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-zinc-300">
            Birinchi biznes rejangizni bir necha daqiqada oling.
          </p>
          <Link href="/register" className="btn-primary mt-10 px-8 py-4 text-base">
            Hisob yaratish <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/5">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 text-sm text-zinc-500 sm:flex-row">
          <Logo />
          <p>© {new Date().getFullYear()} BizPilot AI. Barcha huquqlar himoyalangan.</p>
        </div>
      </footer>
    </main>
  );
}

function SectionHeading({ eyebrow, title, desc }: { eyebrow: string; title: string; desc: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-medium text-brand-400">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">{title}</h2>
      <p className="mt-5 text-lg text-zinc-400">{desc}</p>
    </div>
  );
}

// Ilova ko'rinishining statik namunasi (haqiqiy ma'lumot emas).
function ProductMockup() {
  const bars = [28, 46, 38, 62, 55, 78, 92];
  return (
    <div className="glass overflow-hidden rounded-3xl text-left shadow-2xl">
      <div className="flex items-center gap-2 border-b border-white/5 px-5 py-3.5">
        <span className="size-3 rounded-full bg-red-400/80" />
        <span className="size-3 rounded-full bg-amber-400/80" />
        <span className="size-3 rounded-full bg-emerald-400/80" />
        <span className="ml-4 hidden rounded-lg bg-white/5 px-3 py-1 font-mono text-xs text-zinc-500 sm:block">
          bizpilot.ai/dashboard/project/kofe-shop
        </span>
      </div>
      <div className="grid md:grid-cols-[200px_1fr]">
        <aside className="hidden space-y-1 border-r border-white/5 p-4 md:block">
          {[
            { i: Sparkles, t: "Umumiy" },
            { i: Briefcase, t: "Biznes reja", a: true },
            { i: Megaphone, t: "Marketing" },
            { i: Wallet, t: "Moliya" },
          ].map(({ i: Icon, t, a }) => (
            <div
              key={t}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm ${a ? "bg-brand-500/15 text-brand-300" : "text-zinc-500"}`}
            >
              <Icon size={15} /> {t}
            </div>
          ))}
        </aside>
        <div className="space-y-4 p-5 sm:p-6">
          <div>
            <p className="text-xs text-zinc-500">Loyiha</p>
            <p className="text-lg font-semibold">Specialty kofe shop — Toshkent</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 sm:col-span-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-400">3 yillik daromad prognozi</p>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-400">namuna</span>
              </div>
              <div className="mt-4 flex h-28 items-end gap-2">
                {bars.map((h, i) => (
                  <div
                    key={i}
                    style={{ height: `${h}%` }}
                    className="flex-1 rounded-t-md bg-gradient-to-t from-brand-600/40 to-brand-400"
                  />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-xs sm:grid-cols-1">
              {[
                ["Kuchli", "text-emerald-400 bg-emerald-500/10"],
                ["Zaif", "text-red-400 bg-red-500/10"],
                ["Imkoniyat", "text-sky-400 bg-sky-500/10"],
                ["Xatar", "text-amber-400 bg-amber-500/10"],
              ].map(([t, c]) => (
                <span key={t} className={`rounded-lg px-2.5 py-1.5 font-medium ${c}`}>SWOT · {t}</span>
              ))}
            </div>
          </div>
          <div className="space-y-2 rounded-2xl border border-white/5 bg-white/[0.03] p-4">
            <p className="text-sm text-zinc-400">Xulosa</p>
            <div className="h-2.5 w-full rounded-full bg-white/10" />
            <div className="h-2.5 w-11/12 rounded-full bg-white/10" />
            <div className="h-2.5 w-3/4 rounded-full bg-white/10" />
          </div>
        </div>
      </div>
    </div>
  );
}
