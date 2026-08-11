import { Alert, StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { providerLabel, useAuth } from "@/context/AuthContext";
import { theme } from "@/theme";

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

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

  return (
    <Screen>
      <PageHeader title="Profil" subtitle="Hesabın ve tercihlerin." />

      <Card title={user.displayName} subtitle={user.email}>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Giriş yöntemi</Text>
          <Text style={styles.metaValue}>{providerLabel(user.provider)}</Text>
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
        <Text style={styles.accountHint}>
          Ödeme, AI ve veri dışa aktarma özellikleri sonraki fazlarda eklenecek.
        </Text>
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
