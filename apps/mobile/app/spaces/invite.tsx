import { useState } from "react";
import { Alert, StyleSheet, Text } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { createSpaceInvite } from "@/lib/api/yuvmi";
import { theme } from "@/theme";

export default function SpaceInviteScreen() {
  const { spaceId } = useLocalSearchParams<{ spaceId: string }>();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!user?.token || !spaceId) return;
    const trimmed = email.trim();
    if (!trimmed.includes("@")) {
      Alert.alert("Eksik bilgi", "Geçerli bir e-posta adresi gir.");
      return;
    }
    setLoading(true);
    try {
      await createSpaceInvite(user.token, spaceId, trimmed);
      Alert.alert("Davet gönderildi", "Karşı taraf onayladığında alan aktif olur.", [
        { text: "Tamam", onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert("Hata", e instanceof Error ? e.message : "Davet gönderilemedi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Button label="← Geri" variant="ghost" fullWidth={false} onPress={() => router.back()} />
      <PageHeader
        title="Davet gönder"
        subtitle="Ortak alan karşılıklı onayla açılır."
      />

      <Card title="Partner e-postası">
        <Text style={styles.hint}>
          Davet edilen kişinin Yuvmi hesabı varsa bildirim alır. Yoksa kayıt olduğunda daveti görebilir.
        </Text>
        <Input
          label="E-posta"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          placeholder="ornek@email.com"
        />
        <Button label="Davet gönder" loading={loading} onPress={handleSend} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: {
    fontSize: theme.font.size.sm,
    lineHeight: 20,
    color: theme.color.text.secondary,
    marginBottom: theme.space.md,
  },
});
