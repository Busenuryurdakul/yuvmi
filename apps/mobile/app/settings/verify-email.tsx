import { Text } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { verifyEmail } from "@/lib/api/yuvmi";
import { ApiError } from "@/lib/api/client";
import { theme } from "@/theme";

export default function VerifyEmailScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [status, setStatus] = useState<"busy" | "ok" | "err">("busy");
  const [message, setMessage] = useState("E-posta doğrulanıyor…");

  useEffect(() => {
    if (!token) {
      setStatus("err");
      setMessage("Geçersiz doğrulama bağlantısı.");
      return;
    }
    void verifyEmail(token)
      .then(() => {
        setStatus("ok");
        setMessage("E-posta doğrulandı. Giriş yapabilirsin.");
      })
      .catch((error) => {
        setStatus("err");
        setMessage(error instanceof ApiError ? error.message : "Doğrulama başarısız.");
      });
  }, [token]);

  return (
    <Screen>
      <PageHeader title="E-posta doğrulama" subtitle="Hesabını kullanmadan önce e-postanı onayla." />
      <Card>
        <Text style={{ color: theme.color.text.primary, marginBottom: theme.space.md }}>{message}</Text>
        {status !== "busy" ? (
          <Button label="Girişe dön" onPress={() => router.replace("/(auth)/welcome")} />
        ) : null}
      </Card>
    </Screen>
  );
}
