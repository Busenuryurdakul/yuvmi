import { useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";
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
    void fetchPlans(user.token).then(setPlans).catch(() => setPlans([]));
  }, [user?.token]);

  return (
    <SubpageScreen title="Plan geçmişi">
      <Text style={styles.sub}>Plan değişir, geçmişin silinmez.</Text>
      {plans.length === 0 ? (
        <Text style={styles.sub}>Henüz plan sürümü yok.</Text>
      ) : (
        plans
          .slice()
          .sort((a, b) => b.version - a.version)
          .map((plan) => (
            <TapRow
              key={plan.id}
              title={`v${plan.version} · ${plan.title}`}
              subtitle={`${statusLabel[plan.status] ?? plan.status} · ${shortStamp(plan.createdAt)}`}
              arrow="›"
            />
          ))
      )}
    </SubpageScreen>
  );
}

const styles = StyleSheet.create({
  sub: {
    fontFamily: theme.font.sans,
    fontSize: 14,
    color: theme.color.ink70,
    lineHeight: 21,
    marginBottom: 18,
  },
});
