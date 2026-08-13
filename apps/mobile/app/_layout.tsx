import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { AuthProvider } from "@/context/AuthContext";
import { OnboardingProvider } from "@/context/OnboardingContext";
import { AppEffects } from "@/components/AppEffects";
import { useAppFonts } from "@/lib/fonts";
import { theme } from "@/theme";

export default function RootLayout() {
  const [loaded] = useAppFonts();

  if (!loaded) {
    return <View style={{ flex: 1, backgroundColor: theme.color.mist }} />;
  }

  return (
    <AuthProvider>
      <OnboardingProvider>
        <AppEffects />
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: "fade",
            contentStyle: { backgroundColor: theme.color.mist },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="check-in"
            options={{
              presentation: "modal",
              animation: "slide_from_bottom",
              contentStyle: { backgroundColor: theme.color.mist },
            }}
          />
          <Stack.Screen
            name="task/[id]"
            options={{
              presentation: "modal",
              animation: "slide_from_bottom",
              contentStyle: { backgroundColor: theme.color.mist },
            }}
          />
          <Stack.Screen name="alignment" />
          <Stack.Screen name="archive" />
          <Stack.Screen name="asset/[id]" />
          <Stack.Screen name="spaces/[id]" />
          <Stack.Screen name="spaces/invite" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="weekly-review" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="plan-history" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="intention/new" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="vision/board" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="vision/letter" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="vision/affirmations" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="vision/affirmation-new" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="vision/area" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="notifications" options={{ presentation: "modal" }} />
        </Stack>
      </OnboardingProvider>
    </AuthProvider>
  );
}
