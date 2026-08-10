import type { DateString, DateTimeString, ID } from "./user";

export type GoalStatus = "draft" | "active" | "completed" | "paused" | "archived";

/** 90-day transformation goal linked to a Future Self profile */
export interface Goal {
  id: ID;
  userId: ID;
  futureSelfId: ID;
  title: string;
  description: string;
  targetDate: DateString;
  durationDays: 90;
  status: GoalStatus;
  createdAt: DateTimeString;
  updatedAt: DateTimeString;
}

export type PlanStatus = "draft" | "active" | "completed" | "superseded";

/** Active 30-day plan derived from a Goal; version increments on weekly adaptation */
export interface Plan {
  id: ID;
  userId: ID;
  goalId: ID;
  title: string;
  startDate: DateString;
  endDate: DateString;
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
