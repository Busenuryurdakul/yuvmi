import { Redirect, type Href } from "expo-router";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { useAuth } from "@/context/AuthContext";

export default function Index() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;

  if (!user) return <Redirect href="/(auth)/welcome" />;

  if (!user.onboardingComplete) return <Redirect href={"/(onboarding)" as Href} />;

  return <Redirect href={"/(tabs)/journey" as Href} />;
}
