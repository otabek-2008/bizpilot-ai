// Har bir oliygohning bakalavriat yo'nalishlari (nomi + klassifikator kodi).
// Ma'lumot programs-data.json da (katta — faqat yo'nalish tanlanganda alohida yuklanadi).
// Manbalar: oliygoh.uz qabul kvotalari (2022–2026, barcha ta'lim shakllari va tillari), infoedu.uz (2026–2027),
// oliygoh.uz nodavlat OTM katalogi. Kod bo'yicha birlashtirilgan, eng yangi nomi olingan.

export type Program = { code: string; name: string };

type Data = {
  /** kod → umumiy nom */
  names: Record<string, string>;
  /** oliygoh id → kodlar; "kod|nom" — shu oliygohda nomi boshqacha bo'lsa */
  universities: Record<string, string[]>;
};

let data: Promise<Data> | null = null;

/**
 * Oliygohning o'z yo'nalishlari. Ular ma'lum bo'lmasa (ko'pi nodavlat OTMlar) yoki oliygoh
 * ro'yxatda yo'q bo'lsa — barcha bakalavriat yo'nalishlari (own: false).
 */
export async function loadPrograms(universityId: string | null): Promise<{ list: Program[]; own: boolean }> {
  data ??= import("./programs-data.json").then((m) => m.default as Data);
  const d = await data;
  const entries = universityId ? d.universities[universityId] : undefined;
  const list = entries
    ? entries.map((entry) => {
        const [code, own] = entry.split("|");
        return { code, name: own ?? d.names[code] ?? code };
      })
    : // bir xil nomli eski/yangi kodlardan bittasi qoladi
      [...new Map(Object.entries(d.names).map(([code, name]) => [name.toLowerCase(), { code, name }])).values()];
  return { list: list.sort((a, b) => a.name.localeCompare(b.name, "uz")), own: !!entries };
}

const fold = (s: string) => s.toLowerCase().replace(/[ʻʼ‘’`']/g, "").replace(/\s+/g, " ");

/** Nom yoki kod bo'yicha qidiruv: har bir so'z uchrashi kerak. */
export function searchPrograms(list: Program[], query: string): Program[] {
  const words = fold(query).split(" ").filter(Boolean);
  if (!words.length) return list;
  return list.filter((p) => {
    const hay = fold(`${p.name} ${p.code}`);
    return words.every((w) => hay.includes(w));
  });
}
