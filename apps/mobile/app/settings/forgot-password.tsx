import { StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useState } from "react";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { alert } from "@/lib/alert";
import { PageHeader } from "@/components/ui/PageHeader";
import { forgotPassword } from "@/lib/api/yuvmi";
import { ApiError } from "@/lib/api/client";
import { theme } from "@/theme";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "İstek başarısız.";
      alert("Hata", message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <PageHeader title="Şifre sıfırla" subtitle="E-posta adresine sıfırlama bağlantısı gönderilir." />

      <Card title="E-posta">
        {sent ? (
          <Text style={styles.hint}>
            E-posta kayıtlıysa sıfırlama bağlantısı gönderildi. Geliştirme ortamında bağlantı API loglarında görünür.
          </Text>
        ) : (
          <>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="ornek@email.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            <Button
              label={loading ? "Gönderiliyor…" : "Sıfırlama bağlantısı gönder"}
              onPress={() => void handleSubmit()}
              disabled={loading || !email.includes("@")}
            />
          </>
        )}
        <Button label="Geri" variant="secondary" onPress={() => router.back()} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: theme.color.line.soft,
    borderRadius: theme.radius.md,
    padding: theme.space.md,
    marginBottom: theme.space.lg,
    fontSize: theme.font.size.md,
    color: theme.color.text.primary,
  },
  hint: {
    fontSize: theme.font.size.sm,
    lineHeight: 22,
    color: theme.color.text.secondary,
    marginBottom: theme.space.lg,
  },
});
