// Abituriyent bo'limi: imtihonlar va fanlar ro'yxati (savollar bazasini tartiblash uchun).
// Savollar, materiallar va imtihon formatlari admin panel orqali yuklanadi — bu yerda hech qanday kontent yo'q.

export type ExamId = "dtm" | "milliy" | "ielts" | "cefr" | "sat";

export type Subject = { id: string; name: string };

export type Exam = {
  id: ExamId;
  name: string;
  short: string;
  from: string;
  to: string;
  subjects: Subject[];
};

const s = (id: string, name: string): Subject => ({ id, name });

const SCHOOL: Subject[] = [
  s("ona-tili", "Ona tili va adabiyot"),
  s("matematika", "Matematika"),
  s("tarix", "O'zbekiston tarixi"),
  s("fizika", "Fizika"),
  s("kimyo", "Kimyo"),
  s("biologiya", "Biologiya"),
  s("ingliz", "Ingliz tili"),
  s("rus", "Rus tili"),
  s("jahon-tarixi", "Jahon tarixi"),
  s("geografiya", "Geografiya"),
  s("huquq", "Huquq"),
];

export const EXAMS: Exam[] = [
  { id: "dtm", name: "DTM", short: "DTM", from: "#22c55e", to: "#0ea5e9", subjects: SCHOOL },
  { id: "milliy", name: "Milliy sertifikat", short: "Milliy sertifikat", from: "#f59e0b", to: "#ef4444", subjects: SCHOOL },
  {
    id: "ielts",
    name: "IELTS",
    short: "IELTS",
    from: "#ef4444",
    to: "#b91c1c",
    subjects: [s("reading", "Reading"), s("listening", "Listening"), s("grammar", "Grammar"), s("vocabulary", "Vocabulary")],
  },
  {
    id: "cefr",
    name: "CEFR",
    short: "CEFR",
    from: "#6366f1",
    to: "#a855f7",
    subjects: [s("en-grammar", "English: Grammar"), s("en-reading", "English: Reading"), s("en-listening", "English: Listening"), s("en-vocab", "English: Vocabulary")],
  },
  {
    id: "sat",
    name: "SAT",
    short: "SAT",
    from: "#0ea5e9",
    to: "#1d4ed8",
    subjects: [s("rw", "Reading & Writing"), s("math", "Math")],
  },
];

export const examById = (id: string) => EXAMS.find((e) => e.id === id);

export const subjectOf = (exam: Exam, id: string) => exam.subjects.find((x) => x.id === id);
