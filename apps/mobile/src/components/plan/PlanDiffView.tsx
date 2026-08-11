import { StyleSheet, Text, View } from "react-native";
import type { PlanDiffResponse } from "@/lib/api/types";
import { theme } from "@/theme";

type PlanDiffProps = {
  diff: PlanDiffResponse;
};

function StepList({
  label,
  steps,
  tone,
}: {
  label: string;
  steps: PlanDiffResponse["added"];
  tone?: "added" | "removed";
}) {
  if (steps.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{label}</Text>
      {steps.map((step) => (
        <View
          key={`${label}-${step.id}`}
          style={[styles.stepRow, tone === "added" && styles.added, tone === "removed" && styles.removed]}
        >
          <Text style={styles.stepDay}>Gün {step.dayOffset + 1}</Text>
          <Text style={styles.stepTitle}>{step.title}</Text>
          {step.description ? <Text style={styles.stepDesc}>{step.description}</Text> : null}
        </View>
      ))}
    </View>
  );
}

function ChangedPairs({
  pairs,
  fromVersion,
  toVersion,
}: {
  pairs: NonNullable<PlanDiffResponse["changedPairs"]>;
  fromVersion: number;
  toVersion: number;
}) {
  if (pairs.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Güncellenen (yan yana)</Text>
      {pairs.map((pair) => (
        <View key={pair.dayOffset} style={styles.pairCard}>
          <Text style={styles.pairDay}>Gün {pair.dayOffset + 1}</Text>
          <View style={styles.sideBySide}>
            <View style={[styles.side, styles.removed]}>
              <Text style={styles.sideLabel}>v{fromVersion}</Text>
              <Text style={styles.stepTitle}>{pair.from.title}</Text>
              {pair.from.description ? (
                <Text style={styles.stepDesc}>{pair.from.description}</Text>
              ) : null}
            </View>
            <Text style={styles.arrow}>→</Text>
            <View style={[styles.side, styles.added]}>
              <Text style={styles.sideLabel}>v{toVersion}</Text>
              <Text style={styles.stepTitle}>{pair.to.title}</Text>
              {pair.to.description ? <Text style={styles.stepDesc}>{pair.to.description}</Text> : null}
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

export function PlanDiffView({ diff }: PlanDiffProps) {
  const pairs = diff.changedPairs ?? [];
  const hasChanges =
    diff.added.length + diff.removed.length + diff.changed.length + pairs.length > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>
        v{diff.fromVersion} → v{diff.toVersion}
      </Text>
      {!hasChanges ? (
        <Text style={styles.empty}>Adım değişikliği yok.</Text>
      ) : (
        <>
          <StepList label="Eklenen" steps={diff.added} tone="added" />
          <StepList label="Kaldırılan" steps={diff.removed} tone="removed" />
          {pairs.length > 0 ? (
            <ChangedPairs pairs={pairs} fromVersion={diff.fromVersion} toVersion={diff.toVersion} />
          ) : (
            <StepList label="Güncellenen" steps={diff.changed} />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: theme.space.md },
  heading: {
    fontSize: theme.font.size.md,
    fontWeight: theme.font.weight.semibold,
    color: theme.color.text.primary,
  },
  section: { gap: theme.space.sm },
  sectionTitle: {
    fontSize: theme.font.size.sm,
    fontWeight: theme.font.weight.medium,
    color: theme.color.text.secondary,
  },
  stepRow: {
    borderRadius: theme.radius.sm,
    padding: theme.space.sm,
    gap: theme.space.xs,
  },
  stepDay: {
    fontSize: theme.font.size.xs,
    color: theme.color.text.tertiary,
    fontWeight: theme.font.weight.medium,
  },
  stepTitle: {
    fontSize: theme.font.size.sm,
    fontWeight: theme.font.weight.medium,
    color: theme.color.text.primary,
  },
  stepDesc: {
    fontSize: theme.font.size.sm,
    color: theme.color.text.secondary,
    lineHeight: 20,
  },
  added: {
    backgroundColor: "rgba(91, 138, 138, 0.12)",
  },
  removed: {
    backgroundColor: "rgba(196, 113, 123, 0.12)",
  },
  pairCard: {
    borderWidth: 1,
    borderColor: theme.color.line.soft,
    borderRadius: theme.radius.md,
    padding: theme.space.sm,
    gap: theme.space.sm,
  },
  pairDay: {
    fontSize: theme.font.size.xs,
    color: theme.color.text.tertiary,
    fontWeight: theme.font.weight.medium,
  },
  sideBySide: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: theme.space.xs,
  },
  side: {
    flex: 1,
    borderRadius: theme.radius.sm,
    padding: theme.space.sm,
    gap: theme.space.xs,
  },
  sideLabel: {
    fontSize: theme.font.size.xs,
    color: theme.color.text.tertiary,
    textTransform: "uppercase",
  },
  arrow: {
    alignSelf: "center",
    fontSize: theme.font.size.md,
    color: theme.color.text.secondary,
  },
  empty: {
    fontSize: theme.font.size.sm,
    color: theme.color.text.secondary,
  },
});
