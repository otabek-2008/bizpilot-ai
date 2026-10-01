// Abituriyent bo'limi: imtihonlar katalogi (format, fanlar, mavzular) va mock test tuzilmasi.
// Format ma'lumotlari umumiy ma'lumot uchun; aniq va so'nggi talablar — rasmiy saytlarda (officialUrl).

export type ExamId = "dtm" | "milliy" | "ielts" | "cefr" | "sat";

/** AI savollarni qaysi tilda tuzadi. */
export type QuizLang = "uz" | "ru" | "en";

export type Subject = {
  id: string;
  name: string;
  lang: QuizLang;
  topics: string[];
};

/** Mock test bloki: qaysi fandan nechta savol va har biri necha ball. */
export type MockBlock = { label: string; subject: string | "pick1" | "pick2"; count: number; points: number };

export type Exam = {
  id: ExamId;
  name: string;
  short: string;
  desc: string;
  from: string;
  to: string;
  officialUrl: string;
  officialName: string;
  facts: { label: string; value: string }[];
  subjects: Subject[];
  /** To'liq mock test tuzilmasi; pick1/pick2 — foydalanuvchi tanlaydigan ixtisoslik fanlari. */
  mock: { blocks: MockBlock[]; minutes: number; note: string };
  /** Writing (insho) bo'limini AI baholaydi. */
  writing?: { tasks: { id: string; label: string; minWords: number; hint: string }[]; scale: string };
};

const DTM_COMMON: Subject[] = [
  {
    id: "ona-tili",
    name: "Ona tili va adabiyot",
    lang: "uz",
    topics: ["Fonetika va imlo", "Leksikologiya", "So'z yasalishi va morfologiya", "Sintaksis: gap bo'laklari", "Qo'shma gaplar", "Punktuatsiya", "Mumtoz adabiyot", "XX asr o'zbek adabiyoti", "Adabiyot nazariyasi"],
  },
  {
    id: "matematika",
    name: "Matematika",
    lang: "uz",
    topics: ["Sonlar va amallar", "Foiz va proporsiya", "Algebraik ifodalar", "Tenglama va tengsizliklar", "Funksiyalar va grafiklar", "Progressiyalar", "Trigonometriya", "Logarifm va ko'rsatkichli funksiya", "Planimetriya", "Stereometriya", "Hosila va integral", "Ehtimollar nazariyasi"],
  },
  {
    id: "tarix",
    name: "O'zbekiston tarixi",
    lang: "uz",
    topics: ["Qadimgi davr", "Ilk o'rta asrlar", "Somoniylar va Qoraxoniylar", "Temuriylar davri", "Xonliklar davri", "Rossiya istilosi va mustamlaka davri", "Sovet davri", "Mustaqil O'zbekiston"],
  },
];

const DTM_SPECIAL: Subject[] = [
  { id: "fizika", name: "Fizika", lang: "uz", topics: ["Kinematika", "Dinamika", "Saqlanish qonunlari", "Molekulyar fizika va termodinamika", "Elektrostatika", "O'zgarmas tok", "Magnetizm", "Tebranish va to'lqinlar", "Optika", "Atom va yadro fizikasi"] },
  { id: "kimyo", name: "Kimyo", lang: "uz", topics: ["Atom tuzilishi", "Davriy qonun", "Kimyoviy bog'lanish", "Moddalar miqdori va hisoblashlar", "Eritmalar", "Oksidlanish-qaytarilish", "Noorganik moddalar sinflari", "Metallar va metallmaslar", "Organik kimyo asoslari", "Uglevodorodlar", "Kislorodli organik birikmalar"] },
  { id: "biologiya", name: "Biologiya", lang: "uz", topics: ["Hujayra", "Botanika", "Zoologiya", "Odam anatomiyasi va fiziologiyasi", "Genetika", "Evolyutsiya", "Ekologiya", "Moddalar almashinuvi"] },
  { id: "ingliz", name: "Ingliz tili", lang: "en", topics: ["Tenses", "Articles and determiners", "Modal verbs", "Conditionals", "Passive voice", "Reported speech", "Prepositions", "Vocabulary in context", "Reading comprehension"] },
  { id: "rus", name: "Rus tili", lang: "ru", topics: ["Фонетика и орфография", "Морфология", "Падежи существительных", "Глагол: вид и время", "Синтаксис", "Пунктуация", "Лексика"] },
  { id: "jahon-tarixi", name: "Jahon tarixi", lang: "uz", topics: ["Qadimgi dunyo", "O'rta asrlar", "Yangi davr", "Birinchi jahon urushi", "Ikkinchi jahon urushi", "Eng yangi davr"] },
  { id: "geografiya", name: "Geografiya", lang: "uz", topics: ["Kartografiya", "Litosfera va relyef", "Atmosfera va iqlim", "Gidrosfera", "Aholi geografiyasi", "Jahon xo'jaligi", "O'zbekiston geografiyasi"] },
  { id: "huquq", name: "Huquq", lang: "uz", topics: ["Davlat va huquq nazariyasi", "Konstitutsiyaviy huquq", "Fuqarolik huquqi", "Mehnat huquqi", "Oila huquqi", "Ma'muriy va jinoyat huquqi"] },
];

export const EXAMS: Exam[] = [
  {
    id: "dtm",
    name: "DTM (oliygohga kirish testi)",
    short: "DTM",
    desc: "Oliy ta'limga kirish test sinovi: majburiy fanlar va ikki ixtisoslik fani bo'yicha mashq va to'liq mock test.",
    from: "#22c55e",
    to: "#0ea5e9",
    officialUrl: "https://uzbmb.uz",
    officialName: "Bilim va malakalarni baholash agentligi",
    facts: [
      { label: "Majburiy fanlar", value: "Ona tili, Matematika, O'zbekiston tarixi — har biri 10 savol × 1,1 ball" },
      { label: "1-ixtisoslik fani", value: "30 savol × 3,1 ball" },
      { label: "2-ixtisoslik fani", value: "30 savol × 2,1 ball" },
      { label: "Jami", value: "90 savol · 189 ball · 3 soat" },
    ],
    subjects: [...DTM_COMMON, ...DTM_SPECIAL],
    mock: {
      blocks: [
        { label: "Ona tili va adabiyot", subject: "ona-tili", count: 10, points: 1.1 },
        { label: "Matematika", subject: "matematika", count: 10, points: 1.1 },
        { label: "O'zbekiston tarixi", subject: "tarix", count: 10, points: 1.1 },
        { label: "1-ixtisoslik fani", subject: "pick1", count: 30, points: 3.1 },
        { label: "2-ixtisoslik fani", subject: "pick2", count: 30, points: 2.1 },
      ],
      minutes: 180,
      note: "Haqiqiy test tuzilmasi: 90 savol, 189 ball, 3 soat.",
    },
  },
  {
    id: "milliy",
    name: "Milliy sertifikat",
    short: "Milliy sertifikat",
    desc: "Fanlar bo'yicha milliy sertifikat imtihoniga tayyorgarlik. Natija darajalari: A+, A, B+, B, C+, C.",
    from: "#f59e0b",
    to: "#ef4444",
    officialUrl: "https://uzbmb.uz",
    officialName: "Bilim va malakalarni baholash agentligi",
    facts: [
      { label: "Kim o'tkazadi", value: "Bilim va malakalarni baholash agentligi" },
      { label: "Darajalar", value: "A+, A, B+, B, C+, C" },
      { label: "Fanlar", value: "Matematika, ona tili, tarix, tabiiy fanlar, chet tillari va boshqalar" },
      { label: "Diqqat", value: "Imtihon formati fanga qarab farq qiladi — rasmiy saytdagi spetsifikatsiyani ko'ring" },
    ],
    subjects: [DTM_COMMON[0], DTM_COMMON[1], DTM_COMMON[2], ...DTM_SPECIAL.filter((s) => ["fizika", "kimyo", "biologiya", "ingliz", "rus"].includes(s.id))],
    mock: {
      blocks: [{ label: "Tanlangan fan", subject: "pick1", count: 40, points: 1 }],
      minutes: 120,
      note: "Mashq uchun mock: tanlangan fandan 40 savol, 2 soat. Haqiqiy imtihon tuzilmasi fanga qarab farq qiladi.",
    },
  },
  {
    id: "ielts",
    name: "IELTS",
    short: "IELTS",
    desc: "IELTS Academic/General: Reading, grammatika va lug'at mashqlari, Writing Task 1/2 ni AI baholaydi.",
    from: "#ef4444",
    to: "#b91c1c",
    officialUrl: "https://ielts.org",
    officialName: "IELTS (British Council / IDP)",
    facts: [
      { label: "Listening", value: "4 qism · 40 savol · ~30 daqiqa" },
      { label: "Reading", value: "3 matn · 40 savol · 60 daqiqa" },
      { label: "Writing", value: "Task 1 (150+ so'z) va Task 2 (250+ so'z) · 60 daqiqa" },
      { label: "Speaking", value: "3 qism · 11–14 daqiqa · ball 0–9 (band)" },
    ],
    subjects: [
      { id: "reading", name: "Reading", lang: "en", topics: ["Academic passages", "True / False / Not Given", "Matching headings", "Sentence completion", "Multiple choice"] },
      { id: "grammar", name: "Grammar", lang: "en", topics: ["Tenses", "Complex sentences", "Conditionals", "Passive voice", "Relative clauses", "Articles"] },
      { id: "vocabulary", name: "Vocabulary", lang: "en", topics: ["Academic word list", "Collocations", "Paraphrasing", "Education", "Environment", "Technology", "Health", "Work and economy"] },
    ],
    mock: {
      blocks: [
        { label: "Reading", subject: "reading", count: 20, points: 1 },
        { label: "Grammar", subject: "grammar", count: 10, points: 1 },
        { label: "Vocabulary", subject: "vocabulary", count: 10, points: 1 },
      ],
      minutes: 60,
      note: "Mashq uchun mock (Listening va Speaking bu yerda yo'q). Writing'ni alohida bo'limda AI baholaydi.",
    },
    writing: {
      scale: "IELTS band 0–9 (Task Achievement/Response, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy)",
      tasks: [
        { id: "task1", label: "Task 1 (grafik/jadval/xat)", minWords: 150, hint: "Grafik yoki jadvalni tasvirlang (General: xat yozing). Kamida 150 so'z." },
        { id: "task2", label: "Task 2 (insho)", minWords: 250, hint: "Berilgan mavzu bo'yicha fikr bildiruvchi insho. Kamida 250 so'z." },
      ],
    },
  },
  {
    id: "cefr",
    name: "CEFR (multilevel)",
    short: "CEFR",
    desc: "Chet tili bo'yicha CEFR (multilevel) sertifikatiga tayyorgarlik: grammatika, lug'at, reading va Writing'ni AI baholashi.",
    from: "#6366f1",
    to: "#a855f7",
    officialUrl: "https://uzbmb.uz",
    officialName: "Bilim va malakalarni baholash agentligi",
    facts: [
      { label: "Ko'nikmalar", value: "Listening, Reading, Writing, Speaking" },
      { label: "Darajalar", value: "B1, B2, C1 (multilevel)" },
      { label: "Tillar", value: "Ingliz, rus, nemis, fransuz va boshqalar" },
      { label: "Diqqat", value: "Aniq tuzilma va ball chegaralari — rasmiy saytda" },
    ],
    subjects: [
      { id: "en-grammar", name: "English: Grammar", lang: "en", topics: ["B1 grammar", "B2 grammar", "C1 grammar", "Word formation", "Phrasal verbs"] },
      { id: "en-reading", name: "English: Reading", lang: "en", topics: ["Short texts", "Gap filling", "Matching", "Long passage comprehension"] },
      { id: "en-vocab", name: "English: Vocabulary", lang: "en", topics: ["Everyday topics", "Education and work", "Society", "Science and technology"] },
      { id: "ru-grammar", name: "Русский язык: грамматика", lang: "ru", topics: ["Падежи", "Виды глагола", "Причастия и деепричастия", "Сложные предложения"] },
    ],
    mock: {
      blocks: [
        { label: "Grammar", subject: "en-grammar", count: 15, points: 1 },
        { label: "Reading", subject: "en-reading", count: 15, points: 1 },
        { label: "Vocabulary", subject: "en-vocab", count: 10, points: 1 },
      ],
      minutes: 60,
      note: "Ingliz tili bo'yicha mashq mock (Listening va Speaking bu yerda yo'q).",
    },
    writing: {
      scale: "CEFR darajasi (B1 dan past / B1 / B2 / C1) va 0–100 ball",
      tasks: [
        { id: "letter", label: "Xat (informal/formal)", minWords: 120, hint: "Berilgan vaziyat bo'yicha xat yozing." },
        { id: "essay", label: "Insho", minWords: 180, hint: "Mavzu bo'yicha fikringizni asoslab yozing." },
      ],
    },
  },
  {
    id: "sat",
    name: "SAT",
    short: "SAT",
    desc: "Digital SAT: Reading & Writing va Math bo'yicha mashq va mock test.",
    from: "#0ea5e9",
    to: "#1d4ed8",
    officialUrl: "https://satsuite.collegeboard.org",
    officialName: "College Board",
    facts: [
      { label: "Reading & Writing", value: "54 savol · 64 daqiqa (2 modul)" },
      { label: "Math", value: "44 savol · 70 daqiqa (2 modul)" },
      { label: "Ball", value: "400–1600" },
      { label: "Format", value: "Kompyuterda (Bluebook), moslashuvchan modullar" },
    ],
    subjects: [
      { id: "rw", name: "Reading & Writing", lang: "en", topics: ["Words in context", "Text structure and purpose", "Central ideas and details", "Command of evidence", "Inferences", "Boundaries (punctuation)", "Form, structure, and sense", "Transitions", "Rhetorical synthesis"] },
      { id: "math", name: "Math", lang: "en", topics: ["Linear equations", "Systems of equations", "Linear inequalities", "Nonlinear functions", "Quadratics", "Ratios and percentages", "Statistics and probability", "Geometry", "Trigonometry"] },
    ],
    mock: {
      blocks: [
        { label: "Reading & Writing", subject: "rw", count: 54, points: 1 },
        { label: "Math", subject: "math", count: 44, points: 1 },
      ],
      minutes: 134,
      note: "Haqiqiy tuzilma: 98 savol, 2 soat 14 daqiqa (bu yerda modullar moslashuvchan emas).",
    },
  },
];

export const examById = (id: string) => EXAMS.find((e) => e.id === id);

export const subjectOf = (exam: Exam, id: string) => exam.subjects.find((s) => s.id === id);

/** Mock bloklaridagi pick1/pick2 o'rniga tanlangan fanlarni qo'yadi. */
export function resolveMock(exam: Exam, picks: { pick1?: string; pick2?: string }) {
  return exam.mock.blocks.map((b) => {
    const id = b.subject === "pick1" ? picks.pick1 : b.subject === "pick2" ? picks.pick2 : b.subject;
    const subject = id ? subjectOf(exam, id) : undefined;
    return { ...b, subjectId: id ?? null, subject: subject ?? null };
  });
}

/** Ixtisoslik tanlovida ko'rsatiladigan fanlar (majburiy bloklarda bor fanlar chiqariladi). */
export function pickableSubjects(exam: Exam): Subject[] {
  const fixed = new Set(exam.mock.blocks.map((b) => b.subject));
  return exam.subjects.filter((s) => !fixed.has(s.id));
}

export const needsPicks = (exam: Exam) => exam.mock.blocks.filter((b) => b.subject === "pick1" || b.subject === "pick2").length;

export const LANG_NAME: Record<QuizLang, string> = { uz: "o'zbek (lotin)", ru: "rus", en: "ingliz" };
