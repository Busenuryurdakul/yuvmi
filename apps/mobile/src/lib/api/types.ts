import type { LifeDomain } from "@yuvmi/shared";

export type ApiErrorBody = {
  error?: { message: string; code: number };
  message?: string;
};

export type LoginResponse = {
  token: string;
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

export type PlanDiffResponse = {
  fromPlanId: string;
  toPlanId: string;
  fromVersion: number;
  toVersion: number;
  added: PlanResponse["steps"];
  removed: PlanResponse["steps"];
  changed: PlanResponse["steps"];
};

export type NotificationResponse = {
  id: string;
  title: string;
  body: string;
  type: string;
  data: Record<string, string>;
  readAt?: string;
  createdAt: string;
};

export type SpaceMemberResponse = {
  userId: string;
  displayName: string;
  email: string;
  role: "owner" | "member" | "viewer";
  status: "pending" | "active" | "left";
  joinedAt?: string;
};

export type SpaceInviteResponse = {
  id: string;
  spaceId: string;
  inviteeEmail: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
};

export type PendingSpaceInviteResponse = {
  id: string;
  spaceId: string;
  spaceName: string;
  spaceType: string;
  inviterName: string;
  role: string;
  expiresAt: string;
  createdAt: string;
};

export type SpaceResponse = {
  id: string;
  type: "couple" | "friends" | "family";
  name: string;
  ownerId: string;
  status: "draft" | "pending" | "active" | "archived";
  features: string[];
  myRole?: string;
  members: SpaceMemberResponse[];
  pendingInvites?: SpaceInviteResponse[];
  createdAt: string;
  updatedAt: string;
};

export type AssetResponse = {
  id: string;
  ownerId: string;
  spaceId?: string;
  type: "image" | "document";
  title: string;
  mimeType: string;
  fileSize: number;
  url?: string;
  visibility: "private" | "space_members" | "specific_members";
  revokedFromSpaceAt?: string;
  granteeIds?: string[];
  isOwner: boolean;
  aiProcessingAllowed: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PremiumLimitsResponse = {
  maxGoals: number;
  maxSpaces: number;
  dataExport: boolean;
};

export type PremiumUsageResponse = {
  goals: number;
  spaces: number;
};

export type SubscriptionResponse = {
  tier: "free" | "premium";
  status: "active" | "cancelled" | "past_due";
  limits: PremiumLimitsResponse;
  usage: PremiumUsageResponse;
  provider?: string;
  currentPeriodEnd?: string;
};

export type DataExportResponse = {
  filename: string;
  mimeType: string;
  data: Record<string, unknown>;
};
