import { StyleSheet, Text, View } from "react-native";
import type { PlanDiffResponse } from "@/lib/api/types";
import { theme } from "@/theme";

type PlanDiffProps = {
  diff: PlanDiffResponse;
};

function StepList({ label, steps }: { label: string; steps: PlanDiffResponse["added"] }) {
  if (steps.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{label}</Text>
      {steps.map((step) => (
        <Text key={step.id} style={styles.step}>
          Gün {step.dayOffset + 1}: {step.title}
        </Text>
      ))}
    </View>
  );
}

export function PlanDiffView({ diff }: PlanDiffProps) {
  const hasChanges = diff.added.length + diff.removed.length + diff.changed.length > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>
        v{diff.fromVersion} → v{diff.toVersion}
      </Text>
      {!hasChanges ? (
        <Text style={styles.empty}>Adım değişikliği yok.</Text>
      ) : (
        <>
          <StepList label="Eklenen" steps={diff.added} />
          <StepList label="Kaldırılan" steps={diff.removed} />
          <StepList label="Güncellenen" steps={diff.changed} />
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
  section: { gap: theme.space.xs },
  sectionTitle: {
    fontSize: theme.font.size.sm,
    fontWeight: theme.font.weight.medium,
    color: theme.color.text.secondary,
  },
  step: {
    fontSize: theme.font.size.sm,
    color: theme.color.text.primary,
    lineHeight: 20,
  },
  empty: {
    fontSize: theme.font.size.sm,
    color: theme.color.text.secondary,
  },
});
