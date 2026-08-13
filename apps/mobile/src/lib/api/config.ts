import Constants from "expo-constants";
import { NativeModules, Platform } from "react-native";

type ExpoConstants = {
  expoConfig?: { hostUri?: string | null };
  expoGoConfig?: { debuggerHost?: string | null };
};

function isLoopback(value: string): boolean {
  return /localhost|127\.0\.0\.1/.test(value);
}

function hostFromScriptUrl(): string | null {
  const scriptURL = NativeModules.SourceCode?.scriptURL as string | undefined;
  if (!scriptURL) return null;
  try {
    const url = new URL(scriptURL);
    if (!url.hostname || isLoopback(url.hostname)) return null;
    return url.host;
  } catch {
    return null;
  }
}

function hostFromExpoConstants(): string | null {
  const extras = Constants as ExpoConstants;
  const raw = extras.expoGoConfig?.debuggerHost || extras.expoConfig?.hostUri || "";
  if (!raw) return null;
  const host = raw.replace(/^https?:\/\//, "").split("/")[0];
  if (!host || isLoopback(host)) return null;
  return host;
}

/** Metro origin in Expo Go — LAN, USB, or tunnel. Metro proxies `/api` to Go. */
function metroOrigin(): string | null {
  const host = hostFromScriptUrl() ?? hostFromExpoConstants();
  if (!host) return null;
  const tunneled = /exp\.direct|exp\.host|ngrok|tunnel/.test(host);
  return `${tunneled ? "https" : "http"}://${host}`;
}

export function getApiBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
  if (explicit && !isLoopback(explicit)) return explicit;

  if (Platform.OS === "web" && typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  return metroOrigin() ?? (explicit || "http://localhost:8080");
}
