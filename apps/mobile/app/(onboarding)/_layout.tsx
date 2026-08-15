import { Stack, Redirect } from "expo-router";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { useAuth } from "@/context/AuthContext";

export default function OnboardingLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!user) return <Redirect href="/(auth)/welcome" />;
  if (user.onboardingComplete) return <Redirect href="/(tabs)" />;

  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="future-self" />
      <Stack.Screen name="future-self-review" />
      <Stack.Screen name="goal" />
      <Stack.Screen name="plan" />
      <Stack.Screen name="complete" />
    </Stack>
  );
}
