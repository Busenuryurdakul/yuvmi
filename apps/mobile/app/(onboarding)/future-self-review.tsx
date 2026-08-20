import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { PageHeader } from "@/components/ui/PageHeader";
import { Stepper } from "@/components/ui/Stepper";
import { Button } from "@/components/ui/Button";
import { alert } from "@/lib/alert";
import { Card } from "@/components/ui/Card";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { domainDisplayLabel } from "@/components/future-self/DomainChipGrid";
import { useAuth } from "@/context/AuthContext";
import { approveFutureSelf, fetchFutureSelf } from "@/lib/api/yuvmi";
import type { FutureSelfResponse } from "@/lib/api/types";
import { theme } from "@/theme";

export default function FutureSelfReviewScreen() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<FutureSelfResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!user?.token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFutureSelf();
      if (data.status === "approved") {
        router.replace("/(onboarding)/goal");
        return;
      }
      setProfile(data);
    } catch {
      const message = "Profil yüklenemedi.";
      setError(message);
      alert("Hata", message);
    } finally {
      setLoading(false);
    }
  }, [user?.token]);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile]),
  );

  function handleEdit() {
    if (profile?.status === "approved") {
      router.replace("/(onboarding)/goal");
      return;
    }
    router.replace("/(onboarding)/future-self");
  }

  async function handleApprove() {
    if (!user?.token) return;
    setError(null);
    setSubmitting(true);
    try {
      await approveFutureSelf();
      router.replace("/(onboarding)/goal");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Bir hata oluştu.";
      setError(message);
      alert("Onaylanamadı", message);
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
              {domainDisplayLabel(d)}
            </Text>
          ))}
        </View>
        {profile?.affirmations?.[0] ? (
          <Text style={styles.affirmation}>“{profile.affirmations[0]}”</Text>
        ) : null}
      </Card>
      <View style={styles.actions}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button label="Onayla ve devam et" loading={submitting} onPress={() => void handleApprove()} />
        <Button label="Düzenle" variant="secondary" onPress={handleEdit} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: theme.font.size.md, color: theme.color.text.secondary, lineHeight: 22 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: theme.space.sm, marginTop: theme.space.lg },
  tag: {
    fontSize: theme.font.size.xs,
    color: theme.color.ink40,
    backgroundColor: theme.color.surface.sunken,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.xs,
    borderRadius: theme.radius.pill,
  },
  affirmation: {
    marginTop: theme.space.lg,
    color: theme.color.text.primary,
  },
  actions: { marginTop: theme.space.xl, gap: theme.space.sm },
  error: {
    color: theme.color.danger,
    fontSize: theme.font.size.sm,
    lineHeight: 20,
  },
});
