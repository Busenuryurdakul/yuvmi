import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { isGoogleConfigured } from "./session";
import type { OAuthProfile } from "./types";

WebBrowser.maybeCompleteAuthSession();

type GoogleSignInResult =
  | { ok: true; user: OAuthProfile; idToken: string }
  | { ok: false; reason: "cancelled" | "unconfigured" | "failed"; message?: string };

/** Hook requires a non-empty webClientId on web; real auth still gated by isGoogleConfigured(). */
const UNCONFIGURED_WEB_CLIENT_ID =
  "000000000000-yuvmi-unconfigured.apps.googleusercontent.com";

export function useGoogleAuthRequest() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId:
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || UNCONFIGURED_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  });

  return { request, response, promptAsync };
}

export async function promptGoogleSignIn(
  promptAsync: ReturnType<typeof Google.useAuthRequest>[2],
  request: ReturnType<typeof Google.useAuthRequest>[0],
): Promise<GoogleSignInResult> {
  if (!isGoogleConfigured()) {
    return { ok: false, reason: "unconfigured" };
  }

  if (!request) {
    return { ok: false, reason: "failed", message: "Google auth isteği hazır değil." };
  }

  const result = await promptAsync();

  if (result.type === "cancel" || result.type === "dismiss") {
    return { ok: false, reason: "cancelled" };
  }

  if (result.type !== "success") {
    return { ok: false, reason: "failed", message: "Google ile giriş tamamlanamadı." };
  }

  const accessToken = result.authentication?.accessToken;
  const idToken = result.authentication?.idToken;
  if (!accessToken || !idToken) {
    return { ok: false, reason: "failed", message: "Google jetonları alınamadı." };
  }

  const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!profileResponse.ok) {
    return { ok: false, reason: "failed", message: "Google profili okunamadı." };
  }

  const profile = (await profileResponse.json()) as {
    sub: string;
    email?: string;
    name?: string;
    picture?: string;
  };

  return {
    ok: true,
    idToken,
    user: {
      id: profile.sub,
      email: profile.email ?? "google-user@yuvmi.app",
      displayName: profile.name ?? "Yuvmi Kullanıcısı",
      provider: "google",
      avatarUrl: profile.picture,
    },
  };
}

export function createDevGoogleUser(): OAuthProfile {
  return {
    id: "dev-google-user",
    email: "dev@yuvmi.app",
    displayName: "Geliştirici (Google)",
    provider: "google",
  };
}
