import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "@/theme";

type CompanionCardProps = {
  title?: string;
  text: string;
  showActions?: boolean;
  busy?: boolean;
  onShrink: () => void;
  onKeep: () => void;
};

export function CompanionCard({
  title,
  text,
  showActions,
  busy,
  onShrink,
  onKeep,
}: CompanionCardProps) {
  return (
    <View>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <Text style={styles.body}>{text}</Text>
      {showActions ? (
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Küçült"
            onPress={onShrink}
            disabled={busy}
            style={styles.chip}
          >
            <Text style={styles.chipText}>Küçült</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Böyle kalsın"
            onPress={onKeep}
            disabled={busy}
            style={[styles.chip, styles.chipQuiet]}
          >
            <Text style={[styles.chipText, styles.chipQuietText]}>Böyle kalsın</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: theme.font.sansBold,
    fontWeight: theme.font.weight.bold,
    fontSize: 13,
    color: theme.color.ink,
    marginBottom: 4,
  },
  body: {
    fontFamily: theme.font.sans,
    fontSize: 13.5,
    lineHeight: 19,
    color: theme.color.ink,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 10,
  },
  chip: {
    height: 32,
    justifyContent: "center",
    backgroundColor: "rgba(37,99,235,0.12)",
    borderRadius: 999,
    paddingHorizontal: 12,
  },
  chipQuiet: {
    backgroundColor: "rgba(255,255,255,0.7)",
    borderWidth: 1,
    borderColor: theme.color.ink15,
  },
  chipText: {
    fontFamily: theme.font.sansSemibold,
    fontWeight: theme.font.weight.semibold,
    fontSize: 12,
    color: theme.color.blueDeep,
  },
  chipQuietText: {
    color: theme.color.ink70,
  },
});
