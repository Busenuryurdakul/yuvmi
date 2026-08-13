import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import type { AlignmentResponse } from "@/lib/api/types";
import { theme } from "@/theme";

type AlignmentRingProps = {
  alignment: AlignmentResponse;
  compact?: boolean;
};

export function AlignmentRing({ alignment, compact }: AlignmentRingProps) {
  const content = (
    <View style={[styles.ring, compact && styles.ringCompact]}>
      <Text style={[styles.score, compact && styles.scoreCompact]}>{alignment.overallScore}</Text>
      {compact ? null : <Text style={styles.label}>Hiza</Text>}
    </View>
  );

  if (compact) {
    return (
      <Pressable onPress={() => router.push("/alignment")} style={styles.compactWrap}>
        {content}
        <Text style={styles.summary} numberOfLines={2}>
          {alignment.summaryExplanation}
        </Text>
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  ring: {
    alignSelf: "center",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: theme.color.blue,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    marginVertical: theme.space.lg,
  },
  ringCompact: { width: 72, height: 72, borderRadius: 36, borderWidth: 1.5, marginVertical: 0 },
  score: {
    fontSize: 36,
    fontWeight: theme.font.weight.semibold,
    color: theme.color.ink,
  },
  scoreCompact: {
    fontSize: 22,
  },
  label: { fontSize: theme.font.size.xs, color: theme.color.inkMuted, letterSpacing: 1 },
  compactWrap: { flexDirection: "row", alignItems: "center", gap: theme.space.lg },
  summary: {
    flex: 1,
    fontSize: theme.font.size.sm,
    color: theme.color.inkMuted,
    lineHeight: 20,
  },
});
