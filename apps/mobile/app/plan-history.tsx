import { useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text } from "react-native";
import { SubpageScreen } from "@/components/ui/SubpageScreen";
import { TapRow } from "@/components/ui/TapRow";
import { useAuth } from "@/context/AuthContext";
import { fetchPlans } from "@/lib/api/yuvmi";
import type { PlanResponse } from "@/lib/api/types";
import { shortStamp } from "@/lib/formatDate";
import { theme } from "@/theme";

const statusLabel: Record<string, string> = {
  active: "Aktif",
  superseded: "Önceki",
  draft: "Taslak",
  completed: "Tamamlandı",
};

export default function PlanHistoryScreen() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<PlanResponse[]>([]);

  useEffect(() => {
    if (!user?.token) return;
    void fetchPlans().then(setPlans).catch(() => setPlans([]));
  }, [user?.token]);

  const sorted = useMemo(() => plans.slice().sort((a, b) => b.version - a.version), [plans]);

  return (
    <SubpageScreen title="Plan geçmişi" scroll={false}>
      <FlatList
        data={sorted}
        keyExtractor={(plan) => plan.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={<Text style={styles.sub}>Plan değişir, geçmişin silinmez.</Text>}
        ListEmptyComponent={<Text style={styles.sub}>Henüz plan sürümü yok.</Text>}
        renderItem={({ item: plan }) => (
          <TapRow
            title={`v${plan.version} · ${plan.title}`}
            subtitle={`${statusLabel[plan.status] ?? plan.status} · ${shortStamp(plan.createdAt)}`}
            arrow="›"
          />
        )}
      />
    </SubpageScreen>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  listContent: { paddingHorizontal: 18, paddingBottom: 30, flexGrow: 1 },
  sub: {
    fontFamily: theme.font.sans,
    fontSize: 14,
    color: theme.color.ink70,
    lineHeight: 21,
    marginBottom: 18,
  },
});
