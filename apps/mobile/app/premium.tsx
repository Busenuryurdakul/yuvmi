import { Alert, Share, StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { devUpgradeSubscription, exportUserData } from "@/lib/api/yuvmi";
import { ApiError } from "@/lib/api/client";
import { theme } from "@/theme";

const PREMIUM_FEATURES = [
  "Birden fazla hedef ve ortak alan",
  "Veri dışa aktarma (JSON)",
  "Gelişmiş AI sohbeti (yakında)",
  "Sesli olumlamalar (yakında)",
];

export default function PremiumScreen() {
  const { user } = useAuth();
  const token = user?.token ?? null;
  const { subscription, isPremium, loading, refresh } = useSubscription();

  async function handleDevUpgrade() {
    if (!token) return;
    try {
      await devUpgradeSubscription(token);
      await refresh();
      Alert.alert("Premium aktif", "Geliştirme modunda Premium plan etkinleştirildi.");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Yükseltme başarısız";
      Alert.alert("Premium", message);
    }
  }

  async function handleExport() {
    if (!token) return;
    try {
      const payload = await exportUserData(token);
      await Share.share({
        message: JSON.stringify(payload.data, null, 2),
        title: payload.filename,
      });
    } catch (err) {
      if (err instanceof ApiError && err.code === 402) {
        Alert.alert("Premium gerekli", "Veri dışa aktarma Premium plana dahildir.");
        return;
      }
      Alert.alert("Dışa aktarma", err instanceof Error ? err.message : "İşlem başarısız");
    }
  }

  const tierLabel = isPremium ? "Premium" : "Ücretsiz";

  return (
    <Screen>
      <PageHeader title="Premium" subtitle="Planın ve kullanımın." />

      <Card title={tierLabel} subtitle={subscription ? `Durum: ${subscription.status}` : undefined}>
        {loading ? (
          <Text style={styles.muted}>Yükleniyor…</Text>
        ) : subscription ? (
          <>
            <View style={styles.usageRow}>
              <Text style={styles.usageLabel}>Hedefler</Text>
              <Text style={styles.usageValue}>
                {subscription.usage.goals} / {subscription.limits.maxGoals}
              </Text>
            </View>
            <View style={styles.usageRow}>
              <Text style={styles.usageLabel}>Ortak alanlar</Text>
              <Text style={styles.usageValue}>
                {subscription.usage.spaces} / {subscription.limits.maxSpaces}
              </Text>
            </View>
            <View style={styles.usageRow}>
              <Text style={styles.usageLabel}>Veri dışa aktarma</Text>
              <Text style={styles.usageValue}>
                {subscription.limits.dataExport ? "Açık" : "Kapalı"}
              </Text>
            </View>
          </>
        ) : (
          <Text style={styles.muted}>Abonelik bilgisi alınamadı.</Text>
        )}
      </Card>

      <Card title="Premium ile" style={styles.cardSpacing}>
        {PREMIUM_FEATURES.map((feature) => (
          <Text key={feature} style={styles.featureItem}>
            • {feature}
          </Text>
        ))}
      </Card>

      <View style={styles.actions}>
        {isPremium ? (
          <Button label="Verilerimi dışa aktar" onPress={() => void handleExport()} />
        ) : (
          <>
            <Text style={styles.paymentHint}>
              Ödeme entegrasyonu (Iyzico / Stripe) sonraki adımda eklenecek. Şimdilik geliştirme
              modunda test edebilirsin.
            </Text>
            <Button label="Premium'u dene (dev)" variant="secondary" onPress={() => void handleDevUpgrade()} />
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardSpacing: {
    marginTop: theme.space.xl,
  },
  muted: {
    fontSize: theme.font.size.sm,
    color: theme.color.text.secondary,
  },
  usageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: theme.space.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.line.soft,
  },
  usageLabel: {
    fontSize: theme.font.size.sm,
    color: theme.color.text.secondary,
  },
  usageValue: {
    fontSize: theme.font.size.sm,
    fontWeight: theme.font.weight.medium,
    color: theme.color.text.primary,
  },
  featureItem: {
    fontSize: theme.font.size.sm,
    lineHeight: 24,
    color: theme.color.text.secondary,
  },
  actions: {
    marginTop: theme.space.xl,
    gap: theme.space.md,
  },
  paymentHint: {
    fontSize: theme.font.size.sm,
    lineHeight: 22,
    color: theme.color.text.secondary,
    marginBottom: theme.space.md,
  },
});
