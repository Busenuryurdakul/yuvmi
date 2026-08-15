import { Alert, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { providerLabel, useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { theme } from "@/theme";

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { subscription, isPremium, loading: subLoading } = useSubscription();

  async function handleSignOut() {
    Alert.alert("Çıkış yap", "Oturumunu kapatmak istediğine emin misin?", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Çıkış yap",
        style: "destructive",
        onPress: () => {
          void signOut();
        },
      },
    ]);
  }

  if (!user) {
    return null;
  }

  const planLabel = subLoading ? "Yükleniyor…" : isPremium ? "Premium" : "Ücretsiz";

  return (
    <Screen>
      <PageHeader title="Profil" subtitle="Hesabın ve tercihlerin." />

      <Card title={user.displayName} subtitle={user.email}>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Giriş yöntemi</Text>
          <Text style={styles.metaValue}>{providerLabel(user.provider)}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Plan</Text>
          <Text style={styles.metaValue}>{planLabel}</Text>
        </View>
      </Card>

      <Card title="Tercihler" style={styles.cardSpacing}>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Dil</Text>
          <Text style={styles.settingValue}>Türkçe</Text>
        </View>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Bildirimler</Text>
          <Text style={styles.settingValue}>Yakında</Text>
        </View>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Gizlilik</Text>
          <Text style={styles.settingValue}>Verilerin varsayılan olarak özel</Text>
        </View>
      </Card>

      <Card title="Hesap" style={styles.cardSpacing}>
        {subscription && !isPremium ? (
          <Text style={styles.accountHint}>
            {subscription.usage.goals}/{subscription.limits.maxGoals} hedef ·{" "}
            {subscription.usage.spaces}/{subscription.limits.maxSpaces} ortak alan kullanılıyor.
          </Text>
        ) : null}
        <Button label="Arşiv" variant="secondary" onPress={() => router.push("/archive")} />
        <Button label="Premium & abonelik" variant="secondary" onPress={() => router.push("/premium")} />
        <Button label="Bildirimler" variant="secondary" onPress={() => router.push("/notifications")} />
        <Button label="Şifre sıfırla" variant="secondary" onPress={() => router.push("/settings/forgot-password")} />
        <Button label="Hesabı sil" variant="secondary" onPress={() => router.push("/settings/delete-account")} />
        <Button label="Çıkış yap" variant="secondary" onPress={() => void handleSignOut()} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardSpacing: {
    marginTop: theme.space.xl,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: theme.space.sm,
  },
  metaLabel: {
    fontSize: theme.font.size.sm,
    color: theme.color.text.secondary,
  },
  metaValue: {
    fontSize: theme.font.size.sm,
    fontWeight: theme.font.weight.medium,
    color: theme.color.text.primary,
  },
  settingRow: {
    paddingVertical: theme.space.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.line.soft,
  },
  settingLabel: {
    fontSize: theme.font.size.sm,
    fontWeight: theme.font.weight.medium,
    color: theme.color.text.primary,
    marginBottom: theme.space.xs,
  },
  settingValue: {
    fontSize: theme.font.size.sm,
    color: theme.color.text.secondary,
  },
  accountHint: {
    fontSize: theme.font.size.sm,
    lineHeight: 22,
    color: theme.color.text.secondary,
    marginBottom: theme.space.lg,
  },
});
