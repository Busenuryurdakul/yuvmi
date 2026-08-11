import type { DateString, DateTimeString, ID } from "./user";

export type GoalStatus = "draft" | "active" | "completed" | "paused" | "archived";

/** User-defined goal — no fixed duration; pace is personal */
export interface Goal {
  id: ID;
  userId: ID;
  futureSelfId?: ID;
  title: string;
  description: string;
  /** Optional milestone the user sets for themselves */
  targetDate?: DateString;
  status: GoalStatus;
  createdAt: DateTimeString;
  updatedAt: DateTimeString;
}

export type PlanStatus = "draft" | "active" | "completed" | "superseded";

/** Personal plan or process step collection — flexible length, user-driven */
export interface Plan {
  id: ID;
  userId: ID;
  goalId?: ID;
  title: string;
  description?: string;
  status: PlanStatus;
  version: number;
  createdAt: DateTimeString;
  updatedAt: DateTimeString;
}

export type TaskStatus = "pending" | "in_progress" | "completed" | "skipped";

/** Single personalized micro-step for a given day */
export interface DailyTask {
  id: ID;
  userId: ID;
  planId: ID;
  date: DateString;
  title: string;
  description: string;
  status: TaskStatus;
  completedAt?: DateTimeString;
  /** Skipping does not penalize alignment score */
  skippedReason?: string;
  createdAt: DateTimeString;
  updatedAt: DateTimeString;
}

export type WeeklyReviewStatus = "pending" | "generating" | "ready" | "applied";

/** AI-generated weekly evaluation that may produce the next Plan version */
export interface WeeklyReview {
  id: ID;
  userId: ID;
  planId: ID;
  weekStartDate: DateString;
  summary: string;
  adaptations: string[];
  nextPlanVersion?: number;
  status: WeeklyReviewStatus;
  createdAt: DateTimeString;
  updatedAt: DateTimeString;
}
