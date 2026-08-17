export type AuthProvider = "email";

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  provider: AuthProvider;
  token: string;
  refreshToken?: string;
  onboardingComplete: boolean;
};

export const AUTH_STORAGE_KEY = "yuvmi.auth.session";
