import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "@/theme";

const LABELS = ["İstatistik", "Niyet", "Hâl"] as const;

type SegmentBarProps = {
  index: number;
  onChange: (index: number) => void;
};

export function SegmentBar({ index, onChange }: SegmentBarProps) {
  return (
    <View style={styles.seg}>
      {LABELS.map((label, i) => (
        <Pressable key={label} onPress={() => onChange(i)} style={[styles.sg, index === i && styles.on]}>
          <Text style={[styles.label, index === i && styles.labelOn]}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  seg: {
    flexDirection: "row",
    gap: 4,
    marginTop: 14,
    marginBottom: 12,
    padding: 4,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.45)",
    borderWidth: 1,
    borderColor: theme.color.edge,
  },
  sg: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 9,
    alignItems: "center",
  },
  on: {
    backgroundColor: theme.color.blue,
    shadowColor: theme.color.blue,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  label: {
    fontFamily: theme.font.mono,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: theme.color.ink40,
  },
  labelOn: {
    color: "#fff",
  },
});
