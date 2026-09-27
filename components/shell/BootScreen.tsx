import { GraduationCap } from "lucide-react";
import Backdrop from "@/components/Backdrop";

// Ilova yuklanayotganda ko'rsatiladigan animatsiyali ekran.
export default function BootScreen() {
  return (
    <div className="relative grid min-h-screen place-items-center text-white">
      <Backdrop />
      <div className="flex flex-col items-center gap-6">
        <div className="relative grid size-20 place-items-center">
          <span className="animate-pulse-ring absolute inset-0 rounded-3xl bg-brand-500/40" />
          <span className="animate-pulse-ring absolute inset-0 rounded-3xl bg-brand-500/30 [animation-delay:0.6s]" />
          <span className="relative grid size-20 place-items-center rounded-3xl bg-gradient-to-br from-brand-400 via-brand-600 to-indigo-600 shadow-[0_20px_60px_-15px_rgb(139_92_246/0.9)]">
            <GraduationCap size={34} />
          </span>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold">
            Campus<span className="text-brand-400">AI</span>
          </p>
          <div className="mx-auto mt-3 h-1 w-40 overflow-hidden rounded-full bg-white/10">
            <div className="skeleton h-full w-full !bg-[linear-gradient(90deg,transparent,#a78bfa,transparent)]" />
          </div>
        </div>
      </div>
    </div>
  );
}
