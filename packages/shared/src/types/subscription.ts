import type { DateTimeString, ID } from "./user";

export type SubscriptionTier = "free" | "premium";

export type SubscriptionStatus = "active" | "cancelled" | "past_due";

export type SubscriptionProvider = "stripe" | "iyzico" | "dev" | null;

/** User subscription record */
export interface Subscription {
  id: ID;
  userId: ID;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  provider?: SubscriptionProvider;
  providerSubscriptionId?: string;
  currentPeriodEnd?: DateTimeString;
  createdAt: DateTimeString;
  updatedAt: DateTimeString;
}

/** Feature limits for the current tier */
export interface PremiumLimits {
  maxGoals: number;
  maxSpaces: number;
  dataExport: boolean;
}

/** Current usage against limits */
export interface PremiumUsage {
  goals: number;
  spaces: number;
}
