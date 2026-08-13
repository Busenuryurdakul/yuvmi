import { StyleSheet, Text, View } from "react-native";
import { theme } from "@/theme";

type StepperProps = {
  current: number;
  total: number;
  label?: string;
};

export function Stepper({ current, total, label }: StepperProps) {
  const progress = Math.min(100, Math.round((current / total) * 100));

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress}%` }]} />
      </View>
      <Text style={styles.meta}>
        Adım {current}/{total}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: theme.space.xl },
  label: {
    fontSize: theme.font.size.sm,
    color: theme.color.text.secondary,
    marginBottom: theme.space.sm,
  },
  track: {
    height: 8,
    backgroundColor: theme.color.surface.sunken,
    borderRadius: theme.radius.pill,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    backgroundColor: theme.color.blue,
  },
  meta: {
    marginTop: theme.space.xs,
    fontSize: theme.font.size.xs,
    color: theme.color.text.tertiary,
    textAlign: "right",
  },
});
