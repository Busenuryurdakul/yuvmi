import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/context/AuthContext";
import { OnboardingProvider } from "@/context/OnboardingContext";
import { AppEffects } from "@/components/AppEffects";

export default function RootLayout() {
  return (
    <AuthProvider>
      <OnboardingProvider>
        <AppEffects />
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="check-in" options={{ presentation: "modal" }} />
          <Stack.Screen name="task/[id]" />
          <Stack.Screen name="alignment" />
          <Stack.Screen name="spaces/[id]" />
          <Stack.Screen name="spaces/invite" />
          <Stack.Screen name="weekly-review" />
          <Stack.Screen name="notifications" options={{ presentation: "modal" }} />
        </Stack>
      </OnboardingProvider>
    </AuthProvider>
  );
}
