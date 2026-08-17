import type { LifeDomain } from "@yuvmi/shared";

export type LoginResponse = {
  token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    status: string;
    created_at: string;
  };
};

export type UserProfileResponse = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  locale: string;
  timezone: string;
  onboardingComplete: boolean;
  createdAt: string;
};

export type FutureSelfResponse = {
  id: string;
  title: string;
  description: string;
  domains: LifeDomain[];
  affirmations: string[];
  visionItems: Array<{
    id: string;
    domain: LifeDomain;
    title: string;
    imageUrl?: string;
    note?: string;
    sortOrder: number;
  }>;
  status: "draft" | "approved";
  createdAt: string;
  updatedAt: string;
};

export type GoalResponse = {
  id: string;
  futureSelfId?: string;
  title: string;
  description: string;
  targetDate?: string;
  status: string;
  createdAt: string;
};

export type PlanResponse = {
  id: string;
  goalId?: string;
  title: string;
  description?: string;
  status: string;
  version: number;
  steps: Array<{
    id: string;
    dayOffset: number;
    title: string;
    description: string;
    sortOrder: number;
  }>;
  createdAt: string;
};

export type DailyTaskResponse = {
  id: string;
  planId: string;
  date: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "skipped";
  completedAt?: string;
  skippedReason?: string;
};

export type CheckinResponse = {
  id: string;
  date: string;
  mood: number;
  energy: number;
  gratitude: string[];
  reflection: string;
  domainScores: Partial<Record<LifeDomain, number>>;
  createdAt: string;
};

export type AlignmentResponse = {
  id: string;
  date: string;
  overallScore: number;
  factors: Array<{
    type: string;
    label: string;
    contribution: number;
    explanation: string;
  }>;
  summaryExplanation: string;
  goalId?: string;
  planId?: string;
};

export type WeeklyReviewMetrics = {
  checkinCount: number;
  taskCompleted: number;
  taskSkipped: number;
  avgMood: number;
  avgEnergy: number;
  avgAlignment: number;
  daysActive: number;
};

export type WeeklyReviewResponse = {
  id: string;
  planId: string;
  weekStartDate: string;
  summary: string;
  adaptations: string[];
  metrics: WeeklyReviewMetrics;
  reflection: string;
  nextPlanVersion?: number;
  status: "pending" | "generating" | "ready" | "applied";
  createdAt: string;
};
