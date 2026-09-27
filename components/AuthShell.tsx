import Image, { type StaticImageData } from "next/image";
import { Check } from "lucide-react";
import Logo from "@/components/Logo";
import Backdrop from "@/components/Backdrop";

type Props = {
  title: string;
  subtitle: string;
  image: StaticImageData;
  imageAlt: string;
  headline: string;
  points: string[];
  children: React.ReactNode;
};

export default function AuthShell({
  title,
  subtitle,
  image,
  imageAlt,
  headline,
  points,
  children,
}: Props) {
  return (
    <main className="relative isolate grid min-h-screen text-white lg:grid-cols-2">
      <Backdrop />
      <Image
        src={image}
        alt=""
        fill
        placeholder="blur"
        sizes="100vw"
        className="-z-10 object-cover opacity-15 [mask-image:linear-gradient(to_bottom,#000,transparent_70%)] lg:hidden"
      />

      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="flex flex-1 items-center justify-center py-12">
          <div className="animate-fade-up w-full max-w-md">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
            <p className="mt-2 text-zinc-400">{subtitle}</p>
            <div className="mt-8">{children}</div>
          </div>
        </div>
      </div>

      <div className="relative m-3 hidden overflow-hidden rounded-[2rem] border border-white/10 lg:block">
        <Image
          src={image}
          alt={imageAlt}
          fill
          priority
          placeholder="blur"
          sizes="50vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-brand-700/30" />
        <div className="absolute inset-x-0 bottom-0 p-12">
          <div className="glass max-w-md rounded-3xl p-7">
            <p className="text-2xl font-semibold leading-snug tracking-tight">{headline}</p>
            <ul className="mt-5 space-y-2.5">
              {points.map((p) => (
                <li key={p} className="flex items-center gap-2.5 text-sm text-zinc-300">
                  <span className="grid size-5 place-items-center rounded-full bg-brand-500/25 text-brand-300">
                    <Check size={12} />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}

export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
      {message}
    </div>
  );
}
