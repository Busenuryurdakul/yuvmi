import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { theme } from "@/theme";

type DeadlineMode = "date" | "duration";

type GoalDeadlineFieldProps = {
  mode: DeadlineMode;
  onModeChange: (mode: DeadlineMode) => void;
  targetDate: string;
  onTargetDateChange: (value: string) => void;
  durationText: string;
  onDurationTextChange: (value: string) => void;
  skipped: boolean;
  onSkippedChange: (skipped: boolean) => void;
};

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysFromToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** "3 ay", "6 hafta", "90 gün" → YYYY-MM-DD */
export function parseDurationToTargetDate(text: string): string | null {
  const t = text.trim().toLocaleLowerCase("tr");
  if (!t) return null;

  const direct = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (direct) return t;

  const match = (re: RegExp, multiplier: number): string | null => {
    const m = t.match(re);
    if (!m) return null;
    const n = Number.parseInt(m[1], 10);
    if (!Number.isFinite(n) || n <= 0) return null;
    return addDaysFromToday(n * multiplier);
  };

  return (
    match(/(\d+)\s*gün/, 1) ??
    match(/(\d+)\s*hafta/, 7) ??
    match(/(\d+)\s*ay/, 30) ??
    match(/(\d+)\s*yıl/, 365) ??
    null
  );
}

export function resolveGoalTargetDate(
  skipped: boolean,
  mode: DeadlineMode,
  targetDate: string,
  durationText: string,
): string | undefined {
  if (skipped) return undefined;
  if (mode === "date" && targetDate) return targetDate;
  if (mode === "duration") {
    const parsed = parseDurationToTargetDate(durationText);
    return parsed ?? undefined;
  }
  return undefined;
}

export function GoalDeadlineField({
  mode,
  onModeChange,
  targetDate,
  onTargetDateChange,
  durationText,
  onDurationTextChange,
  skipped,
  onSkippedChange,
}: GoalDeadlineFieldProps) {
  const minDate = todayIso();

  function selectMode(next: DeadlineMode) {
    onSkippedChange(false);
    onModeChange(next);
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Hedef tarihi</Text>
      <Text style={styles.hint}>Opsiyonel — takvimden seç veya süre yaz.</Text>

      <View style={styles.modeRow}>
        <Pressable
          onPress={() => selectMode("date")}
          style={[styles.modeChip, mode === "date" && !skipped && styles.modeChipActive]}
        >
          <Text style={[styles.modeText, mode === "date" && !skipped && styles.modeTextActive]}>Tarih seç</Text>
        </Pressable>
        <Pressable
          onPress={() => selectMode("duration")}
          style={[styles.modeChip, mode === "duration" && !skipped && styles.modeChipActive]}
        >
          <Text style={[styles.modeText, mode === "duration" && !skipped && styles.modeTextActive]}>Süre yaz</Text>
        </Pressable>
      </View>

      {!skipped && mode === "date" ? (
        Platform.OS === "web" ? (
          <View style={styles.dateWebWrap}>
            {/* RN Web: native date input for calendar UX */}
            <input
              type="date"
              value={targetDate}
              min={minDate}
              onChange={(e) => onTargetDateChange(e.target.value)}
              style={{
                width: "100%",
                border: `1px solid ${theme.color.line.firm}`,
                borderRadius: theme.radius.md,
                padding: theme.space.md,
                fontSize: theme.font.size.md,
                color: theme.color.text.primary,
                backgroundColor: theme.color.surface.raised,
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
          </View>
        ) : (
          <TextInput
            style={styles.input}
            value={targetDate}
            onChangeText={onTargetDateChange}
            placeholder="YYYY-AA-GG"
            placeholderTextColor={theme.color.text.tertiary}
            keyboardType="numbers-and-punctuation"
          />
        )
      ) : null}

      {!skipped && mode === "duration" ? (
        <TextInput
          style={styles.input}
          value={durationText}
          onChangeText={onDurationTextChange}
          placeholder="Örn. 3 ay, 6 hafta, 90 gün"
          placeholderTextColor={theme.color.text.tertiary}
        />
      ) : null}

      <Pressable
        onPress={() => {
          onSkippedChange(!skipped);
          if (!skipped) {
            onTargetDateChange("");
            onDurationTextChange("");
          }
        }}
        style={styles.skipBtn}
      >
        <Text style={[styles.skipText, skipped && styles.skipTextActive]}>
          {skipped ? "✓ Tarih belirtmiyorum — esnek ilerle" : "Tarih belirtmek istemiyorum"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: theme.space.lg,
  },
  label: {
    fontSize: theme.font.size.sm,
    fontWeight: theme.font.weight.medium,
    color: theme.color.text.primary,
    marginBottom: theme.space.xs,
  },
  hint: {
    fontSize: theme.font.size.xs,
    color: theme.color.text.secondary,
    marginBottom: theme.space.sm,
    lineHeight: 18,
  },
  modeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: theme.space.sm,
  },
  modeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.color.line.soft,
    backgroundColor: theme.color.surface.raised,
  },
  modeChipActive: {
    backgroundColor: theme.color.blue,
    borderColor: theme.color.blue,
  },
  modeText: {
    fontSize: theme.font.size.sm,
    color: theme.color.text.primary,
  },
  modeTextActive: {
    color: "#fff",
    fontWeight: theme.font.weight.semibold,
  },
  dateWebWrap: {
    marginBottom: theme.space.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.color.line.firm,
    borderRadius: theme.radius.md,
    padding: theme.space.md,
    fontSize: theme.font.size.md,
    color: theme.color.text.primary,
    backgroundColor: theme.color.surface.raised,
    marginBottom: theme.space.sm,
  },
  skipBtn: {
    paddingVertical: theme.space.xs,
  },
  skipText: {
    fontSize: theme.font.size.sm,
    color: theme.color.text.secondary,
    lineHeight: 20,
  },
  skipTextActive: {
    color: theme.color.blueDeep,
    fontWeight: theme.font.weight.medium,
  },
});
