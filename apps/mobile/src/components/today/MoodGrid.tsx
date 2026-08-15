import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { MoodLevel } from "@/lib/local";
import { theme } from "@/theme";

type MoodGridProps = {
  days: MoodLevel[];
};

const COLORS: Record<MoodLevel, string> = {
  0: theme.color.ink15,
  1: "#94A3B8",
  2: theme.color.blueLight,
  3: theme.color.blue,
  4: theme.color.blueDeep,
};

export function MoodGrid({ days }: MoodGridProps) {
  const [width, setWidth] = useState(0);
  const cells = [...days];
  while (cells.length < 30) cells.unshift(0);
  const shown = cells.slice(-30);
  const gap = 4;
  const size = width > 0 ? (width - gap * 9) / 10 : 0;

  return (
    <View
      style={styles.grid}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {shown.map((level, i) => (
        <View
          key={i}
          style={[
            styles.cell,
            size > 0 ? { width: size, height: size } : null,
            { backgroundColor: COLORS[level] },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 10,
  },
  cell: {
    borderRadius: 4,
  },
});
