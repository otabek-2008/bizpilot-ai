"use client";

import { AlertTriangle, RotateCw } from "lucide-react";

// Production'da server xatosi matni yashiriladi — eng ko'p uchraydigan sabablarni ko'rsatamiz.
export default function AdminError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="glass mx-auto mt-10 max-w-lg rounded-3xl p-8 text-center">
      <AlertTriangle className="mx-auto text-amber-300" size={32} />
      <h1 className="mt-4 text-xl font-semibold">Ma&apos;lumotlarni yuklab bo&apos;lmadi</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Ko&apos;pincha sababi: Render&apos;dagi <code>SUPABASE_SERVICE_ROLE_KEY</code> noto&apos;g&apos;ri yoki boshqa Supabase
        loyihasiga tegishli, yoki <code>supabase/schema.sql</code> ishga tushirilmagan.
      </p>
      {error.digest && <p className="mt-2 font-mono text-xs text-zinc-600">Kod: {error.digest}</p>}
      <button onClick={retry} className="btn-ghost mt-6">
        <RotateCw size={16} /> Qayta urinish
      </button>
    </div>
  );
}
