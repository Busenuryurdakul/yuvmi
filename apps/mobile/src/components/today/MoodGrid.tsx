import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { longDate } from "@/lib/formatDate";
import type { MoodLevel } from "@/lib/local";
import { theme } from "@/theme";

type MoodGridProps = {
  days: MoodLevel[];
  onAddMoodForDay?: (date: Date, level: MoodLevel) => void;
};

const COLORS: Record<MoodLevel, string> = {
  0: theme.color.ink15,
  1: "#94A3B8",
  2: theme.color.blueLight,
  3: theme.color.blue,
  4: theme.color.blueDeep,
};

const MOOD_LABEL: Record<MoodLevel, string> = {
  0: "kayıt yok",
  1: "yorgun",
  2: "idare",
  3: "iyi",
  4: "canlı",
};

function dateForIndex(index: number, total: number) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - (total - 1 - index));
  return d;
}

export function MoodGrid({ days, onAddMoodForDay }: MoodGridProps) {
  const [width, setWidth] = useState(0);
  const cells = [...days];
  while (cells.length < 30) cells.unshift(0);
  const shown = cells.slice(-30);
  const gap = 4;
  const size = width > 0 ? (width - gap * 9) / 10 : 0;
  const [selected, setSelected] = useState(shown.length - 1);

  const onSelect = useCallback((i: number) => setSelected(i), []);

  const picked = shown[selected] ?? 0;
  const pickedDate = dateForIndex(selected, shown.length);
  const isToday = selected === shown.length - 1;

  return (
    <View>
      <View
        style={styles.grid}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      >
        {shown.map((level, i) => {
          const date = dateForIndex(i, shown.length);
          const active = i === selected;
          return (
            <Pressable
              key={i}
              onPress={() => onSelect(i)}
              accessibilityRole="button"
              accessibilityLabel={`${longDate(date)}, ${MOOD_LABEL[level]}`}
              style={[
                styles.cell,
                size > 0 ? { width: size, height: size } : null,
                { backgroundColor: COLORS[level] },
                active && styles.cellOn,
              ]}
            />
          );
        })}
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.caption}>
          {isToday ? "Bugün" : longDate(pickedDate)} · {MOOD_LABEL[picked]}
        </Text>
        <View style={styles.addMoodRow}>
          {([1, 2, 3, 4] as MoodLevel[]).map((level) => {
            const on = picked === level;
            return (
              <Pressable
                key={level}
                onPress={() => onAddMoodForDay?.(pickedDate, level)}
                style={[styles.addMoodBtn, on && styles.addMoodBtnActive]}
              >
                <Text style={[styles.addMoodText, on && styles.addMoodTextActive]}>
                  {MOOD_LABEL[level]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
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
    borderWidth: 2,
    borderColor: "transparent",
  },
  cellOn: {
    borderColor: theme.color.ink,
  },
  detailRow: {
    marginTop: 10,
    gap: 8,
  },
  caption: {
    fontSize: theme.font.size.sm,
    color: theme.color.text.secondary,
    lineHeight: 20,
  },
  addMoodRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  addMoodBtn: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.color.ink15,
    backgroundColor: "rgba(255,255,255,0.4)",
    alignItems: "center",
  },
  addMoodBtnActive: {
    backgroundColor: theme.color.blue,
    borderColor: theme.color.blue,
  },
  addMoodText: {
    fontFamily: theme.font.sansMedium,
    fontSize: 11,
    color: theme.color.ink70,
    textTransform: "capitalize",
  },
  addMoodTextActive: {
    color: "#fff",
  },
});
