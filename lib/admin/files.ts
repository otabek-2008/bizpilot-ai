// Brauzerda tahrirlash mumkin bo'lgan matnli fayllar (Server Action 1 MB chegarasiga sig'ishi kerak).
export const EDITABLE_EXT = ["txt", "md", "json", "csv", "tsv", "html", "xml", "yaml", "yml"];
export const MAX_EDIT_BYTES = 900 * 1024;

export const extOf = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

export function isEditable(name: string, bytes?: number): boolean {
  return EDITABLE_EXT.includes(extOf(name)) && (bytes ?? 0) <= MAX_EDIT_BYTES;
}

/** Ochiq bucket fayllari uchun URL boshi (brauzerga uzatiladi). */
export const publicBase = (bucket: string) => `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/`;
