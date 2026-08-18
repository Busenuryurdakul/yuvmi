import { apiRequest, apiUpload } from "./client";
import { getApiBaseUrl } from "./config";
import type {
  AIDecision,
  AIJobResponse,
  AlignmentResponse,
  AssetResponse,
  ConsentResponse,
  GoalSuggestionsResponse,
  PlanSuggestionsResponse,
  CheckinResponse,  DailyTaskResponse,
  FutureSelfResponse,
  GoalResponse,
  LoginResponse,
  NotificationResponse,
  PearlAwardResponse,
  PearlBalanceResponse,
  PendingSpaceInviteResponse,
  PlanDiffResponse,
  PlanResponse,
  SpaceInviteResponse,
  SpaceResponse,
  SpendPearlsResponse,
  UserProfileResponse,
  WeeklyReviewResponse,
} from "./types";
import type { ConsentScope, LifeDomain } from "@yuvmi/shared";

export async function registerUser(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}) {
  return apiRequest<{ id: string; email: string }>("/api/v1/auth/register", {
    method: "POST",
    body: {
      email: input.email,
      password: input.password,
      first_name: input.firstName,
      last_name: input.lastName,
    },
  });
}

export async function loginUser(email: string, password: string) {
  return apiRequest<LoginResponse>("/api/v1/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export async function oauthLogin(input: {
  provider: "google" | "apple";
  idToken: string;
  firstName?: string;
  lastName?: string;
}) {
  return apiRequest<LoginResponse>("/api/v1/auth/oauth", {
    method: "POST",
    body: {
      provider: input.provider,
      id_token: input.idToken,
      first_name: input.firstName,
      last_name: input.lastName,
    },
  });
}

export async function refreshAuthToken(refreshToken: string) {
  return apiRequest<LoginResponse>("/api/v1/auth/refresh", {
    method: "POST",
    body: { refresh_token: refreshToken },
  });
}

export async function forgotPassword(email: string) {
  return apiRequest<{ message: string }>("/api/v1/auth/forgot-password", {
    method: "POST",
    body: { email },
  });
}

export async function resetPassword(token: string, newPassword: string) {
  return apiRequest<{ message: string }>("/api/v1/auth/reset-password", {
    method: "POST",
    body: { token, new_password: newPassword },
  });
}

export async function deleteAccount(password?: string) {
  return apiRequest<void>("/api/v1/me/account", {
    method: "DELETE",
    body: password ? { password } : {},
  });
}

export async function fetchMe() {
  return apiRequest<UserProfileResponse>("/api/v1/me");
}

/** The route is registered as PATCH, not PUT — a PUT here 405s. There is no
 *  pearlBalance field on purpose: the balance is server-owned and read-only. */
export async function updateMe(body: {
  displayName?: string;
  avatarUrl?: string;
  locale?: string;
  timezone?: string;
}) {
  return apiRequest<UserProfileResponse>("/api/v1/me", { method: "PATCH", body });
}

export async function createFutureSelf(body: {
  title: string;
  description: string;
  domains: string[];
  affirmations: string[];
  visionItems: Array<{ domain: string; title: string; sortOrder: number }>;
}) {
  return apiRequest<FutureSelfResponse>("/api/v1/future-selfs", { method: "POST", body });
}

export async function fetchFutureSelf() {
  return apiRequest<FutureSelfResponse>("/api/v1/future-selfs/me");
}

export async function updateFutureSelf(body: {
  title: string;
  description: string;
  domains: string[];
  affirmations: string[];
  visionItems: Array<{ domain: string; title: string; sortOrder: number }>;
}) {
  return apiRequest<FutureSelfResponse>("/api/v1/future-selfs/me", { method: "PUT", body });
}

export async function approveFutureSelf() {
  return apiRequest<FutureSelfResponse>("/api/v1/future-selfs/me/approve", {
    method: "POST",
    body: {},
  });
}

export async function createGoal(body: {
  futureSelfId?: string;
  title: string;
  description: string;
  targetDate?: string;
}) {
  return apiRequest<GoalResponse>("/api/v1/goals", { method: "POST", body });
}

export async function fetchActiveGoal() {
  return apiRequest<GoalResponse>("/api/v1/goals/active");
}

export async function fetchCurrentGoal() {
  return apiRequest<GoalResponse>("/api/v1/goals/current");
}

export async function updateGoal(body: {
  futureSelfId?: string;
  title: string;
  description: string;
  targetDate?: string;
}) {
  return apiRequest<GoalResponse>("/api/v1/goals/current", { method: "PUT", body });
}

export async function createPlan(body: {
  goalId?: string;
  title: string;
  description?: string;
  steps: Array<{ dayOffset: number; title: string; description: string; sortOrder: number }>;
}) {
  return apiRequest<PlanResponse>("/api/v1/plans", { method: "POST", body });
}

export async function activatePlan(planId: string) {
  return apiRequest<PlanResponse>(`/api/v1/plans/${planId}/activate`, {
    method: "POST",
    body: {},
  });
}

export async function fetchTodayTask() {
  return apiRequest<DailyTaskResponse>("/api/v1/tasks/today");
}

export async function completeTask(taskId: string) {
  return apiRequest<DailyTaskResponse>(`/api/v1/tasks/${taskId}/complete`, {
    method: "POST",
    body: {},
  });
}

export async function skipTask(taskId: string, reason?: string) {
  return apiRequest<DailyTaskResponse>(`/api/v1/tasks/${taskId}/skip`, {
    method: "POST",
    body: { reason },
  });
}

export async function fetchPearlBalance() {
  return apiRequest<PearlBalanceResponse>("/api/v1/pearls/balance");
}

/**
 * Deducts the cost of a cosmetic purchase server-side. The client sends what it
 * wants to buy, never the resulting balance — the server owns the arithmetic,
 * so a purchase survives leaving the screen instead of being overwritten by the
 * next balance refetch.
 */
export async function spendPearls(item: string, amount: number) {
  return apiRequest<SpendPearlsResponse>("/api/v1/pearls/spend", {
    method: "POST",
    body: { item, amount },
  });
}

export async function confirmNotificationDesign() {
  return apiRequest<PearlAwardResponse>("/api/v1/notifications/design/confirm", {
    method: "POST",
    body: {},
  });
}

export async function recordWaveSurvived() {
  return apiRequest<PearlAwardResponse>("/api/v1/waves/survive", {
    method: "POST",
    body: {},
  });
}

export async function fetchTodayCheckin() {
  return apiRequest<CheckinResponse>("/api/v1/checkins/today");
}

export async function upsertCheckin(body: {
  mood: number;
  energy: number;
  gratitude: string[];
  reflection: string;
  domainScores?: Partial<Record<LifeDomain, number>>;
}) {
  return apiRequest<CheckinResponse>("/api/v1/checkins/today", {
    method: "PUT",
    body,
  });
}

export async function fetchTodayAlignment() {
  return apiRequest<AlignmentResponse>("/api/v1/alignment/today");
}

export async function fetchAlignmentHistory() {
  return apiRequest<AlignmentResponse[]>("/api/v1/alignment/history");
}

export async function fetchActivePlan() {
  return apiRequest<PlanResponse>("/api/v1/plans/active");
}

export async function fetchPlans() {
  return apiRequest<PlanResponse[]>("/api/v1/plans");
}

export async function fetchPlan(planId: string) {
  return apiRequest<PlanResponse>(`/api/v1/plans/${planId}`);
}

export async function fetchPlanDiff(fromId: string, toId: string) {
  return apiRequest<PlanDiffResponse>(`/api/v1/plans/${fromId}/diff/${toId}`);
}

export async function revisePlan(body: {
  basePlanId: string;
  title?: string;
  description?: string;
  steps?: Array<{ dayOffset: number; title: string; description: string; sortOrder: number }>;
  activate?: boolean;
}) {
  return apiRequest<PlanResponse>("/api/v1/plans/revise", { method: "POST", body });
}

export async function fetchCurrentWeeklyReview() {
  return apiRequest<WeeklyReviewResponse>("/api/v1/weekly-reviews/current");
}

export async function fetchWeeklyReviews() {
  return apiRequest<WeeklyReviewResponse[]>("/api/v1/weekly-reviews");
}

export async function updateWeeklyReview(reviewId: string, reflection: string) {
  return apiRequest<WeeklyReviewResponse>(`/api/v1/weekly-reviews/${reviewId}`, {
    method: "PATCH",
    body: { reflection },
  });
}

export async function applyWeeklyReview(reviewId: string) {
  return apiRequest<PlanResponse>(`/api/v1/weekly-reviews/${reviewId}/apply`, {
    method: "POST",
    body: {},
  });
}

export async function registerPushToken(pushToken: string) {
  return apiRequest<void>("/api/v1/notifications/token", {
    method: "POST",
    body: { token: pushToken, platform: "expo" },
  });
}

export async function sendTestPush() {
  return apiRequest<void>("/api/v1/notifications/test", { method: "POST", body: {} });
}

export async function fetchNotifications() {
  return apiRequest<NotificationResponse[]>("/api/v1/notifications");
}

export async function fetchUnreadNotificationCount() {
  return apiRequest<{ count: number }>("/api/v1/notifications/unread-count");
}

export async function markNotificationRead(notificationId: string) {
  return apiRequest<void>(`/api/v1/notifications/${notificationId}/read`, {
    method: "POST",
    body: {},
  });
}

export async function fetchSpaces() {
  return apiRequest<SpaceResponse[]>("/api/v1/spaces");
}

export async function createSpace(body: { type: string; name?: string }) {
  return apiRequest<SpaceResponse>("/api/v1/spaces", { method: "POST", body });
}

export async function fetchSpace(spaceId: string) {
  return apiRequest<SpaceResponse>(`/api/v1/spaces/${spaceId}`);
}

export async function createSpaceInvite(spaceId: string, inviteeEmail: string) {
  return apiRequest<SpaceInviteResponse>(`/api/v1/spaces/${spaceId}/invites`, {
    method: "POST",
    body: { inviteeEmail },
  });
}

export async function fetchPendingSpaceInvites() {
  return apiRequest<PendingSpaceInviteResponse[]>("/api/v1/spaces/invites/pending");
}

export async function acceptSpaceInvite(inviteId: string) {
  return apiRequest<SpaceResponse>(`/api/v1/spaces/invites/${inviteId}/accept`, {
    method: "POST",
    body: {},
  });
}

export async function declineSpaceInvite(inviteId: string) {
  return apiRequest<void>(`/api/v1/spaces/invites/${inviteId}/decline`, {
    method: "POST",
    body: {},
  });
}

export async function leaveSpace(spaceId: string) {
  return apiRequest<void>(`/api/v1/spaces/${spaceId}/leave`, {
    method: "POST",
    body: {},
  });
}

export async function fetchMyAssets() {
  return apiRequest<AssetResponse[]>("/api/v1/assets");
}

export async function fetchSpaceAssets(spaceId: string) {
  return apiRequest<AssetResponse[]>(`/api/v1/spaces/${spaceId}/assets`);
}

export async function fetchAsset(assetId: string) {
  return apiRequest<AssetResponse>(`/api/v1/assets/${assetId}`);
}

export async function uploadAsset(
  file: { uri: string; name: string; type: string },
  title?: string,
) {
  const form = new FormData();
  form.append("file", file);
  if (title) form.append("title", title);
  return apiUpload<AssetResponse>("/api/v1/assets/upload", form);
}

export async function shareAsset(
  assetId: string,
  body: {
    visibility: "private" | "space_members" | "specific_members";
    spaceId?: string;
    granteeIds?: string[];
  },
) {
  return apiRequest<AssetResponse>(`/api/v1/assets/${assetId}/share`, {
    method: "PATCH",
    body,
  });
}

export async function revokeAssetFromSpace(assetId: string) {
  return apiRequest<AssetResponse>(`/api/v1/assets/${assetId}/revoke-from-space`, {
    method: "POST",
    body: {},
  });
}

export function assetContentUrl(asset: AssetResponse) {
  return asset.url ? `${getApiBaseUrl()}${asset.url}` : "";
}

export async function fetchSubscription() {
  return apiRequest<import("./types").SubscriptionResponse>("/api/v1/subscription");
}

export async function devUpgradeSubscription() {
  return apiRequest<import("./types").SubscriptionResponse>("/api/v1/subscription/dev-upgrade", {
    method: "POST",
    body: {},
  });
}

export async function createSubscriptionCheckout() {
  return apiRequest<import("./types").CheckoutSessionResponse>("/api/v1/subscription/checkout", {
    method: "POST",
    body: {},
  });
}

export async function cancelSubscription() {
  return apiRequest<import("./types").SubscriptionResponse>("/api/v1/subscription/cancel", {
    method: "POST",
    body: {},
  });
}

export async function exportUserData() {
  return apiRequest<import("./types").DataExportResponse>("/api/v1/export");
}

/* --- AI (consent + öneriler) --- */

/** Returns every known scope, including ones the user has never decided on
 *  (as `granted: false`), so the caller never has to know the scope list. */
export async function fetchConsents() {
  return apiRequest<ConsentResponse[]>("/api/v1/consents");
}

export async function updateConsent(scope: ConsentScope, granted: boolean) {
  return apiRequest<ConsentResponse>(`/api/v1/consents/${scope}`, {
    method: "PUT",
    body: { granted },
  });
}

/**
 * Asks the server for goal ideas built from the user's own Future Self profile.
 *
 * No request body: the server reads the profile it already stores, so the
 * client never assembles or transmits the personal context itself.
 *
 * Throws rather than returning a fallback. The caller decides what to show —
 * for onboarding that is the local static list — because the fallback copy
 * lives in the app and must not be duplicated server-side.
 */
export async function fetchGoalSuggestions() {
  return apiRequest<GoalSuggestionsResponse>("/api/v1/ai/goal-suggestions", {
    method: "POST",
    body: {},
  });
}

/** Same contract as fetchGoalSuggestions, built from Future Self + the active
 *  goal. Requires the ai_plan_generation scope. */
export async function fetchPlanSuggestions() {
  return apiRequest<PlanSuggestionsResponse>("/api/v1/ai/plan-suggestions", {
    method: "POST",
    body: {},
  });
}

export async function fetchAIJob(jobId: string) {
  return apiRequest<AIJobResponse>(`/api/v1/ai/jobs/${jobId}`);
}

/**
 * Reports what the user did with a suggestion, which is the label half of the
 * training pair — the model's output alone teaches nothing about whether
 * producing it was right.
 *
 * Fire-and-forget by design: callers should not await this on a user-visible
 * path or surface its failure. Losing one label is invisible; making someone
 * wait on a bookkeeping call to accept their own plan is not. `finalOutput`
 * only means something with "edited" and is ignored otherwise.
 */
export async function reportAIDecision(
  jobId: string,
  decision: AIDecision,
  finalOutput?: unknown,
) {
  return apiRequest<void>(`/api/v1/ai/jobs/${jobId}/decision`, {
    method: "POST",
    body: decision === "edited" && finalOutput !== undefined ? { decision, finalOutput } : { decision },
  });
}
