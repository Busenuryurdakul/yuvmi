import { useCallback, useEffect, useRef, useState } from "react";
import type { ConsentScope } from "@yuvmi/shared";
import { ApiError } from "@/lib/api/client";
import { fetchConsents, updateConsent } from "@/lib/api/yuvmi";

/**
 * `needsConsent` is the only state that asks the user for anything. Every
 * failure path collapses to `unavailable`, which tells the caller to render
 * its own static list — the user is never shown an AI error, they just see
 * the manual flow they would have had anyway.
 */
export type AISuggestionState =
  | "idle"
  | "checking"
  | "needsConsent"
  | "generating"
  | "ready"
  | "unavailable";

type Options<T> = {
  scope: ConsentScope;
  /** Calls the generation endpoint. Must throw on failure. */
  fetcher: () => Promise<T>;
  /** Gates the whole flow — pass false until the prerequisite data (profile,
   *  goal) has loaded, so the request is never sent without its context. */
  enabled: boolean;
};

/**
 * Drives the consent → generate → fallback flow shared by the onboarding
 * screens.
 *
 * Generation runs at most once per mount. Screens reload on every focus
 * (useFocusEffect), and each AI call costs real money, so re-entering the
 * screen must not re-bill the user for suggestions they already have. `retry`
 * is the one deliberate escape hatch.
 */
export function useAISuggestions<T>({ scope, fetcher, enabled }: Options<T>) {
  const [state, setState] = useState<AISuggestionState>("idle");
  const [data, setData] = useState<T | null>(null);

  // Guards the once-per-mount rule above. A ref rather than state because
  // flipping it must not itself trigger a re-render or re-run the effect.
  const requestedRef = useRef(false);

  // Set on unmount so a slow in-flight response cannot call setState on a
  // screen the user has already left.
  const cancelledRef = useRef(false);
  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  const generate = useCallback(async () => {
    setState("generating");
    try {
      const result = await fetcher();
      if (cancelledRef.current) return;
      setData(result);
      setState("ready");
    } catch (err) {
      if (cancelledRef.current) return;
      // 403 means consent was revoked between the check and the call. Every
      // other code — 501 not configured, 429 quota, 0 offline, 5xx — is a
      // dead end for this screen, and all of them mean "show the static list".
      setState(err instanceof ApiError && err.code === 403 ? "needsConsent" : "unavailable");
    }
  }, [fetcher]);

  const run = useCallback(async () => {
    setState("checking");
    try {
      const consents = await fetchConsents();
      if (cancelledRef.current) return;
      const granted = consents.some((c) => c.scope === scope && c.granted);
      if (!granted) {
        setState("needsConsent");
        return;
      }
      await generate();
    } catch {
      if (cancelledRef.current) return;
      setState("unavailable");
    }
  }, [scope, generate]);

  useEffect(() => {
    if (!enabled || requestedRef.current) return;
    requestedRef.current = true;
    void run();
  }, [enabled, run]);

  /** Grants the scope and immediately generates, so one tap gets the user
   *  from the opt-in prompt to suggestions. */
  const grantAndGenerate = useCallback(async () => {
    setState("generating");
    try {
      await updateConsent(scope, true);
      if (cancelledRef.current) return;
    } catch {
      if (cancelledRef.current) return;
      setState("unavailable");
      return;
    }
    await generate();
  }, [scope, generate]);

  const retry = useCallback(() => {
    requestedRef.current = true;
    void run();
  }, [run]);

  return { state, data, grantAndGenerate, retry };
}
