export type AuthProvider = "google" | "apple";

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  provider: AuthProvider;
  avatarUrl?: string;
};

export const AUTH_STORAGE_KEY = "yuvmi.auth.session";
