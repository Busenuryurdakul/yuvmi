import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { theme } from "@/theme";

const LABELS = ["İstatistik", "Plan", "Hâl"] as const;

type SegmentBarProps = {
  index: number;
  onChange: (index: number) => void;
  labels?: readonly string[];
  style?: StyleProp<ViewStyle>;
};

export function SegmentBar({ index, onChange, labels = LABELS, style }: SegmentBarProps) {
  return (
    <View style={[styles.seg, style]}>
      {labels.map((label, i) => (
        <Pressable key={label} onPress={() => onChange(i)} style={[styles.sg, index === i && styles.on]}>
          <Text style={[styles.label, index === i && styles.labelOn]} numberOfLines={1}>
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  seg: {
    flexDirection: "row",
    gap: 3,
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
    paddingHorizontal: 2,
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
    fontSize: 9,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: theme.color.ink40,
  },
  labelOn: {
    color: "#fff",
  },
});
