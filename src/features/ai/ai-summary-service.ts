import { apiRequest } from "@/features/api/api-client";

export type AiSummaryScope = "BOOK" | "CHAPTER" | "SELECTION";
export type AiSummaryLanguage = "AUTO" | "MY" | "EN";

export type AiSummaryUsage = {
  feature: "SUMMARY";
  yearMonth: string;
  usedCount: number;
  limitCount: number;
  remainingCount: number;
};

export type AiSummary = {
  id: string;
  userId: string;
  bookId: string;
  chapterIndex: number | null;
  scope: AiSummaryScope;
  language: AiSummaryLanguage | string;
  sourceHash: string;
  title: string;
  summaryText: string;
  bulletPoints: string[] | null;
  keyTakeaways: string[] | null;
  model: string;
  createdAt: string;
  updatedAt: string;
};

export type GenerateAiSummaryInput = {
  bookId: string;
  scope: AiSummaryScope;
  chapterIndex?: number;
  language?: AiSummaryLanguage;
  sourceTitle?: string;
  sourceText: string;
};

export type GenerateAiSummaryResult = {
  summary: AiSummary;
  usage: AiSummaryUsage;
  cached: boolean;
};

export function getAiSummaryUsage() {
  return apiRequest<AiSummaryUsage>("/ai/summary/usage");
}

export function listBookAiSummaries(bookId: string) {
  return apiRequest<AiSummary[]>(
    `/ai/summary/book/${encodeURIComponent(bookId)}`,
  );
}

export function generateAiSummary(input: GenerateAiSummaryInput) {
  return apiRequest<GenerateAiSummaryResult>("/ai/summary/generate", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deleteAiSummary(summaryId: string) {
  return apiRequest<{ ok: true }>(
    `/ai/summary/${encodeURIComponent(summaryId)}`,
    { method: "DELETE" },
  );
}
