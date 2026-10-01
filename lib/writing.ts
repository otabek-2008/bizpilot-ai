// Writing (insho) tekshiruvi natijasi — server va brauzer uchun umumiy tur.

export type WritingReview = {
  /** IELTS: "6.5"; CEFR: "B2". */
  overall: string;
  /** 0–100 — progress uchun. */
  score100: number;
  wordCount: number;
  criteria: { name: string; score: string; comment: string }[];
  strengths: string[];
  improvements: string[];
  mistakes: { original: string; fix: string; why: string }[];
  improved: string;
};

/** Writing mashqlari uchun namunaviy topshiriqlar (CampusAI o'zi tuzgan, rasmiy imtihon savollari emas). */
export const WRITING_PROMPTS: Record<string, string[]> = {
  task1: [
    "The chart shows the percentage of students in a city who used four types of transport to get to university in 2010 and 2025 (bus 45% → 30%, car 20% → 15%, bicycle 10% → 25%, walking 25% → 30%). Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    "The table shows the average number of hours per week that young people in three age groups (16–18, 19–21, 22–25) spent on studying, social media and sport. Summarise the main features and make comparisons where relevant.",
    "You recently borrowed a book from a friend and accidentally damaged it. Write a letter to your friend. In your letter: apologise, explain what happened, and say what you will do about it.",
  ],
  task2: [
    "Some people believe that university education should be free for all students, while others think students should pay for their own studies. Discuss both views and give your own opinion.",
    "In many countries, young people are spending more time online than with their families. What are the causes of this, and what can be done to solve this problem?",
    "Some people think that learning a foreign language at primary school is more effective than learning it at secondary school. To what extent do you agree or disagree?",
  ],
  letter: [
    "Your friend is planning to visit your city for a week. Write a letter to your friend suggesting places to visit and things to do.",
    "You bought a laptop online, but it arrived damaged. Write a formal letter to the company explaining the problem and what you want them to do.",
  ],
  essay: [
    "Online learning is becoming more popular than traditional classroom learning. What are the advantages and disadvantages of this trend?",
    "Should students be required to do community service before graduating from school? Give reasons and examples.",
  ],
};
