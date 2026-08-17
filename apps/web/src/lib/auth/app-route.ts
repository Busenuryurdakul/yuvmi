export const APP_LOGIN_PATH = "/app/login";
export const APP_ONBOARDING_PATH = "/app/onboarding";
export const APP_HOME_PATH = "/app";

export type AppAuthSnapshot = {
  isLoading: boolean;
  user: { onboardingComplete: boolean } | null;
};

/**
 * Destination for /app/* given auth + onboarding.
 * null = stay on the current path.
 */
export function resolveAppDestination(
  pathname: string,
  state: AppAuthSnapshot,
): string | null {
  if (state.isLoading) return null;

  if (!state.user) {
    return pathname === APP_LOGIN_PATH ? null : APP_LOGIN_PATH;
  }

  if (!state.user.onboardingComplete) {
    return pathname === APP_ONBOARDING_PATH ? null : APP_ONBOARDING_PATH;
  }

  if (pathname === APP_LOGIN_PATH || pathname === APP_ONBOARDING_PATH) {
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
