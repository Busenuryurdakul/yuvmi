import { fetchCurrentGoal, fetchActivePlan, fetchFutureSelf } from "@/lib/api/yuvmi";
import type { Href } from "expo-router";

/** Kullanıcının onboarding'de kaldığı adımı belirle */
export async function resolveOnboardingHref(): Promise<Href> {
  try {
    const fs = await fetchFutureSelf();
    if (fs.status === "draft") {
      return "/(onboarding)/future-self-review";
    }
  } catch {
    return "/(onboarding)/future-self";
  }

  try {
    await fetchCurrentGoal();
  } catch {
    return "/(onboarding)/goal";
  }

  try {
    await fetchActivePlan();
    return "/(onboarding)/plan";
  } catch {
    return "/(onboarding)/plan";
  }
}
