export type SpellIssueKind = "imlo" | "grammatika" | "punktuatsiya" | "uslub";

export type SpellcheckResult = {
  corrected: string;
  issues: { original: string; suggestion: string; kind: SpellIssueKind; reason: string }[];
};
