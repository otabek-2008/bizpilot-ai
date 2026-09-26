export type Project = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  created_at: string;
};

export type BusinessIdeaInput = {
  idea: string;
  audience: string;
  budget: string;
  location: string;
};

export type BusinessPlanData = {
  summary: string;
  mission: string;
  vision: string;
  products: string[];
  marketAnalysis: string;
  competitors: string[];
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  operations: string;
  team: string[];
  nextSteps: string[];
};

export type MarketingData = {
  overview: string;
  targetAudience: string;
  uniqueValue: string;
  channels: {
    name: string;
    description: string;
    cost: string;
    priority: "high" | "medium" | "low";
  }[];
  campaigns: {
    name: string;
    description: string;
    duration: string;
    budget: string;
  }[];
  brandGuidelines: string;
  kpis: string[];
};

export type FinanceData = {
  overview: string;
  startupCosts: { label: string; amount: string }[];
  monthlyCosts: { label: string; amount: string }[];
  revenueStreams: { label: string; description: string }[];
  projections: {
    year: number;
    revenue: string;
    costs: string;
    profit: string;
  }[];
  breakEven: string;
  fundingNeeds: string;
  riskMitigation: string[];
};

export type GeneratedDocuments = {
  businessPlan: BusinessPlanData;
  marketing: MarketingData;
  finance: FinanceData;
  updated_at: string;
};
