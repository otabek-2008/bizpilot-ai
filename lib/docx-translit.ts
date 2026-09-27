import JSZip from "jszip";

// .docx ichidagi matnni formatlash (shrift, jadval, rasm)ni saqlagan holda o'giradi.
// Word matnni <w:t> bo'laklariga bo'ladi — har bir bo'lakka oldingi belgini kontekst sifatida uzatamiz.

const PARTS = /^word\/(document|header\d*|footer\d*|footnotes|endnotes|comments)\.xml$/;

const decode = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&");

const encode = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function transliterateDocx(
  file: Blob,
  convert: (text: string, prev: string) => string,
): Promise<Blob> {
  const zip = await JSZip.loadAsync(file);

  for (const name of Object.keys(zip.files)) {
    if (!PARTS.test(name)) continue;
    const xml = await zip.file(name)!.async("string");

    let prev = "";
    // Matn bo'laklari ketma-ket o'giriladi; paragraf tugaganda kontekst yangilanadi.
    const out = xml.replace(
      /<\/w:p>|(<w:t(?:\s[^>]*)?>)([^<]*)(<\/w:t>)/g,
      (match, open: string | undefined, text: string, close: string) => {
        if (!open) {
          prev = "";
          return match;
        }
        const plain = decode(text);
        const converted = convert(plain, prev);
        if (plain) prev = plain.slice(-2);
        // Bo'sh joylar yo'qolmasligi uchun
        const openTag = open.includes("xml:space") ? open : open.replace("<w:t", '<w:t xml:space="preserve"');
        return openTag + encode(converted) + close;
      },
    );

    zip.file(name, out);
  }

  return zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    compression: "DEFLATE",
  });
}
