import type { ComponentProps } from "react";
import { BlurView } from "expo-blur";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Tabs } from "expo-router";
import { theme } from "@/theme";

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: "sunny-outline",
  "future-self": "sparkles-outline",
  journey: "map-outline",
  spaces: "people-outline",
  profile: "person-outline",
};

const LABELS: Record<string, string> = {
  index: "Bugün",
  "future-self": "Vizyon",
  journey: "Yolculuk",
  spaces: "Alanlar",
  profile: "Profil",
};

export function GlassTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { bottom: Math.max(insets.bottom, 10) + 4 }]} pointerEvents="box-none">
      <BlurView intensity={48} tint="light" experimentalBlurMethod="dimezisBlurView" style={styles.nav}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name as never);
            }
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              onPress={onPress}
              style={[styles.item, focused && styles.itemOn]}
            >
              <Ionicons
                name={ICONS[route.name] ?? "ellipse-outline"}
                size={19}
                color={focused ? theme.color.blueDeep : theme.color.ink40}
              />
              <Text style={[styles.label, focused && styles.labelOn]}>{LABELS[route.name] ?? route.name}</Text>
            </Pressable>
          );
        })}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 14,
    right: 14,
  },
  nav: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 5,
    borderRadius: theme.radius.nav,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.55)",
    borderWidth: 1,
    borderColor: theme.color.edge,
    ...theme.shadow.nav,
  },
  item: {
    flex: 1,
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
    borderRadius: 16,
  },
  itemOn: {
    backgroundColor: "rgba(37,99,235,0.13)",
  },
  label: {
    fontFamily: theme.font.mono,
    fontSize: 9,
    letterSpacing: 0.4,
    color: theme.color.ink40,
  },
  labelOn: {
    color: theme.color.blueDeep,
  },
});
