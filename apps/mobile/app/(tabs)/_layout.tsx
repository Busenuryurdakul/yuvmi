import { Redirect, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { useAuth } from "@/context/AuthContext";
import { theme } from "@/theme";

export default function TabsLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!user) return <Redirect href="/(auth)/welcome" />;
  if (!user.onboardingComplete) return <Redirect href="/(onboarding)/future-self" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.color.brand.roseText,
        tabBarInactiveTintColor: theme.color.text.tertiary,
        tabBarStyle: {
          backgroundColor: theme.color.surface.raised,
          borderTopColor: theme.color.line.soft,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Bugün",
          tabBarIcon: ({ color, size }) => <Ionicons name="sunny-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="future-self"
        options={{
          title: "Gelecekteki Ben",
          tabBarIcon: ({ color, size }) => <Ionicons name="sparkles-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="journey"
        options={{
          title: "Yolculuk",
          tabBarIcon: ({ color, size }) => <Ionicons name="map-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="spaces"
        options={{
          title: "Alanlar",
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
