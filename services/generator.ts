import type {
  BusinessPlanData,
  BusinessIdeaInput,
  FinanceData,
  GeneratedDocuments,
  MarketingData,
} from "@/types";

function clean(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

function title(input: string): string {
  const c = clean(input);
  if (!c) return "Business";
  return c.charAt(0).toUpperCase() + c.slice(1);
}

function industryReference(input: string): string {
  const c = clean(input);
  if (!c) return "sohada";
  return c.length > 40 ? c.slice(0, 40).trim() + "..." : c;
}

function audienceReference(input: string): string {
  const c = clean(input);
  if (!c) return "maqsadli auditoriya";
  return c;
}

function locationReference(input: string): string {
  const c = clean(input);
  if (!c) return "hududingizda";
  return c;
}

export function generateBusinessPlan(input: BusinessIdeaInput): BusinessPlanData {
  const idea = clean(input.idea);
  const audience = audienceReference(input.audience);
  const location = locationReference(input.location);
  const topic = title(input.idea || "biznes g'oya");
  const ref = industryReference(input.idea);

  const summary = `${topic} — bu biznes loyihasi: ${idea} Ushbu loyiha ${audience} ehtiyojlarini qondirish uchun ${location} faoliyat yuritadi. Ushbu reja biznesning maqsadi, bozor tahlili, operatsion strategiya va moliyaviy prognozini o'z ichiga oladi.`;

  const mission = `${audience} uchun yaxshi va ishonchli xizmat/mahsulot taqdim etish orqali ${location} da qiymat yaratish va ${ref} bozorda o'z o'rnimizni topish.`;

  const vision = `${location} da ${ref} sohasidagi yetakchi va ijodiy yetkazib beruvchiga aylanish, mijozlar hayotini soddalashtiradigan barqaror biznes qurish.`;

  const products = [
    `Asosiy xizmat: ${topic} — ${idea.length > 60 ? idea.slice(0, 60) + "..." : idea}`,
    `${audience} uchun moslashuvchan tariflar va paketlar`,
    `${location} bozoriga moslashtirilgan qo'shimcha takliflar`,
  ];

  const marketAnalysis = `${ref} bozorida mijozlar sifati va tezkor xizmatga katta e'tibor beradi. ${location} bozori o'sib bormoqda va raqobatchilarning ko'pchiligi an'anaviy yondashuvdan foydalanadi. Bizning farqlovchi tomonimiz — mijozga yo'naltirilgan yondashuv, shaffof narxlar va zamonaviy usullardan foydalanish.`;

  const competitors = [
    `${location} da faoliyat yuritayotgan an'anaviy o'yinchilar — ularning kamchiligi tezkor javob bermaslik.`,
    `Onlayn platformalar — ularning kamchiligi shaxsiy xizmatning yo'qligi.`,
    `Yangi boshlanuvchilar — ularda tajriba va ishonch bazasi yetarli emas.`,
  ];

  const strengths = [
    `Nozik ${audience} ehtiyojlarini chuqur tushunish`,
    `Zamonaviy texnologiya va shaffof jarayonlar`,
    `Moslashuvchan va mijozga yo'naltirilgan xizmat`,
  ];

  const weaknesses = [
    "Brend xabardorligining dastlabki bosqichda pastligi",
    "Cheklangan dastlabki kapital",
    "Kichik jamoaning resurs cheklovlari",
  ];

  const opportunities = [
    `${location} bozoridagi raqamli transformatsiya`,
    `Mahalliy mijozlar sonining ortishi`,
    "Hamkorlik va B2B imkoniyatlari",
  ];

  const threats = [
    "O'xshash xizmatlarni taklif qiluvchi yangi raqobatchilar",
    "Iqtisodiy tebranishlar tufayli xarajatlarning o'tishi",
    "Qoidalar va soliq o'zgarishlari",
  ];

  const operations = `Biznes ${location} da joylashgan bo'lib, asosiy jarayonlar: marketing va savdo, xizmat ko'rsatish/ishlab chiqarish, mijozlarni qo'llab-quvvatlash va moliyaviy nazorat. Dastlabki bosqichda kichik, samarali jamoa bilan ishlaymiz va keyingi bosqichlarda kenyaytiriladi. Sifat nazorati har haftalik yig'ilishlar va mijozlardan olingan fikrlarga asoslanadi.`;

  const team = [
    "Asoschi / boshqaruvchi — strategiya va qarorlar",
    "Marketing mutaxassisi — brend va mijozlarni jalb qilish",
    "Operatsiya xodimi — kundalik jarayonlar va xizmat sifati",
  ];

  const nextSteps = [
    "Bozor so'rovini o'tkazish va mijozlardan fikr to'plash",
    "Minimal ishlaydigan mahsulot (MVP) ni ishga tushirish",
    "Brend va onlayn mavjudligini shakllantirish",
    "Dastlabki mijozlarni jalb qilish va ko'rsatkichlarni kuzatish",
    "Xarajatlar va daromadni N-chi oy davomida tahlil qilish",
  ];

  return {
    summary,
    mission,
    vision,
    products,
    marketAnalysis,
    competitors,
    swot: { strengths, weaknesses, opportunities, threats },
    operations,
    team,
    nextSteps,
  };
}

export function generateMarketing(input: BusinessIdeaInput): MarketingData {
  const audience = audienceReference(input.audience);
  const location = locationReference(input.location);
  const topic = title(input.idea || "biznes");
  const budget = clean(input.budget) || "belgilangan byudjet doirasida";

  const overview = `${topic} brendini ${audience} orasida tanitish va ishonch qozonish asosiy marketing maqsadidir. Biz ${location} da mahalliy kanallar va raqamli platformalar kombinatsiyasidan foydalanamiz. Marketing byudjeti: ${budget}.`;

  const uniqueValue = `Bizning asosiy farqlovchi ustunligimiz — ${audience} ning real muammolarini tushunib, ularga shaxsiy yondashuv bilan yechim taklif qilish. Bu bizni yirik raqobatchilardan ajratib turadi.`;

  const channels = [
    {
      name: "Instagram / Telegram",
      description: `Mahalliy auditoriyaga bepul va arzon yetib borishning eng samarali yo'li. Kundalik kontent, mijoz fikrlari va jonli efirlar.`,
      cost: "Past",
      priority: "high" as const,
    },
    {
      name: "Mahalliy hamkorlik",
      description: `${location} dagi bizneslar va influencerlar bilan hamkorlik orqali tabiiy tavsiyalar.`,
      cost: "O'rtacha",
      priority: "high" as const,
    },
    {
      name: "Google / Targeted reklama",
      description: `${audience} qidirayotgan so'rovlarga yo'naltirilgan qidiruv reklamasi.`,
      cost: "Yugori",
      priority: "medium" as const,
    },
    {
      name: "Shahar voqealari / tarmoq",
      description: `${location} dagi tadbirlarda ishtirok etish va mahalliy jamoatchilik bilan aloqa.`,
      cost: "O'rtacha",
      priority: "medium" as const,
    },
    {
      name: "Email / eslatmalar",
      description: "Mavjud mijozlarga yangiliklar va maxsus takliflar yuborish.",
      cost: "Past",
      priority: "low" as const,
    },
  ];

  const campaigns = [
    {
      name: "Brendni tanishtirish",
      description: `Brend logotipi, taqdimot va birinchi 30 kun ichida kontent sur'atini yaratish.`,
      duration: "1-oy",
      budget: budget === "belgilangan byudjet doirasida" ? "Byudjetning 30%" : "Dastlabki byudjetning 30%",
    },
    {
      name: "Birinchi mijozlar aksiyasi",
      description: `${audience} uchun chegirma yoki bonus taklifi orqali dastlabki mijozlarni jalb qilish.`,
      duration: "2-3-oy",
      budget: "Byudjetning 25%",
    },
    {
      name: "Hamkorlik kampaniyasi",
      description: `${location} dagi hamkorlar bilan birgalikda aksiya va tavsiyalar.`,
      duration: "3-4-oy",
      budget: "Byudjetning 20%",
    },
    {
      name: "Brendni mustahkamlash",
      description: "Mijozlar fikrlari, muvaffaqiyat hikoyalari va muntazam kontent orqali ishonchni oshirish.",
      duration: "Doimiy",
      budget: "Byudjetning 25%",
    },
  ];

  const brandGuidelines = `${topic} brendi do'stona, professional va ishonchli qiyofani ifodalaydi. Rang sxemasi zamonaviy va jozibali bo'lib, barcha kanallarda bir xil qo'llanadi. Barcha kontentda mijozga foyda keltiradigan til ishlatiladi.`;

  const kpis = [
    "Oylik yangi mijozlar soni",
    "Ijtimoiy tarmoqlardagi obunachilar va qamrov",
    "Konversiya darajasi (tashrif → xarid)",
    "Mijozlarning qaytish darajasi",
    "Brend haqida eslatish (brand recall)",
  ];

  return {
    overview,
    targetAudience: audience,
    uniqueValue,
    channels,
    campaigns,
    brandGuidelines,
    kpis,
  };
}

export function generateFinance(input: BusinessIdeaInput): FinanceData {
  const audience = audienceReference(input.audience);
  const location = locationReference(input.location);
  const budget = clean(input.budget) || "3000";
  const topic = title(input.idea || "biznes");

  interface Money {
    base: number;
    label: string;
  }

  let budgetBase = 3000;
  const numeric = parseInt(budget.replace(/[^0-9]/g, ""), 10);
  if (!Number.isNaN(numeric) && numeric > 0) {
    budgetBase = numeric;
  }


  const fmtSimple = (n: number) => `$${Math.round(n).toLocaleString()}`;

  const startup: Money[] = [
    { label: "Ro'yxatdan o'tish va hujjatlar", base: budgetBase * 0.05 },
    { label: "Asbob-uskunalar / uskunalar", base: budgetBase * 0.25 },
    { label: "Marketing (dastlabki)", base: budgetBase * 0.20 },
    { label: "Ofis / joy ijarasi (avans)", base: budgetBase * 0.15 },
    { label: "Zaxira fondi", base: budgetBase * 0.20 },
    { label: "Boshqa kutilmagan xarajatlar", base: budgetBase * 0.15 },
  ];

  const monthly: Money[] = [
    { label: "Ijara va kommunal", base: budgetBase * 0.10 },
    { label: "Ish haqi (jamoa)", base: budgetBase * 0.45 },
    { label: "Marketing xarajatlari", base: budgetBase * 0.15 },
    { label: "Internet, dasturlar va vositalar", base: budgetBase * 0.10 },
    { label: "Boshqa operatsion xarajatlar", base: budgetBase * 0.20 },
  ];

  const revenueStreams = [
    {
      label: "Asosiy sotuv/xizmat",
      description: `${topic} daromadining asosiy manbai — ${audience} ga asosiy xizmat yoki mahsulot sotish.`,
    },
    {
      label: "Qo'shimcha paketlar",
      description: "Mijozlarga premium xizmatlar va kengaytirilgan versiyalarni taklif qilish.",
    },
    {
      label: "B2B hamkorlik",
      description: `${location} dan boshqa bizneslar bilan doimiy hamkorlik va ulgurji shartnomalar.`,
    },
  ];

  const projectionBase = budgetBase;
  const monthlyRevenue = projectionBase * 1.0;

  const projections = [
    {
      year: 1,
      revenue: fmtSimple(monthlyRevenue * 8),
      costs: fmtSimple(monthlyRevenue * 6.6),
      profit: fmtSimple(monthlyRevenue * 8 - monthlyRevenue * 6.6),
    },
    {
      year: 2,
      revenue: fmtSimple(monthlyRevenue * 14),
      costs: fmtSimple(monthlyRevenue * 10.5),
      profit: fmtSimple(monthlyRevenue * 14 - monthlyRevenue * 10.5),
    },
    {
      year: 3,
      revenue: fmtSimple(monthlyRevenue * 22),
      costs: fmtSimple(monthlyRevenue * 15),
      profit: fmtSimple(monthlyRevenue * 22 - monthlyRevenue * 15),
    },
  ];

  const totalStartup = startup.reduce((s, m) => s + m.base, 0);
  const totalMonthly = monthly.reduce((s, m) => s + m.base, 0);
  const avgMonthlyProfit = monthlyRevenue - totalMonthly;
  const breakEvenMonths = Math.ceil(totalStartup / Math.max(avgMonthlyProfit, 1));

  const overview = `Ushbu moliyaviy reja ${location} da ${audience} ga xizmat ko'rsatuvchi ${topic} loyihasi uchun tuzilgan. Dastlabki investitsiya taxminan ${fmtSimple(totalStartup)} ni tashkil etadi, oylik operatsion xarajatlar esa taxminan ${fmtSimple(totalMonthly)} ga teng. Murakkab bo'lmagan taxminlarga ko'ra, oylik sof foyda taxminan ${fmtSimple(avgMonthlyProfit)} bo'lishi kutiladi, bu esa o'zini qoplash muddati taxminan ${breakEvenMonths} oy bo'lishini anglatadi.`;

  const breakEven = `${fmtSimple(totalStartup)} miqdoridagi dastlabki xarajat o'zini taxminan ${breakEvenMonths} oyda qoplaydi, ya'ni loyiha 1-yil oxirigacha foyda keltira boshlashi kutiladi.`;

  const fundingNeeds = `Boshlang'ich bosqichda zarur bo'lgan kapital taxminan ${fmtSimple(totalStartup)} ni tashkil etadi. Ushbu mablag' shaxsiy jamg'arma, oila/yaniylardan yordam yoki kichik biznes krediti orqali jalb qilinishi mumkin.`;

  const riskMitigation = [
    "Xarajatlarni kuzatib borish va oylik byudjetni qayta ko'rib chiqish",
    "Daromad manbalarini diversifikatsiya qilish (bir nechta oqim)",
    "Zaxira fondini saqlash (kutilmagan xarajatlar uchun)",
    "Mijoz TTF (to'lov farovi) siyosatini aniq belgilash",
    "Soliq va qonuniy majburiyatlarni muntazam nazorat qilish",
  ];

  return {
    overview,
    startupCosts: startup.map((m) => ({ ...m, amount: fmtSimple(m.base) })),
    monthlyCosts: monthly.map((m) => ({ ...m, amount: fmtSimple(m.base) })),
    revenueStreams,
    projections,
    breakEven,
    fundingNeeds,
    riskMitigation,
  };
}

// Claude orqali hujjat yaratadi. AI sozlanmagan bo'lsa (503) shablon
// generatorga qaytadi; boshqa xatolarda foydalanuvchiga xabar ko'rsatiladi.
export async function generateWithAI(
  input: BusinessIdeaInput,
  accessToken: string,
): Promise<GeneratedDocuments> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });

  if (res.status === 503) {
    return generateAll(input);
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error || "Hujjatlar yaratishda xatolik yuz berdi.");
  }

  return body as GeneratedDocuments;
}

export function generateAll(input: BusinessIdeaInput): GeneratedDocuments {
  return {
    businessPlan: generateBusinessPlan(input),
    marketing: generateMarketing(input),
    finance: generateFinance(input),
    updated_at: new Date().toISOString(),
  };
}
