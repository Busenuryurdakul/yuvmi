import type { ReactNode } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AmbientBackground } from "@/components/ui/Glass";
import { theme } from "@/theme";

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  tone?: "paper" | "ink";
  tabBar?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
} & Pick<ScrollViewProps, "refreshControl" | "contentContainerStyle">;

export function Screen({
  children,
  scroll = true,
  padded = true,
  tone = "paper",
  tabBar = false,
  contentStyle,
  contentContainerStyle,
  refreshControl,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const bottomExtra = tabBar ? 108 : theme.space.xl;
  const paddingStyle = padded
    ? {
        paddingTop: insets.top + theme.space.lg,
        paddingBottom: insets.bottom + bottomExtra,
        paddingHorizontal: 18,
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
      style={styles.foreground}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fill, styles.foreground, paddingStyle, contentStyle]}>{children}</View>
  );

  return (
    <View style={[styles.fill, tone === "ink" ? styles.ink : styles.paper]}>
      {tone === "paper" ? <AmbientBackground /> : null}
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  foreground: {
    flex: 1,
    zIndex: 1,
  },
  paper: {
    backgroundColor: theme.color.mist,
  },
  ink: {
    backgroundColor: theme.color.ink,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
