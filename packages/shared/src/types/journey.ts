import type { DateString, DateTimeString, ID, LifeDomain, MoodLevel } from "./user";

export interface JourneyMilestone {
  id: ID;
  userId: ID;
  domain: LifeDomain;
  title: string;
  description?: string;
  targetDate?: DateString;
  completedAt?: DateTimeString;
  createdAt: DateTimeString;
}

/** Point-in-time personal progress for longitudinal charts (not user-vs-user) */
export interface ProgressSnapshot {
  id: ID;
  userId: ID;
  date: DateString;
  overallAlignment: number;
  domainScores: Partial<Record<LifeDomain, MoodLevel>>;
  streakDays: number;
  createdAt: DateTimeString;
}
