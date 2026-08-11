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
  onboardingComplete: boolean;
};

export const AUTH_STORAGE_KEY = "yuvmi.auth.session";

export const DEV_OAUTH_PASSWORD = "yuvmi-dev-12345678";
