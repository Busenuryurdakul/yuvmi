import * as SecureStore from "expo-secure-store";
import { AUTH_STORAGE_KEY, type AuthUser } from "./types";

export async function loadStoredSession(): Promise<AuthUser | null> {
  try {
    const raw = await SecureStore.getItemAsync(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export async function persistSession(user: AuthUser): Promise<void> {
  await SecureStore.setItemAsync(AUTH_STORAGE_KEY, JSON.stringify(user));
}

export async function clearStoredSession(): Promise<void> {
  await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY);
}

export function isGoogleConfigured(): boolean {
  return Boolean(
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
      process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
      process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  );
}
