import { apiRequest } from "./client";
import type {
  AlignmentResponse,
  CheckinResponse,
  DailyTaskResponse,
  FutureSelfResponse,
  GoalResponse,
  LoginResponse,
  PlanResponse,
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

export async function deleteAccount(token: string, password?: string) {
  return apiRequest<void>("/api/v1/me/account", {
    method: "DELETE",
    token,
    body: password ? { password } : {},
  });
}

export async function logoutUser(accessToken: string, refreshToken: string) {
  return apiRequest<void>("/api/v1/auth/logout", {
    method: "POST",
    token: accessToken,
    body: { refresh_token: refreshToken },
    skipAuthRefresh: true,
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

export async function updateFutureSelf(
  token: string,
  body: {
    title: string;
    description: string;
    domains: LifeDomain[];
    affirmations: string[];
    visionItems: Array<{ domain: LifeDomain; title: string; sortOrder: number }>;
  },
) {
  return apiRequest<FutureSelfResponse>("/api/v1/future-selfs/me", {
    token,
    method: "PUT",
    body,
  });
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

export async function fetchCurrentWeeklyReview(token: string) {
  return apiRequest<WeeklyReviewResponse>("/api/v1/weekly-reviews/current", { token });
}

export async function applyWeeklyReview(token: string, reviewId: string) {
  return apiRequest<PlanResponse>(`/api/v1/weekly-reviews/${reviewId}/apply`, {
    token,
    method: "POST",
    body: {},
  });
}
