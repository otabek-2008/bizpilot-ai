# CampusAI

Talabalar (va hamma) uchun aqlli vositalar platformasi. Next.js 16 + Supabase.

| Bo'lim | Yo'l | Qanday ishlaydi |
|---|---|---|
| Bosh sahifa | `/dashboard` | Statistika, so'nggi faoliyat, haftalik diagramma |
| Harf registri | `/dashboard/case-converter` | KATTA / kichik / Sarlavha / Gap / teskari — brauzerda |
| Lotin ↔ Kirill | `/dashboard/transliterate` | Matn va `.txt` / `.docx` (formatlash saqlanadi) — brauzerda |
| 3×4 rasm | `/dashboard/photo-3x4` | Yuzni topib kesish, fonni almashtirish (MediaPipe), 300/600 DPI, 10×15 varaq |
| Hujjat konvertori | `/dashboard/documents` | PDF→Word, Word→PDF, Rasm→PDF, PDF→Rasm, PDF birlashtirish — brauzerda |
| Biznes reja AI | `/dashboard/business` | Avvalgi BizPilot: Claude AI orqali biznes/marketing/moliya rejasi |
| Taqdimot | `/dashboard/presentation` | Tez kunda (UI tayyor) |
| Chat | `/dashboard/chat` | FAQ bot + adminga savol (`support_messages`) |
| Aloqa | `/dashboard/contact` | Forma, Telegram, email, FAQ |
| Profil | `/dashboard/profile` | Avatar (Storage), ism, bio, o'qish joyi, banner, parol |

Vositalar sozlamalari (rang, animatsiya, menyu tartibi) — `lib/modules.ts`.
Aloqa ma'lumotlari — `lib/site.ts`.

## Ishga tushirish

```bash
cp .env.example .env.local   # qiymatlarni to'ldiring
npm install
npm run dev                  # predev: pdf.js worker va MediaPipe wasm → public/vendor
npm test                     # translit va harf registri testlari
```

## Supabase sozlamalari

1. **SQL** — `supabase/schema.sql` ni SQL Editor'da ishga tushiring (qayta ishga tushirish xavfsiz).
   U `support_messages` jadvali va `avatars` storage bucket'ini yaratadi.
2. **Auth → URL Configuration** — Site URL va Redirect URLs ga sayt manzilini
   (`https://.../dashboard`) qo'shing.
3. **Auth → Providers**:
   - **Google** — Google Cloud'da OAuth client yarating, Client ID/Secret'ni kiriting.
   - **Apple** — Apple Developer'da Services ID va kalit yarating (pullik Apple Developer hisobi kerak).
   - **Phone** — SMS provayder (Twilio, MessageBird, Vonage va h.k.) ulang.
   Yoqilmagan provayderlar kirish sahifasida avtomatik "tez orada" bo'lib ko'rinadi.
4. **Telegram** — @BotFather'da bot yarating, `/setdomain` bilan domenni ulang, keyin env'ga
   `NEXT_PUBLIC_TELEGRAM_BOT_ID`, `TELEGRAM_BOT_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY` qo'shing.
   Imzo serverda (`app/api/auth/telegram`) tekshiriladi.

## Admin javoblari

Foydalanuvchi chatda javobsiz savol yuborsa, u `support_messages` jadvaliga tushadi.
Javob berish uchun Supabase Table Editor'da `reply` va `replied_at` ustunlarini to'ldiring —
javob foydalanuvchining chatida paydo bo'ladi.

## Deploy (Render)

`render.yaml` tayyor. Env qiymatlarini Render dashboard'da kiriting.
