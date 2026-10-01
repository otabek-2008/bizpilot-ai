import Link from "next/link";
import { ChevronRight, FileText, Folder, Pencil, Trash2 } from "lucide-react";
import { ADMIN_BUCKET, BUCKETS, adminDb, isBucket } from "@/lib/admin/db";
import { deleteFileAction } from "@/app/admin/actions";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { DownloadButton, NewFolderForm, RenameForm, Uploader } from "@/components/admin/FileTools";
import { Empty, PageTitle, fmt } from "@/components/admin/ui";
import { isEditable } from "@/lib/admin/files";

export const metadata = { title: "Fayllar" };

const BUCKET_LABEL: Record<string, string> = {
  "admin-files": "Admin hujjatlari",
  "prava-images": "Prava rasmlari",
  avatars: "Foydalanuvchi rasmlari",
};

function size(bytes?: number) {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default async function FilesPage({ searchParams }: { searchParams: Promise<{ b?: string; p?: string }> }) {
  const sp = await searchParams;
  const bucket = sp.b && isBucket(sp.b) ? sp.b : ADMIN_BUCKET;
  const prefix = (sp.p ?? "").split("/").filter((x) => x && x !== "." && x !== "..").join("/");

  const { data, error } = await adminDb().storage.from(bucket).list(prefix, { limit: 1000, sortBy: { column: "name", order: "asc" } });
  const items = (data ?? []).filter((x) => x.name !== ".keep" && x.name !== ".emptyFolderPlaceholder");
  const folders = items.filter((x) => !x.id);
  const files = items.filter((x) => x.id);

  const href = (p: string) => `/admin/files?b=${bucket}${p ? `&p=${encodeURIComponent(p)}` : ""}`;
  const crumbs = prefix ? prefix.split("/") : [];
  const full = (name: string) => (prefix ? `${prefix}/${name}` : name);

  return (
    <>
      <PageTitle title="Fayllar" desc="Hujjatlarni yuklash, yuklab olish, nomini o'zgartirish, tahrirlash va o'chirish">
        <div className="flex gap-1">
          {BUCKETS.map((b) => (
            <Link
              key={b}
              href={`/admin/files?b=${b}`}
              className={`rounded-xl px-3 py-1.5 text-sm transition ${b === bucket ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"}`}
            >
              {BUCKET_LABEL[b] ?? b}
            </Link>
          ))}
        </div>
      </PageTitle>

      <nav className="mb-4 flex flex-wrap items-center gap-1 text-sm text-zinc-400">
        <Link href={href("")} className="hover:text-white">{BUCKET_LABEL[bucket] ?? bucket}</Link>
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1">
            <ChevronRight size={14} />
            <Link href={href(crumbs.slice(0, i + 1).join("/"))} className="hover:text-white">{c}</Link>
          </span>
        ))}
      </nav>

      <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_320px]">
        <Uploader bucket={bucket} prefix={prefix} />
        <NewFolderForm bucket={bucket} prefix={prefix} />
      </div>

      {error && <p className="mb-4 text-sm text-rose-300">Ro&apos;yxatni olib bo&apos;lmadi: {error.message}. Bucket yaratilganini tekshiring (schema.sql).</p>}

      {folders.length || files.length ? (
        <ul className="glass divide-y divide-white/5 rounded-2xl">
          {folders.map((f) => (
            <li key={`d-${f.name}`}>
              <Link href={href(full(f.name))} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-white/[0.03]">
                <Folder size={18} className="text-amber-300" /> {f.name}
              </Link>
            </li>
          ))}
          {files.map((f) => {
            const path = full(f.name);
            const bytes = (f.metadata as { size?: number } | null)?.size;
            return (
              <li key={f.id} className="flex flex-col gap-2 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <FileText size={18} className="shrink-0 text-brand-400" />
                  <div className="min-w-0">
                    <RenameForm bucket={bucket} path={path} name={f.name} />
                    <p className="text-xs text-zinc-500">
                      {size(bytes)} · {fmt(f.updated_at ?? f.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-4 pl-8 sm:pl-0">
                  <DownloadButton bucket={bucket} path={path} />
                  {isEditable(f.name, bytes) && (
                    <Link
                      href={`/admin/files/edit?b=${bucket}&p=${encodeURIComponent(path)}`}
                      className="inline-flex items-center gap-1.5 text-zinc-300 hover:text-white"
                    >
                      <Pencil size={15} /> Tahrirlash
                    </Link>
                  )}
                  <form action={deleteFileAction}>
                    <input type="hidden" name="bucket" value={bucket} />
                    <input type="hidden" name="path" value={path} />
                    <ConfirmButton message={`"${f.name}" faylini o'chirasizmi?`}>
                      <Trash2 size={15} /> O&apos;chirish
                    </ConfirmButton>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        !error && <Empty>Bu papka bo&apos;sh. Yuqoridan fayl yuklang.</Empty>
      )}
    </>
  );
}
