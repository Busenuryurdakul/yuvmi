import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/ui/Screen";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { AlignmentRing } from "@/components/alignment/AlignmentRing";
import { useAuth } from "@/context/AuthContext";
import { fetchTodayAlignment } from "@/lib/api/yuvmi";
import type { AlignmentResponse } from "@/lib/api/types";
import { theme } from "@/theme";

export default function AlignmentScreen() {
  const { user } = useAuth();
  const [alignment, setAlignment] = useState<AlignmentResponse | null>(null);

  useEffect(() => {
    if (!user?.token) return;
    void fetchTodayAlignment(user.token).then(setAlignment);
  }, [user?.token]);

  if (!alignment) return <LoadingScreen />;

  return (
    <Screen>
      <PageHeader title="Hizalanma" subtitle="Skor değil, anlayış." />
      <AlignmentRing alignment={alignment} />
      <Text style={styles.summary}>{alignment.summaryExplanation}</Text>
      <Card title="Nasıl oluştu?">
        {alignment.factors.map((f) => (
          <View key={f.type} style={styles.factor}>
            <Text style={styles.factorLabel}>{f.label}</Text>
            <Text style={styles.factorScore}>+{f.contribution}</Text>
            <Text style={styles.factorExplain}>{f.explanation}</Text>
          </View>
        ))}
      </Card>
      <Text style={styles.note}>ℹ️ Ruh hâlin skorunu düşürmedi.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: {
    textAlign: "center",
    fontSize: theme.font.size.md,
    color: theme.color.text.secondary,
    marginBottom: theme.space.xl,
  },
  factor: {
    paddingVertical: theme.space.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.line.soft,
  },
  factorLabel: { fontSize: theme.font.size.sm, fontWeight: theme.font.weight.semibold, color: theme.color.text.primary },
  factorScore: { fontSize: theme.font.size.sm, color: theme.color.inkMuted, marginVertical: theme.space.xs },
  factorExplain: { fontSize: theme.font.size.sm, color: theme.color.text.secondary, lineHeight: 20 },
  note: { marginTop: theme.space.lg, fontSize: theme.font.size.sm, color: theme.color.text.tertiary, textAlign: "center" },
});
