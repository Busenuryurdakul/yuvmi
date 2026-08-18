import type { AIDecision } from "@/lib/api/types";
import { reportAIDecision } from "@/lib/api/yuvmi";

/**
 * Reporting what the user did with an AI suggestion.
 *
 * The model's output on its own teaches nothing about whether producing it was
 * right — the label does. Collecting it has to be free at the point of use,
 * though: a user accepting their own plan must never wait on, or be shown a
 * failure from, a bookkeeping call they did not ask for.
 */

/** Fires the report and forgets it. Losing one label is invisible; blocking
 *  the screen on it is not, so failures are swallowed by design. */
export function reportDecision(
  jobId: string | undefined,
  decision: AIDecision,
  finalOutput?: unknown,
): void {
  if (!jobId) return;
  void reportAIDecision(jobId, decision, finalOutput).catch(() => {
    // Intentionally silent — see above.
  });
}

/**
 * Classifies a free-text field the user could seed from a suggestion.
 *
 * `picked` is the suggestion they actually tapped, or null if they never
 * touched one. That distinction is what separates "edited" from "rejected":
 * without it, anything the user typed would look like a rejection even when
 * they started from a suggestion and changed two words.
 */
export function classifyTextDecision(picked: string | null, final: string): AIDecision {
  if (!picked) return "rejected";
  return picked.trim() === final.trim() ? "accepted" : "edited";
}
