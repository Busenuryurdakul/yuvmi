import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { resetPassword } from "@/lib/api/yuvmi";
import { ApiError } from "@/lib/api/client";
import { theme } from "@/theme";

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (password.length < 8) {
      Alert.alert("Hata", "Şifre en az 8 karakter olmalı.");
      return;
    }
    if (password !== confirm) {
      Alert.alert("Hata", "Şifreler eşleşmiyor.");
      return;
    }
    if (!token) {
      Alert.alert("Hata", "Geçersiz sıfırlama bağlantısı.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      Alert.alert("Tamam", "Şifren güncellendi.", [{ text: "Giriş yap", onPress: () => router.replace("/(auth)/welcome") }]);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Sıfırlama başarısız.";
      Alert.alert("Hata", message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <PageHeader title="Yeni şifre" subtitle="Hesabın için yeni bir şifre belirle." />

      <Card title="Şifre">
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Yeni şifre (min. 8 karakter)"
          secureTextEntry
          autoComplete="new-password"
        />
        <TextInput
          style={styles.input}
          value={confirm}
          onChangeText={setConfirm}
          placeholder="Şifreyi tekrarla"
          secureTextEntry
          autoComplete="new-password"
        />
        <Button
          label={loading ? "Kaydediliyor…" : "Şifreyi güncelle"}
          onPress={() => void handleSubmit()}
          disabled={loading}
        />
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
    marginBottom: theme.space.md,
    fontSize: theme.font.size.md,
    color: theme.color.text.primary,
  },
});
