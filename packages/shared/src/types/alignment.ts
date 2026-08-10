import type { DateString, DateTimeString, ID } from "./user";

export type AlignmentFactorType =
  | "task_completion"
  | "plan_return"
  | "goal_progress"
  | "reflection"
  | "consistency";

/** Transparent building block of the alignment score */
export interface AlignmentFactor {
  type: AlignmentFactorType;
  label: string;
  /** Positive contribution to overall score (0–100 scale per factor) */
  contribution: number;
  explanation: string;
}

/**
 * Canonical alignment metric. Mood alone must not reduce the score.
 * Users are never ranked against each other.
 */
export interface AlignmentSnapshot {
  id: ID;
  userId: ID;
  date: DateString;
  /** 0–100 */
  overallScore: number;
  factors: AlignmentFactor[];
  summaryExplanation: string;
  goalId?: ID;
  planId?: ID;
  createdAt: DateTimeString;
}
