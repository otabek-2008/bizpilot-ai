import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Lock, Mail, Send, Smartphone, Sparkles, Zap } from "lucide-react";
import Logo from "@/components/Logo";
import { modules, toolIds } from "@/lib/modules";
import { mailtoUrl, site, telegramUrl } from "@/lib/site";
import analytics from "@/public/images/analytics.webp";
import city from "@/public/images/city.webp";
import meeting from "@/public/images/meeting.webp";

const steps = [
  { title: "Ro'yxatdan o'ting", desc: "Google, Telegram yoki email bilan — bir necha soniyada." },
  { title: "Vositani tanlang", desc: "Matn, rasm yoki hujjat — har bir vosita alohida bo'limda." },
  { title: "Natijani oling", desc: "Nusxalang yoki yuklab oling. Fayllar brauzeringizdan chiqmaydi." },
];

// Google'ga sayt nomi va nima ekanini aytadi (qidiruvda "CampusAI" nomi bilan chiqishi uchun)
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: site.name,
      alternateName: ["Campus AI", "campusai"],
      url: site.url,
      inLanguage: "uz",
    },
    {
      "@type": "WebApplication",
      name: site.name,
      url: site.url,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      inLanguage: "uz",
      description: "O'zbekistondagi talabalar uchun AI yordamchi, referat, imlo tekshiruvchi, CV, Lotin ↔ Kirill va hujjat konvertori.",
      offers: [
        { "@type": "Offer", name: "Oylik obuna", price: "6.99", priceCurrency: "USD" },
        { "@type": "Offer", name: "Yillik obuna", price: "60", priceCurrency: "USD" },
      ],
    },
  ],
};

export default function HomePage() {
  return (
    <main className="relative overflow-hidden bg-ink text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      {/* NAV */}
      <header className="fixed inset-x-0 top-0 z-50 px-4 sm:px-6">
        <div className="glass mx-auto mt-4 flex max-w-6xl items-center justify-between rounded-2xl px-4 py-2.5 sm:px-5">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm text-zinc-400 md:flex">
            <a href="#vositalar" className="transition hover:text-white">Vositalar</a>
            <a href="#qanday" className="transition hover:text-white">Qanday ishlaydi</a>
            <a href="#aloqa" className="transition hover:text-white">Aloqa</a>
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
      <section className="relative isolate pt-40 pb-20 sm:pt-48">
        <Image
          src={analytics}
          alt=""
          fill
          priority
          placeholder="blur"
          sizes="100vw"
          className="-z-20 object-cover opacity-[0.14] [mask-image:linear-gradient(to_bottom,#000_10%,transparent_85%)]"
        />
        <div aria-hidden className="absolute inset-0 -z-10">
          <div className="absolute -top-32 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-brand-600/35 blur-[140px] animate-aurora" />
          <div className="absolute top-40 right-[-10%] h-[380px] w-[480px] rounded-full bg-cyan-500/15 blur-[120px] animate-aurora [animation-delay:-8s]" />
          <div className="absolute top-72 left-[-10%] h-[340px] w-[440px] rounded-full bg-fuchsia-500/15 blur-[120px] animate-aurora [animation-delay:-4s]" />
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
            Talabalar uchun yangi platforma
          </div>

          <h1 className="animate-fade-up mx-auto mt-8 max-w-4xl text-5xl font-semibold leading-[1.05] tracking-tight [animation-delay:80ms] sm:text-7xl">
            O&apos;qish uchun{" "}
            <span className="animate-gradient bg-[linear-gradient(100deg,#fff,#c4b5fd,#22d3ee,#f0abfc,#fff)] bg-[length:300%_100%] bg-clip-text text-transparent">
              aqlli vositalar
            </span>{" "}
            bir joyda
          </h1>

          <p className="animate-fade-up mx-auto mt-7 max-w-2xl text-lg text-zinc-400 [animation-delay:160ms] sm:text-xl">
            Prava testlari, Lotin ↔ Kirill, 3×4 rasm, PDF ↔ Word, harf registri va AI yordamida biznes reja — hammasi
            {" "}{site.name}da, o&apos;zbek tilida.
          </p>

          <div className="animate-fade-up mt-10 flex flex-col items-center justify-center gap-3 [animation-delay:240ms] sm:flex-row">
            <Link href="/register" className="btn-primary px-7 py-3.5 text-base">
              Bepul boshlash <ArrowRight size={18} />
            </Link>
            <a href="#vositalar" className="btn-ghost px-7 py-3.5 text-base">
              Vositalarni ko&apos;rish
            </a>
          </div>

          <ul className="animate-fade-up mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-zinc-500 [animation-delay:320ms]">
            {["30 kun bepul", "Fayllar brauzerda qoladi", "Telefon va kompyuterda"].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <Check size={15} className="text-brand-400" /> {t}
              </li>
            ))}
          </ul>

          {/* Suzuvchi vosita belgilari */}
          <div className="animate-fade-up relative mx-auto mt-20 grid max-w-4xl grid-cols-3 gap-4 [animation-delay:400ms] sm:grid-cols-6">
            {toolIds.map((id, i) => {
              const m = modules[id];
              const Icon = m.icon;
              return (
                <Link
                  key={id}
                  href="/register"
                  className="glass group flex flex-col items-center gap-3 rounded-3xl p-4 transition hover:-translate-y-1"
                  style={{ animation: `float 7s ease-in-out ${i * -1.1}s infinite` }}
                >
                  <span
                    className="grid size-12 place-items-center rounded-2xl shadow-lg transition group-hover:scale-110 group-hover:-rotate-6"
                    style={{ background: `linear-gradient(135deg, ${m.from}, ${m.to})`, boxShadow: `0 14px 34px -14px ${m.from}` }}
                  >
                    <Icon size={22} />
                  </span>
                  <span className="text-xs text-zinc-300">{m.short}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* VOSITALAR */}
      <section id="vositalar" className="relative mx-auto max-w-6xl scroll-mt-28 px-6 py-24">
        <SectionHeading
          eyebrow="Vositalar"
          title="Har kuni kerak bo'ladigan hammasi"
          desc="Har bir vosita alohida bo'lim, o'z rangi va animatsiyasi bilan. Ko'pchiligi internetga fayl yubormasdan ishlaydi."
        />
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {toolIds.map((id, i) => {
            const m = modules[id];
            const Icon = m.icon;
            return (
              <div
                key={id}
                className={`glass group relative overflow-hidden rounded-3xl p-7 transition duration-300 hover:-translate-y-1 ${i === 0 || i === 5 ? "md:col-span-2" : ""}`}
              >
                <div
                  aria-hidden
                  className="absolute -right-16 -top-16 size-52 rounded-full opacity-30 blur-3xl transition duration-500 group-hover:scale-125 group-hover:opacity-50"
                  style={{ background: m.from }}
                />
                <div className="relative flex items-start justify-between">
                  <span
                    className="grid size-12 place-items-center rounded-2xl transition group-hover:-rotate-6 group-hover:scale-110"
                    style={{ background: `linear-gradient(135deg, ${m.from}, ${m.to})` }}
                  >
                    <Icon size={22} />
                  </span>
                  {m.badge && (
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-300">{m.badge}</span>
                  )}
                </div>
                <h3 className="relative mt-6 text-xl font-semibold">{m.title}</h3>
                <p className="relative mt-2 max-w-md text-zinc-400">{m.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* NEGA */}
      <section className="relative mx-auto max-w-6xl px-6 py-12">
        <div className="glass grid overflow-hidden rounded-[2rem] lg:grid-cols-2">
          <div className="relative min-h-[320px]">
            <Image src={city} alt="Zamonaviy shahar binolari" fill placeholder="blur" sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-indigo-900/20 lg:bg-gradient-to-r lg:from-transparent lg:via-ink/20 lg:to-ink" />
          </div>
          <div className="p-8 sm:p-12">
            <p className="text-sm font-medium text-brand-400">Nega {site.name}?</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Tez, xavfsiz va o&apos;zbek tilida</h2>
            <ul className="mt-8 space-y-5">
              {[
                { icon: Lock, t: "Maxfiylik", d: "Rasm va hujjatlaringiz serverga yuklanmaydi — hammasi brauzeringizda ishlanadi." },
                { icon: Zap, t: "Tezlik", d: "Kutish yo'q: natija bir zumda, katta fayllar uchun ham." },
                { icon: Smartphone, t: "Istalgan qurilmada", d: "Telefon, planshet va kompyuterda bir xil qulay." },
                { icon: Sparkles, t: "AI vositalar", d: "Biznes reja generatori tayyor, taqdimot yaratish tez orada." },
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

      {/* QANDAY ISHLAYDI */}
      <section id="qanday" className="relative mx-auto max-w-6xl scroll-mt-28 px-6 py-24">
        <SectionHeading eyebrow="Qanday ishlaydi" title="Uch qadamda tayyor" desc="Ro'yxatdan o'tish bir daqiqadan kam vaqt oladi." />
        <div className="relative mt-14 grid gap-4 md:grid-cols-3">
          <div aria-hidden className="absolute left-0 right-0 top-12 hidden h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent md:block" />
          {steps.map((s, i) => (
            <div key={s.title} className="glass relative rounded-3xl p-7">
              <div className="flex items-center justify-between">
                <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 text-lg font-semibold shadow-[0_10px_30px_-10px_rgb(139_92_246/0.9)]">
                  {i + 1}
                </span>
              </div>
              <h3 className="mt-6 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-zinc-400">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="relative isolate overflow-hidden rounded-[2rem] border border-white/10 px-8 py-20 text-center sm:px-16">
          <Image src={meeting} alt="" fill placeholder="blur" sizes="(min-width: 1152px) 1152px, 100vw" className="-z-20 object-cover" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-brand-700/90 via-ink/85 to-indigo-900/90" />
          <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight sm:text-5xl">Bugunoq boshlang</h2>
          <p className="mx-auto mt-5 max-w-xl text-zinc-300">Hisob yarating va barcha vositalardan 30 kun bepul foydalaning.</p>
          <Link href="/register" className="btn-primary mt-10 px-8 py-4 text-base">
            Hisob yaratish <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <footer id="aloqa" className="border-t border-white/5">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 py-10 text-sm text-zinc-500 sm:flex-row">
          <Logo />
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a href={mailtoUrl()} className="flex items-center gap-1.5 transition hover:text-white">
              <Mail size={15} /> {site.adminEmail}
            </a>
            {telegramUrl && (
              <a href={telegramUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 transition hover:text-white">
                <Send size={15} /> Telegram
              </a>
            )}
          </div>
          <p>© {new Date().getFullYear()} {site.name}</p>
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
