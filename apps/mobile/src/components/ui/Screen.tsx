import type { ReactNode } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/theme";

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  gradient?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
} & Pick<ScrollViewProps, "refreshControl" | "contentContainerStyle">;

export function Screen({
  children,
  scroll = true,
  padded = true,
  gradient = true,
  contentStyle,
  contentContainerStyle,
  refreshControl,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const paddingStyle = padded
    ? {
        paddingTop: insets.top + theme.space.lg,
        paddingBottom: insets.bottom + theme.space.xl,
        paddingHorizontal: theme.space.xl,
      }
    : {
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      };

  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, paddingStyle, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fill, paddingStyle, contentStyle]}>{children}</View>
  );

  if (!gradient) {
    return <View style={[styles.fill, styles.base]}>{body}</View>;
  }

  return (
    <View style={styles.fill}>
      <LinearGradient
        colors={[theme.color.surface.base, "#f3e0e3", theme.color.surface.base]}
        style={StyleSheet.absoluteFill}
      />
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  base: {
    backgroundColor: theme.color.surface.base,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
