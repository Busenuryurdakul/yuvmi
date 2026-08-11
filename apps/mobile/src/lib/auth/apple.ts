import * as AppleAuthentication from "expo-apple-authentication";
import { Platform } from "react-native";
import type { OAuthProfile } from "./types";

type AppleSignInResult =
  | { ok: true; user: OAuthProfile; identityToken: string }
  | { ok: false; reason: "cancelled" | "unavailable" | "failed"; message?: string };

export async function signInWithAppleNative(): Promise<AppleSignInResult> {
  if (Platform.OS !== "ios") {
    return { ok: false, reason: "unavailable", message: "Apple ile giriş yalnızca iOS'ta kullanılabilir." };
  }

  const available = await AppleAuthentication.isAvailableAsync();
  if (!available) {
    return { ok: false, reason: "unavailable", message: "Bu cihazda Apple ile giriş desteklenmiyor." };
  }

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    const displayName = [credential.fullName?.givenName, credential.fullName?.familyName]
      .filter(Boolean)
      .join(" ")
      .trim();

    if (!credential.identityToken) {
      return { ok: false, reason: "failed", message: "Apple kimlik jetonu alınamadı." };
    }

    return {
      ok: true,
      identityToken: credential.identityToken,
      user: {
        id: credential.user,
        email: credential.email ?? "apple-user@yuvmi.app",
        displayName: displayName || "Apple Kullanıcısı",
        provider: "apple",
      },
    };
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code?: string }).code === "ERR_REQUEST_CANCELED"
    ) {
      return { ok: false, reason: "cancelled" };
    }

    return {
      ok: false,
      reason: "failed",
      message: error instanceof Error ? error.message : "Apple ile giriş başarısız.",
    };
  }
}

export function createDevAppleUser(): OAuthProfile {
  return {
    id: "dev-apple-user",
    email: "dev@yuvmi.app",
    displayName: "Geliştirici (Apple)",
    provider: "apple",
  };
}
