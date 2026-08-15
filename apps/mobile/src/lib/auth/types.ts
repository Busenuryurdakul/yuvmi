export type AuthProvider = "google" | "apple" | "email";

export type OAuthProfile = {
  id: string;
  email: string;
  displayName: string;
  provider: AuthProvider;
  avatarUrl?: string;
};

export type AuthUser = OAuthProfile & {
  token: string;
  refreshToken?: string;
  onboardingComplete: boolean;
};

export const AUTH_STORAGE_KEY = "yuvmi.auth.session";

/** Dev-only password shared with backend when YUVMI_ALLOW_DEV_OAUTH=1 */
export const DEV_OAUTH_PASSWORD = "yuvmi-dev-12345678";

export function isDevAuthAllowed(): boolean {
  return __DEV__ || process.env.EXPO_PUBLIC_ALLOW_DEV_AUTH === "1";
}
