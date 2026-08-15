import { StyleSheet, View } from "react-native";
import { Eyebrow } from "@/components/ui/Glass";
import { theme } from "@/theme";

export type RhythmTick = "full" | "small" | "none" | "pending";

type RhythmStripProps = {
  ticks: RhythmTick[];
};

export function RhythmStrip({ ticks }: RhythmStripProps) {
  return (
    <View>
      <View style={styles.row}>
        {ticks.map((tick, i) => (
          <View
            key={`${tick}-${i}`}
            style={[
              styles.tick,
              tick === "full" && styles.full,
              tick === "small" && styles.small,
              i === ticks.length - 1 && styles.today,
            ]}
          />
        ))}
      </View>
      <View style={styles.cap}>
        <Eyebrow>14 gün önce</Eyebrow>
        <Eyebrow>bugün</Eyebrow>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    height: 32,
    marginBottom: 7,
  },
  tick: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.color.ink15,
  },
  full: {
    height: 28,
    backgroundColor: theme.color.blue,
  },
  small: {
    height: 14,
    backgroundColor: theme.color.blueLight,
  },
  today: {
    borderWidth: 1.5,
    borderColor: theme.color.blueDeep,
  },
  cap: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
