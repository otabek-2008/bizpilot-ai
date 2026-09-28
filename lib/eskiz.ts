// Eskiz.uz SMS API mijozi. Token 30 kun amal qiladi — xotirada saqlab, 401 bo'lsa qayta olamiz.
// Kerakli env: ESKIZ_EMAIL, ESKIZ_PASSWORD, ixtiyoriy ESKIZ_FROM (standart "4546").

const API = "https://notify.eskiz.uz/api";

let cachedToken: string | null = null;

async function login(): Promise<string> {
  const form = new FormData();
  form.set("email", process.env.ESKIZ_EMAIL ?? "");
  form.set("password", process.env.ESKIZ_PASSWORD ?? "");
  const res = await fetch(`${API}/auth/login`, { method: "POST", body: form });
  const body = await res.json().catch(() => ({}));
  const token = body?.data?.token;
  if (!res.ok || !token) throw new Error(`Eskiz login xatosi: ${res.status} ${JSON.stringify(body)}`);
  cachedToken = token;
  return token;
}

async function send(token: string, phone: string, message: string): Promise<Response> {
  const form = new FormData();
  form.set("mobile_phone", phone);
  form.set("message", message);
  form.set("from", process.env.ESKIZ_FROM || "4546");
  return fetch(`${API}/message/sms/send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
}

export function eskizConfigured(): boolean {
  return !!process.env.ESKIZ_EMAIL && !!process.env.ESKIZ_PASSWORD;
}

/** phone: "998901234567" yoki "+998 90 123 45 67" ko'rinishida. */
export async function sendSms(phone: string, message: string): Promise<void> {
  const mobile = phone.replace(/\D/g, "");
  let res = await send(cachedToken ?? (await login()), mobile, message);
  if (res.status === 401) res = await send(await login(), mobile, message);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Eskiz SMS xatosi: ${res.status} ${body}`);
  }
}
