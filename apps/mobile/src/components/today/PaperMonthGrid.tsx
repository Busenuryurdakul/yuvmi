import { StyleSheet, Text, View } from "react-native";
import { theme } from "@/theme";
import type { AlignmentResponse, CheckinResponse, DailyTaskResponse } from "@/lib/api/types";

const DAY_LETTERS = ["Pz", "Pt", "Sa", "Ça", "Pe", "Cu", "Ct"];
const MONTHS = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

function toDateKey(value: string | Date) {
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return value.slice(0, 10);
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

type PaperMonthGridProps = {
  checkin: CheckinResponse | null;
  task: DailyTaskResponse | null;
  history: AlignmentResponse[];
};

export function PaperMonthGrid({ checkin, task, history }: PaperMonthGridProps) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const todayKey = toDateKey(now);
  const totalDays = daysInMonth(year, month);

  const scores: Record<string, number> = {};
  for (const snap of history) {
    scores[toDateKey(snap.date)] = snap.overallScore;
  }

  const taskDone = task?.status === "completed" || task?.status === "skipped";

  return (
    <View>
      <Text style={styles.month}>
        {MONTHS[month]} {year}
      </Text>
      <View style={styles.headerRow}>
        <View style={styles.dateCol} />
        <Text style={styles.colLabel}>HAL</Text>
        <Text style={styles.colLabel}>ODAK</Text>
        <Text style={styles.colLabel}>HİZA</Text>
      </View>
      {Array.from({ length: totalDays }, (_, i) => {
        const day = i + 1;
        const date = new Date(year, month, day);
        const key = toDateKey(date);
        const isToday = key === todayKey;
        const isFuture = date > now && !isToday;

        const mood = isToday && checkin ? String(checkin.mood) : "";
        const focus = isToday && taskDone ? "✓" : "";
        const hiza = scores[key] != null ? String(scores[key]) : "";

        return (
          <View key={key} style={styles.row}>
            <View style={styles.dateCol}>
              <View style={[styles.dateBadge, isToday && styles.dateBadgeToday]}>
                <Text style={[styles.dateNum, isToday && styles.dateNumToday]}>{day}</Text>
              </View>
              <Text style={[styles.dateLetter, isToday && styles.dateLetterToday]}>
                {DAY_LETTERS[date.getDay()]}
              </Text>
            </View>
            <Text style={[styles.cell, isFuture && styles.cellMuted]}>{mood}</Text>
            <Text style={[styles.cell, isFuture && styles.cellMuted]}>{focus}</Text>
            <Text style={[styles.cell, isFuture && styles.cellMuted]}>{hiza}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  month: {
    fontSize: theme.font.size.xl,
    fontWeight: theme.font.weight.medium,
    color: theme.color.ink,
    marginBottom: theme.space.xl,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: theme.space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.color.paperLine,
    marginBottom: theme.space.sm,
  },
  dateCol: {
    width: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  colLabel: {
    flex: 1,
    fontSize: 11,
    letterSpacing: 1.2,
    fontWeight: theme.font.weight.medium,
    color: theme.color.ink40,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 36,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.color.paperLine,
  },
  dateBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  dateBadgeToday: {
    backgroundColor: theme.color.blue,
  },
  dateNum: {
    fontSize: theme.font.size.sm,
    color: theme.color.ink,
    fontWeight: theme.font.weight.medium,
  },
  dateNumToday: {
    color: theme.color.onInk,
    fontWeight: theme.font.weight.semibold,
  },
  dateLetter: {
    fontSize: theme.font.size.sm,
    color: theme.color.ink40,
  },
  dateLetterToday: {
    color: theme.color.blue,
    fontWeight: theme.font.weight.medium,
  },
  cell: {
    flex: 1,
    textAlign: "center",
    fontSize: theme.font.size.sm,
    color: theme.color.ink,
  },
  cellMuted: {
    color: theme.color.paperLine,
  },
});
