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
      <Text style={styles.score}>{alignment.overallScore}</Text>
      <Text style={styles.label}>Hizalanma</Text>
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
    borderWidth: 8,
    borderColor: theme.color.brand.teal,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.color.surface.sunken,
    marginVertical: theme.space.lg,
  },
  ringCompact: { width: 96, height: 96, borderRadius: 48, borderWidth: 6, marginVertical: 0 },
  score: {
    fontSize: 36,
    fontWeight: theme.font.weight.semibold,
    color: theme.color.brand.tealText,
  },
  label: { fontSize: theme.font.size.xs, color: theme.color.text.secondary },
  compactWrap: { flexDirection: "row", alignItems: "center", gap: theme.space.lg },
  summary: {
    flex: 1,
    fontSize: theme.font.size.sm,
    color: theme.color.text.secondary,
    lineHeight: 20,
  },
});
