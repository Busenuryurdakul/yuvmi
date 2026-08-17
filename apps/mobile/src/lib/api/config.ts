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

function webOrigin(): string | null {
  if (Platform.OS !== "web") return null;
  if (typeof window === "undefined") return null;
  return window.location?.origin ?? null;
}

/**
 * Resolves the API base URL.
 *
 * Release builds must be told the API address at build time and it must be
 * HTTPS — there is no localhost fallback, because silently pointing a shipped
 * app at a loopback address turns a misconfigured build into a mystery instead
 * of an error. Development keeps the Expo Go behaviour: the Metro origin over
 * LAN, which is necessarily cleartext.
 */
export function getApiBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "") ?? "";

  if (!__DEV__) {
    if (explicit) {
      if (!explicit.startsWith("https://")) {
        throw new Error(
          "EXPO_PUBLIC_API_URL must use https:// in release builds; cleartext API traffic is not allowed.",
        );
      }
      return explicit;
    }

    // A same-origin web deployment is already served over the page's own
    // scheme; accept it when that scheme is HTTPS.
    const origin = webOrigin();
    if (origin?.startsWith("https://")) return origin;

    throw new Error(
      "EXPO_PUBLIC_API_URL is not set. Release builds must be built with the API base URL configured.",
    );
  }

  if (explicit && !isLoopback(explicit)) return explicit;

  const origin = webOrigin();
  if (origin) return origin;

  const metro = metroOrigin();
  if (metro) return metro;

  if (explicit) return explicit;

  throw new Error(
    "API base URL could not be resolved. Connect to the Metro server over LAN or set EXPO_PUBLIC_API_URL.",
  );
}
