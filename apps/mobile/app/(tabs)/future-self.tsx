import { useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { useAuth } from "@/context/AuthContext";
import { fetchFutureSelf } from "@/lib/api/yuvmi";
import type { FutureSelfResponse } from "@/lib/api/types";
import { LIFE_DOMAINS } from "@yuvmi/shared";
import { theme } from "@/theme";

export default function FutureSelfScreen() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<FutureSelfResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.token) return;
    fetchFutureSelf(user.token)
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [user?.token]);

  if (loading) return <LoadingScreen />;

  return (
    <Screen>
      <PageHeader title="Gelecekteki Ben" subtitle="Onayladığın vizyon özeti." />
      {profile ? (
        <>
          <Card title={profile.title}>
            <Text style={styles.body}>{profile.description}</Text>
          </Card>
          <Card title="Yaşam alanları" style={styles.gap}>
            <Text style={styles.chips}>
              {profile.domains.map((d) => `${LIFE_DOMAINS[d].emoji} ${LIFE_DOMAINS[d].label.tr}`).join(" · ")}
            </Text>
          </Card>
          {profile.affirmations.length ? (
            <Card title="Olumlamalar">
              {profile.affirmations.map((a) => (
                <Text key={a} style={styles.affirmation}>
                  “{a}”
                </Text>
              ))}
            </Card>
          ) : null}
        </>
      ) : (
        <Card>
          <EmptyState emoji="✦" title="Profil bulunamadı" description="Onboarding'i tamamlaman gerekebilir." />
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: theme.font.size.md, lineHeight: 22, color: theme.color.text.secondary },
  gap: { marginTop: theme.space.lg },
  chips: { fontSize: theme.font.size.sm, color: theme.color.text.primary, lineHeight: 22 },
  affirmation: { fontStyle: "italic", color: theme.color.text.primary, marginBottom: theme.space.sm },
});
