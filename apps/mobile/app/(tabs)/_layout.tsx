import { Redirect, Tabs } from "expo-router";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { GlassTabBar } from "@/components/ui/GlassTabBar";
import { useAuth } from "@/context/AuthContext";
import { theme } from "@/theme";

export default function TabsLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!user) return <Redirect href="/(auth)/welcome" />;
  if (!user.onboardingComplete) return <Redirect href="/(onboarding)/future-self" />;

  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.color.mist },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Bugün" }} />
      <Tabs.Screen name="journey" options={{ title: "Yolculuk" }} />
      <Tabs.Screen name="yuvmi" options={{ title: "Yuvmi" }} />
      <Tabs.Screen name="atolye" options={{ title: "Atölye" }} />
      <Tabs.Screen name="profile" options={{ title: "Profil" }} />
    </Tabs>
  );
}
