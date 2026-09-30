import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { adminConfigured, isAdmin } from "@/lib/admin/auth";
import LoginForm from "@/components/admin/LoginForm";

export const metadata = { title: "Kirish" };

export default async function AdminLoginPage() {
  if (await isAdmin()) redirect("/admin");

  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="glass w-full max-w-sm rounded-3xl p-8">
        <span className="accent-gradient mb-5 grid size-12 place-items-center rounded-2xl">
          <ShieldCheck size={22} />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">Admin panel</h1>
        <p className="mt-1 text-sm text-zinc-400">CampusAI boshqaruv paneliga kirish</p>
        {adminConfigured() ? (
          <LoginForm />
        ) : (
          <p className="mt-6 rounded-xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-200">
            Admin panel hali sozlanmagan. Render&apos;da <code>ADMIN_USERNAME</code> va <code>ADMIN_PASSWORD</code> ni
            kiriting.
          </p>
        )}
      </div>
    </main>
  );
}
