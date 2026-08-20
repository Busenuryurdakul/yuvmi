import { apiRequest, apiUpload } from "./client";
import { getApiBaseUrl } from "./config";
import type {
  AlignmentResponse,
  AssetResponse,
  CheckinResponse,  DailyTaskResponse,
  FutureSelfResponse,
  GoalResponse,
  LoginResponse,
  NotificationResponse,
  PendingSpaceInviteResponse,
  PlanDiffResponse,
  PlanResponse,
  SpaceInviteResponse,
  SpaceResponse,
  UserProfileResponse,
  WeeklyReviewResponse,
} from "./types";
import type { LifeDomain } from "@yuvmi/shared";

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

export async function resendVerification(email: string) {
  return apiRequest<{ message: string }>("/api/v1/auth/resend-verification", {
    method: "POST",
    body: { email },
  });
}

export async function verifyEmail(token: string) {
  return apiRequest<{ message: string }>("/api/v1/auth/verify-email", {
    method: "POST",
    body: { token },
  });
}

export async function deleteAccount(token: string, password?: string) {
  return apiRequest<void>("/api/v1/me/account", {
    method: "DELETE",
    token,
    body: password ? { password } : {},
  });
}

export async function fetchMe(token: string) {
  return apiRequest<UserProfileResponse>("/api/v1/me", { token });
}

export async function createFutureSelf(
  token: string,
  body: {
    title: string;
    description: string;
    domains: LifeDomain[];
    affirmations: string[];
    visionItems: Array<{ domain: LifeDomain; title: string; sortOrder: number }>;
  },
) {
  return apiRequest<FutureSelfResponse>("/api/v1/future-selfs", { token, method: "POST", body });
}

export async function fetchFutureSelf(token: string) {
  return apiRequest<FutureSelfResponse>("/api/v1/future-selfs/me", { token });
}

export async function approveFutureSelf(token: string) {
  return apiRequest<FutureSelfResponse>("/api/v1/future-selfs/me/approve", {
    token,
    method: "POST",
    body: {},
  });
}

export async function createGoal(
  token: string,
  body: { futureSelfId?: string; title: string; description: string; targetDate?: string },
) {
  return apiRequest<GoalResponse>("/api/v1/goals", { token, method: "POST", body });
}

export async function fetchActiveGoal(token: string) {
  return apiRequest<GoalResponse>("/api/v1/goals/active", { token });
}

export async function createPlan(
  token: string,
  body: {
    goalId?: string;
    title: string;
    description?: string;
    steps: Array<{ dayOffset: number; title: string; description: string; sortOrder: number }>;
  },
) {
  return apiRequest<PlanResponse>("/api/v1/plans", { token, method: "POST", body });
}

export async function activatePlan(token: string, planId: string) {
  return apiRequest<PlanResponse>(`/api/v1/plans/${planId}/activate`, {
    token,
    method: "POST",
    body: {},
  });
}

export async function fetchTodayTask(token: string) {
  return apiRequest<DailyTaskResponse>("/api/v1/tasks/today", { token });
}

export async function completeTask(token: string, taskId: string) {
  return apiRequest<DailyTaskResponse>(`/api/v1/tasks/${taskId}/complete`, {
    token,
    method: "POST",
    body: {},
  });
}

export async function skipTask(token: string, taskId: string, reason?: string) {
  return apiRequest<DailyTaskResponse>(`/api/v1/tasks/${taskId}/skip`, {
    token,
    method: "POST",
    body: { reason },
  });
}

export async function fetchTodayCheckin(token: string) {
  return apiRequest<CheckinResponse>("/api/v1/checkins/today", { token });
}

export async function upsertCheckin(
  token: string,
  body: {
    mood: number;
    energy: number;
    gratitude: string[];
    reflection: string;
    domainScores?: Partial<Record<LifeDomain, number>>;
  },
) {
  return apiRequest<CheckinResponse>("/api/v1/checkins/today", {
    token,
    method: "PUT",
    body,
  });
}

export async function fetchTodayAlignment(token: string) {
  return apiRequest<AlignmentResponse>("/api/v1/alignment/today", { token });
}

export async function fetchAlignmentHistory(token: string) {
  return apiRequest<AlignmentResponse[]>("/api/v1/alignment/history", { token });
}

export async function fetchActivePlan(token: string) {
  return apiRequest<PlanResponse>("/api/v1/plans/active", { token });
}

export async function fetchPlans(token: string) {
  return apiRequest<PlanResponse[]>("/api/v1/plans", { token });
}

export async function fetchPlan(token: string, planId: string) {
  return apiRequest<PlanResponse>(`/api/v1/plans/${planId}`, { token });
}

export async function fetchPlanDiff(token: string, fromId: string, toId: string) {
  return apiRequest<PlanDiffResponse>(`/api/v1/plans/${fromId}/diff/${toId}`, { token });
}

export async function revisePlan(
  token: string,
  body: {
    basePlanId: string;
    title?: string;
    description?: string;
    steps?: Array<{ dayOffset: number; title: string; description: string; sortOrder: number }>;
    activate?: boolean;
  },
) {
  return apiRequest<PlanResponse>("/api/v1/plans/revise", { token, method: "POST", body });
}

export async function fetchCurrentWeeklyReview(token: string) {
  return apiRequest<WeeklyReviewResponse>("/api/v1/weekly-reviews/current", { token });
}

export async function fetchWeeklyReviews(token: string) {
  return apiRequest<WeeklyReviewResponse[]>("/api/v1/weekly-reviews", { token });
}

export async function updateWeeklyReview(token: string, reviewId: string, reflection: string) {
  return apiRequest<WeeklyReviewResponse>(`/api/v1/weekly-reviews/${reviewId}`, {
    token,
    method: "PATCH",
    body: { reflection },
  });
}

export async function applyWeeklyReview(token: string, reviewId: string) {
  return apiRequest<PlanResponse>(`/api/v1/weekly-reviews/${reviewId}/apply`, {
    token,
    method: "POST",
    body: {},
  });
}

export async function registerPushToken(token: string, pushToken: string) {
  return apiRequest<void>("/api/v1/notifications/token", {
    token,
    method: "POST",
    body: { token: pushToken, platform: "expo" },
  });
}

export async function sendTestPush(token: string) {
  return apiRequest<void>("/api/v1/notifications/test", { token, method: "POST", body: {} });
}

export async function fetchNotifications(token: string) {
  return apiRequest<NotificationResponse[]>("/api/v1/notifications", { token });
}

export async function fetchUnreadNotificationCount(token: string) {
  return apiRequest<{ count: number }>("/api/v1/notifications/unread-count", { token });
}

export async function markNotificationRead(token: string, notificationId: string) {
  return apiRequest<void>(`/api/v1/notifications/${notificationId}/read`, {
    token,
    method: "POST",
    body: {},
  });
}

export async function fetchSpaces(token: string) {
  return apiRequest<SpaceResponse[]>("/api/v1/spaces", { token });
}

export async function createSpace(token: string, body: { type: string; name?: string }) {
  return apiRequest<SpaceResponse>("/api/v1/spaces", { token, method: "POST", body });
}

export async function fetchSpace(token: string, spaceId: string) {
  return apiRequest<SpaceResponse>(`/api/v1/spaces/${spaceId}`, { token });
}

export async function createSpaceInvite(token: string, spaceId: string, inviteeEmail: string) {
  return apiRequest<SpaceInviteResponse>(`/api/v1/spaces/${spaceId}/invites`, {
    token,
    method: "POST",
    body: { inviteeEmail },
  });
}

export async function fetchPendingSpaceInvites(token: string) {
  return apiRequest<PendingSpaceInviteResponse[]>("/api/v1/spaces/invites/pending", { token });
}

export async function acceptSpaceInvite(token: string, inviteId: string) {
  return apiRequest<SpaceResponse>(`/api/v1/spaces/invites/${inviteId}/accept`, {
    token,
    method: "POST",
    body: {},
  });
}

export async function declineSpaceInvite(token: string, inviteId: string) {
  return apiRequest<void>(`/api/v1/spaces/invites/${inviteId}/decline`, {
    token,
    method: "POST",
    body: {},
  });
}

export async function leaveSpace(token: string, spaceId: string) {
  return apiRequest<void>(`/api/v1/spaces/${spaceId}/leave`, {
    token,
    method: "POST",
    body: {},
  });
}

export async function fetchMyAssets(token: string) {
  return apiRequest<AssetResponse[]>("/api/v1/assets", { token });
}

export async function fetchSpaceAssets(token: string, spaceId: string) {
  return apiRequest<AssetResponse[]>(`/api/v1/spaces/${spaceId}/assets`, { token });
}

export async function fetchAsset(token: string, assetId: string) {
  return apiRequest<AssetResponse>(`/api/v1/assets/${assetId}`, { token });
}

export async function uploadAsset(
  token: string,
  file: { uri: string; name: string; type: string },
  title?: string,
) {
  const form = new FormData();
  form.append("file", { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
  if (title) form.append("title", title);
  return apiUpload<AssetResponse>("/api/v1/assets/upload", token, form);
}

export async function shareAsset(
  token: string,
  assetId: string,
  body: {
    visibility: "private" | "space_members" | "specific_members";
    spaceId?: string;
    granteeIds?: string[];
  },
) {
  return apiRequest<AssetResponse>(`/api/v1/assets/${assetId}/share`, {
    token,
    method: "PATCH",
    body,
  });
}

export async function revokeAssetFromSpace(token: string, assetId: string) {
  return apiRequest<AssetResponse>(`/api/v1/assets/${assetId}/revoke-from-space`, {
    token,
    method: "POST",
    body: {},
  });
}

export function assetContentUrl(asset: AssetResponse) {
  return asset.url ? `${getApiBaseUrl()}${asset.url}` : "";
}

export async function fetchSubscription(token: string) {
  return apiRequest<import("./types").SubscriptionResponse>("/api/v1/subscription", { token });
}

export async function devUpgradeSubscription(token: string) {
  return apiRequest<import("./types").SubscriptionResponse>("/api/v1/subscription/dev-upgrade", {
    token,
    method: "POST",
    body: {},
  });
}

export async function createSubscriptionCheckout(token: string) {
  return apiRequest<import("./types").CheckoutSessionResponse>("/api/v1/subscription/checkout", {
    token,
    method: "POST",
    body: {},
  });
}

export async function cancelSubscription(token: string) {
  return apiRequest<import("./types").SubscriptionResponse>("/api/v1/subscription/cancel", {
    token,
    method: "POST",
    body: {},
  });
}

export async function exportUserData(token: string) {
  return apiRequest<import("./types").DataExportResponse>("/api/v1/export", { token });
}
