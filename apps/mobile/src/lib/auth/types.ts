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

export const DEV_OAUTH_PASSWORD = process.env.EXPO_PUBLIC_DEV_OAUTH_PASSWORD ?? "";

export function isDevAuthAllowed(): boolean {
  return __DEV__ || process.env.EXPO_PUBLIC_ALLOW_DEV_AUTH === "1";
}
