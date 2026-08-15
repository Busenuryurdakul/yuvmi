import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { PageHeader } from "@/components/ui/PageHeader";
import { Stepper } from "@/components/ui/Stepper";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { useAuth } from "@/context/AuthContext";
import { approveFutureSelf, fetchFutureSelf } from "@/lib/api/yuvmi";
import type { FutureSelfResponse } from "@/lib/api/types";
import { theme } from "@/theme";

export default function FutureSelfReviewScreen() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<FutureSelfResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user?.token) return;
    fetchFutureSelf(user.token)
      .then(setProfile)
      .catch(() => Alert.alert("Hata", "Profil yüklenemedi."))
      .finally(() => setLoading(false));
  }, [user?.token]);

  async function handleApprove() {
    if (!user?.token) return;
    setSubmitting(true);
    try {
      await approveFutureSelf(user.token);
      router.push("/(onboarding)/goal");
    } catch (error) {
      Alert.alert("Onaylanamadı", error instanceof Error ? error.message : "Bir hata oluştu.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingScreen />;

  return (
    <Screen>
      <PageHeader title="Profili onayla" subtitle="Dilediğin zaman güncelleyebilirsin." />
      <Stepper current={2} total={4} />
      <Card title={profile?.title ?? "Gelecekteki Ben"}>
        <Text style={styles.body}>{profile?.description || "—"}</Text>
        <View style={styles.tags}>
          {profile?.domains.map((d) => (
            <Text key={d} style={styles.tag}>
              {d}
            </Text>
          ))}
        </View>
        {profile?.affirmations?.[0] ? (
          <Text style={styles.affirmation}>“{profile.affirmations[0]}”</Text>
        ) : null}
      </Card>
      <View style={styles.actions}>
        <Button label="Onayla ve devam et" loading={submitting} onPress={() => void handleApprove()} />
        <Button label="Düzenle" variant="secondary" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: theme.font.size.md, color: theme.color.text.secondary, lineHeight: 22 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: theme.space.sm, marginTop: theme.space.lg },
  tag: {
    fontSize: theme.font.size.xs,
    color: theme.color.inkMuted,
    backgroundColor: theme.color.surface.sunken,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.xs,
    borderRadius: theme.radius.pill,
  },
  affirmation: {
    marginTop: theme.space.lg,
    fontStyle: "italic",
    color: theme.color.text.primary,
  },
  actions: { marginTop: theme.space.xl, gap: theme.space.sm },
});
