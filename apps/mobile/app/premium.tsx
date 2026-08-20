import { useCallback, useEffect } from "react";
import { Share, StyleSheet, Text, View } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as WebBrowser from "expo-web-browser";
import { useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import {
  cancelSubscription,
  createSubscriptionCheckout,
  devUpgradeSubscription,
  exportUserData,
} from "@/lib/api/yuvmi";
import { ApiError } from "@/lib/api/client";
import { alert } from "@/lib/alert";
import { theme } from "@/theme";

const PREMIUM_FEATURES = [
  "Birden fazla hedef ve ortak alan",
  "Veri dışa aktarma (ZIP + JSON)",
  "Gelişmiş AI sohbeti (yakında)",
  "Sesli olumlamalar (yakında)",
];

function formatPeriodEnd(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

export default function PremiumScreen() {
  const { checkout } = useLocalSearchParams<{ checkout?: string }>();
  const { user } = useAuth();
  const token = user?.token ?? null;
  const { subscription, isPremium, loading, refresh } = useSubscription();
  const stripeProvider = subscription?.provider === "stripe";
  const periodEndLabel = formatPeriodEnd(subscription?.currentPeriodEnd);
  const isCancelled = subscription?.status === "cancelled";

  useEffect(() => {
    if (checkout === "success") {
      void refresh();
      alert("Ödeme alındı", "Premium planın birkaç saniye içinde aktif olacak.");
    }
  }, [checkout, refresh]);

  async function handleCheckout() {
    if (!token) return;
    try {
      const session = await createSubscriptionCheckout();
      await WebBrowser.openBrowserAsync(session.url);
      await refresh();
    } catch (err) {
      if (err instanceof ApiError && err.code === 501) {
        alert(
          "Ödeme yapılandırılmadı",
          "Stripe anahtarları henüz ayarlanmadı. Geliştirme modunda test edebilirsin.",
        );
        return;
      }
      alert("Premium", err instanceof ApiError ? err.message : "Ödeme başlatılamadı");
    }
  }

  async function handleDevUpgrade() {
    if (!token) return;
    try {
      await devUpgradeSubscription();
      await refresh();
      alert("Premium aktif", "Geliştirme modunda Premium plan etkinleştirildi.");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Yükseltme başarısız";
      alert("Premium", message);
    }
  }

  async function handleCancel() {
    if (!token) return;
    alert(
      "Aboneliği iptal et",
      "Premium erişimin mevcut dönem sonuna kadar devam eder.",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "İptal et",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await cancelSubscription();
                await refresh();
                alert("İptal edildi", "Aboneliğin dönem sonunda sona erecek.");
              } catch (err) {
                alert("İptal", err instanceof ApiError ? err.message : "İşlem başarısız");
              }
            })();
          },
        },
      ],
    );
  }

  const handleExport = useCallback(async () => {
    if (!token) return;
    try {
      const payload = await exportUserData();
      if (payload.encoding === "base64" && typeof payload.data === "string") {
        const fileUri = `${FileSystem.cacheDirectory ?? ""}${payload.filename}`;
        await FileSystem.writeAsStringAsync(fileUri, payload.data, {
          encoding: "base64",
        });
        await Share.share({
          url: fileUri,
          title: payload.filename,
          message: "Yuvmi veri dışa aktarma arşivi",
        });
        return;
      }
      await Share.share({
        message: JSON.stringify(payload.data, null, 2),
        title: payload.filename,
      });
    } catch (err) {
      if (err instanceof ApiError && err.code === 402) {
        alert("Premium gerekli", "Veri dışa aktarma Premium plana dahildir.");
        return;
      }
      alert("Dışa aktarma", err instanceof Error ? err.message : "İşlem başarısız");
    }
  }, [token]);

  const tierLabel = isPremium ? "Premium" : "Ücretsiz";
  const statusLabel =
    subscription?.status === "cancelled"
      ? "İptal edildi (dönem sonuna kadar aktif)"
      : subscription?.status === "past_due"
        ? "Ödeme gecikmiş"
        : subscription?.status;

  return (
    <Screen>
      <PageHeader title="Premium" subtitle="Planın ve kullanımın." />

      <Card title={tierLabel} subtitle={subscription ? `Durum: ${statusLabel}` : undefined}>
        {loading ? (
          <Text style={styles.muted}>Yükleniyor…</Text>
        ) : subscription ? (
          <>
            {periodEndLabel ? (
              <Text style={styles.periodEnd}>
                {isCancelled ? "Erişim bitişi" : "Dönem sonu"}: {periodEndLabel}
              </Text>
            ) : null}
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
          <>
            <Button label="Verilerimi dışa aktar" onPress={() => void handleExport()} />
            {stripeProvider && !isCancelled ? (
              <Button label="Aboneliği iptal et" variant="secondary" onPress={() => void handleCancel()} />
            ) : null}
          </>
        ) : (
          <>
            <Button label="Premium'a geç" onPress={() => void handleCheckout()} />
            <Text style={styles.paymentHint}>
              Stripe ile güvenli ödeme. Geliştirme ortamında Stripe yapılandırılmadıysa dev köprüsünü
              kullanabilirsin.
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
  periodEnd: {
    fontSize: theme.font.size.sm,
    color: theme.color.text.secondary,
    marginBottom: theme.space.sm,
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
