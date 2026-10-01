import type { ExamResult } from "@/lib/exam-db";
import type { TestQuestion } from "@/lib/quiz";

/** Ishga tushirilgan test (mashq yoki mock). */
export type ExamSession = {
  key: string;
  title: string;
  questions: TestQuestion[];
  mode: ExamResult["mode"];
  subject: string | null;
  timeLimitSec: number | null;
  showPoints: boolean;
  /** "Qayta ishlash" — xuddi shu sozlamalar bilan yangi to'plam. */
  restart: () => Promise<void>;
};
