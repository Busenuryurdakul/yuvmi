import { useEffect, useState } from "react";
import { Redirect, type Href } from "expo-router";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { useAuth } from "@/context/AuthContext";
import { resolveOnboardingHref } from "@/lib/onboarding/resume";

export default function OnboardingIndex() {
  const { user } = useAuth();
  const [href, setHref] = useState<Href | null>(null);

  useEffect(() => {
    if (!user?.token) return;
    void resolveOnboardingHref(user.token).then(setHref);
  }, [user?.token]);

  if (!href) return <LoadingScreen />;
  return <Redirect href={href} />;
}
