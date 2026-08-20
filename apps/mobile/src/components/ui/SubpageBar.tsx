import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Eyebrow } from "@/components/ui/Glass";
import { theme } from "@/theme";

type SubpageBarProps = {
  title: string;
  right?: ReactNode | string;
  onBack?: () => void;
};

function BackChevron() {
  return <View style={styles.chevron} pointerEvents="none" />;
}

export function SubpageBar({ title, right, onBack }: SubpageBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingTop: insets.top + 10 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Geri"
        onPress={onBack ?? (() => router.back())}
        style={styles.back}
      >
        <BackChevron />
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {typeof right === "string" ? <Eyebrow style={styles.right}>{right}</Eyebrow> : (right ?? <View style={styles.spacer} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 2,
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.55)",
    borderWidth: 1,
    borderColor: theme.color.edge,
    alignItems: "center",
    justifyContent: "center",
  },
  chevron: {
    width: 9,
    height: 9,
    marginLeft: 2,
    borderLeftWidth: 2.25,
    borderBottomWidth: 2.25,
    borderColor: theme.color.ink,
    borderRadius: 1.25,
    transform: [{ rotate: "45deg" }],
  },
  title: {
    flex: 1,
    fontFamily: theme.font.sansBold,
    fontSize: 17,
    fontWeight: theme.font.weight.bold,
    letterSpacing: -0.2,
    color: theme.color.ink,
  },
  right: {
    marginLeft: "auto",
  },
  spacer: {
    width: 36,
  },
});
