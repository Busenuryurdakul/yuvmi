import * as WebBrowser from "expo-web-browser";

/**
 * Store review (App Store 5.1.1, Play Data safety) needs a privacy policy and a
 * support route that actually resolve. A row that opens a "hazırlanıyor" alert
 * satisfies neither, so both destinations ship inside the app: a review build
 * can never present a dead link, and neither can a user on a plane.
 *
 * Once a hosted page exists, pointing the matching EXPO_PUBLIC_* variable at it
 * redirects the row — no code change, and no second copy of the text to keep in
 * sync while the hosted version is still a draft.
 *
 * The store *listing* still needs a public URL of its own; that is metadata
 * entered in App Store Connect and Play Console, and no in-app screen can
 * stand in for it.
 */

/**
 * HTTPS only. An http policy link is a downgrade for the reader and something
 * App Review flags on its own, so a misconfigured value falls back to the
 * in-app screen rather than shipping a worse link than the one it replaced.
 */
function hostedUrl(value: string | undefined): string | null {
  const url = value?.trim();
  return url && url.startsWith("https://") ? url : null;
}

// Read through direct static member access: Expo inlines EXPO_PUBLIC_* at build
// time by matching the source text, so a computed lookup would resolve to
// undefined in a release bundle.
export function hostedPrivacyUrl(): string | null {
  return hostedUrl(process.env.EXPO_PUBLIC_PRIVACY_URL);
}

export function hostedTermsUrl(): string | null {
  return hostedUrl(process.env.EXPO_PUBLIC_TERMS_URL);
}

export function hostedSupportUrl(): string | null {
  return hostedUrl(process.env.EXPO_PUBLIC_SUPPORT_URL);
}

/**
 * Support mailbox for the in-app support screen. Absent unless configured:
 * printing an address nobody reads is worse than printing none, because the
 * user spends a message believing they reached someone.
 */
export function supportEmail(): string | null {
  const value = process.env.EXPO_PUBLIC_SUPPORT_EMAIL?.trim();
  return value && value.includes("@") ? value : null;
}

/** Opens a hosted page in the in-app browser, matching the checkout flow. */
export async function openExternal(url: string): Promise<void> {
  await WebBrowser.openBrowserAsync(url);
}
