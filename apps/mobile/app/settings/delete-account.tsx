import { StyleSheet, Text, TextInput } from "react-native";
import { router } from "expo-router";
import { useState } from "react";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { deleteAccount } from "@/lib/api/yuvmi";
import { ApiError } from "@/lib/api/client";
import { alert } from "@/lib/alert";
import { theme } from "@/theme";

export default function DeleteAccountScreen() {
  const { user, signOut } = useAuth();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const needsPassword = user.provider === "email";

  async function handleDelete() {
    alert(
      "Hesabı sil",
      "Tüm verilerin kalıcı olarak silinecek. Bu işlem geri alınamaz.",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: () => void confirmDelete(),
        },
      ],
    );
  }

  async function confirmDelete() {
    if (!user?.token) return;
    setLoading(true);
    try {
      await deleteAccount(needsPassword ? password : undefined);
      await signOut();
      router.replace("/(auth)/welcome");
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Silme başarısız.";
      alert("Hata", message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <PageHeader
        title="Hesabı sil"
        subtitle="KVKK/GDPR kapsamında tüm kişisel verilerin kalıcı olarak silinir."
      />

      <Card title="Onay">
        <Text style={styles.warning}>
          Bu işlem geri alınamaz. Hedeflerin, günlük kontrol kayıtların, ortak alanların ve abonelik bilgilerin silinir.
        </Text>
        {needsPassword ? (
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Mevcut şifren"
            secureTextEntry
            autoComplete="password"
          />
        ) : null}
        <Button
          label={loading ? "Siliniyor…" : "Hesabımı kalıcı olarak sil"}
          variant="secondary"
          onPress={() => void handleDelete()}
          disabled={loading || (needsPassword && password.length < 8)}
        />
        <Button label="Vazgeç" variant="secondary" onPress={() => router.back()} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  warning: {
    fontSize: theme.font.size.sm,
    lineHeight: 22,
    color: theme.color.text.secondary,
    marginBottom: theme.space.lg,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.color.line.soft,
    borderRadius: theme.radius.md,
    padding: theme.space.md,
    marginBottom: theme.space.lg,
    fontSize: theme.font.size.md,
    color: theme.color.text.primary,
  },
});
