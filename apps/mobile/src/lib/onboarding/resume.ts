import { fetchCurrentGoal, fetchActivePlan, fetchFutureSelf } from "@/lib/api/yuvmi";
import type { Href } from "expo-router";

/** Kullanıcının onboarding'de kaldığı adımı belirle */
export async function resolveOnboardingHref(token: string): Promise<Href> {
  try {
    const fs = await fetchFutureSelf(token);
    if (fs.status === "draft") {
      return "/(onboarding)/future-self-review";
    }
  } catch {
    return "/(onboarding)/future-self";
  }

  try {
    await fetchCurrentGoal(token);
  } catch {
    return "/(onboarding)/goal";
  }

  try {
    await fetchActivePlan(token);
    return "/(onboarding)/plan";
  } catch {
    return "/(onboarding)/plan";
  }
}
