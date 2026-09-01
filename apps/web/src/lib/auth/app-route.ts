export const APP_LOGIN_PATH = "/app/login";
export const APP_ONBOARDING_PATH = "/app/onboarding";
export const APP_HOME_PATH = "/app";
export const RESET_PASSWORD_PATH = "/reset-password";
export const PASSWORD_CHANGE_REDIRECT_KEY = "yuvmi.auth.password-change-redirect";

export type AppAuthSnapshot = {
  isLoading: boolean;
  user: { onboardingComplete: boolean } | null;
};

export type LoginSearchParams = Pick<URLSearchParams, "get">;

export function isLoginSuccessScreen(
  pathname: string,
  searchParams?: LoginSearchParams,
  user: AppAuthSnapshot["user"] = null,
): boolean {
  if (pathname !== APP_LOGIN_PATH || !searchParams) return false;
  const hasSuccessFlag =
    searchParams.get("passwordChanged") === "1" || searchParams.get("reset") === "1";
  if (!hasSuccessFlag) return false;
  if (typeof window !== "undefined") {
    if (sessionStorage.getItem(PASSWORD_CHANGE_REDIRECT_KEY) === "1") return true;
  }
  return user === null;
}

/**
 * Destination for /app/* given auth + onboarding.
 * null = stay on the current path.
 */
export function resolveAppDestination(
  pathname: string,
  state: AppAuthSnapshot,
  searchParams?: LoginSearchParams,
): string | null {
  if (state.isLoading) return null;

  if (!state.user) {
    return pathname === APP_LOGIN_PATH ? null : APP_LOGIN_PATH;
  }

  if (!state.user.onboardingComplete) {
    return pathname === APP_ONBOARDING_PATH ? null : APP_ONBOARDING_PATH;
  }

  if (pathname === APP_LOGIN_PATH || pathname === APP_ONBOARDING_PATH) {
    if (isLoginSuccessScreen(pathname, searchParams, state.user)) return null;
    return APP_HOME_PATH;
  }

  return null;
}

export function isPublicAppPath(pathname: string) {
  return pathname === APP_LOGIN_PATH;
}

export function isOnboardingPath(pathname: string) {
  return pathname === APP_ONBOARDING_PATH;
}
