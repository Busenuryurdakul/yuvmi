import type { ReactNode } from "react";
import { BlurView } from "expo-blur";
import {
  Platform,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextProps,
  type ViewStyle,
} from "react-native";
import { theme } from "@/theme";

export function AmbientBackground() {
  return (
    <View pointerEvents="none" style={styles.layer}>
      <View style={styles.orbBlue} />
      <View style={styles.orbLight} />
      <View style={styles.orbWhite} />
    </View>
  );
}

type GlassProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  accentLeft?: boolean;
};

export function Glass({ children, style, intensity = 40, accentLeft }: GlassProps) {
  return (
    <BlurView
      intensity={intensity}
      tint="light"
      experimentalBlurMethod="dimezisBlurView"
      style={[styles.glass, accentLeft && styles.accentLeft, style]}
    >
      {children}
    </BlurView>
  );
}

export function Mono({ style, ...props }: TextProps) {
  return <Text {...props} style={[styles.mono, style]} />;
}

export function Eyebrow({ style, ...props }: TextProps) {
  return <Text {...props} style={[styles.mono, styles.eyebrow, style]} />;
}

const blur = Platform.select({
  web: { filter: "blur(58px)" } as ViewStyle,
  default: { opacity: 0.72 },
});

const styles = StyleSheet.create({
  layer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  orbBlue: {
    position: "absolute",
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: "rgba(37,99,235,0.55)",
    top: -90,
    left: -80,
    ...blur,
  },
  orbLight: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(123,163,247,0.6)",
    bottom: 60,
    right: -90,
    ...blur,
  },
  orbWhite: {
    position: "absolute",
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: "rgba(255,255,255,0.75)",
    top: 300,
    left: 120,
    ...blur,
  },
  glass: {
    backgroundColor: theme.color.glass,
    borderWidth: 1,
    borderColor: theme.color.edge,
    borderRadius: theme.radius.xl,
    overflow: "hidden",
    ...theme.shadow.glass,
  },
  accentLeft: {
    borderLeftWidth: 3,
    borderLeftColor: theme.color.blue,
  },
  mono: {
    fontFamily: theme.font.mono,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontSize: theme.font.size.xs,
    color: theme.color.ink40,
  },
  eyebrow: {
    color: theme.color.ink40,
  },
});
