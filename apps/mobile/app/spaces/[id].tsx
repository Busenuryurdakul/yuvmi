import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SPACE_TYPES, type SpaceType } from "@yuvmi/shared";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { useAuth } from "@/context/AuthContext";
import { fetchSpace, leaveSpace } from "@/lib/api/yuvmi";
import type { SpaceResponse } from "@/lib/api/types";
import { theme } from "@/theme";

const statusLabel: Record<string, string> = {
  draft: "Taslak",
  pending: "Davet bekleniyor",
  active: "Aktif",
  archived: "Arşivlendi",
};

export default function SpaceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [space, setSpace] = useState<SpaceResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.token || !id) return;
    fetchSpace(user.token, id)
      .then(setSpace)
      .catch(() => Alert.alert("Hata", "Alan yüklenemedi."))
      .finally(() => setLoading(false));
  }, [user?.token, id]);

  const isOwner = space?.myRole === "owner";
  const typeInfo = space ? SPACE_TYPES[space.type as SpaceType] : null;

  const handleLeave = () => {
    if (!user?.token || !space) return;
    Alert.alert("Alandan ayrıl", "Bu alandan ayrılmak istediğine emin misin?", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Ayrıl",
        style: "destructive",
        onPress: async () => {
          try {
            await leaveSpace(user.token!, space.id);
            router.back();
          } catch (e) {
            Alert.alert("Hata", e instanceof Error ? e.message : "Ayrılma başarısız.");
          }
        },
      },
    ]);
  };

  if (loading) return <LoadingScreen />;
  if (!space) return null;

  return (
    <Screen>
      <Button label="← Geri" variant="ghost" fullWidth={false} onPress={() => router.back()} />
      <PageHeader
        title={space.name}
        subtitle={typeInfo?.description.tr ?? "Ortak alan"}
      />

      <Card title="Durum">
        <Text style={styles.meta}>{statusLabel[space.status] ?? space.status}</Text>
      </Card>

      <Card title="Üyeler" style={styles.gap}>
        {space.members.map((m) => (
          <View key={m.userId} style={styles.memberRow}>
            <View>
              <Text style={styles.memberName}>{m.displayName}</Text>
              <Text style={styles.memberMeta}>
                {m.role === "owner" ? "Sahip" : m.role === "viewer" ? "İzleyici" : "Üye"}
                {m.status === "pending" ? " · Onay bekliyor" : ""}
              </Text>
            </View>
          </View>
        ))}
      </Card>

      {space.pendingInvites && space.pendingInvites.length > 0 ? (
        <Card title="Bekleyen davetler" style={styles.gap}>
          {space.pendingInvites.map((inv) => (
            <Text key={inv.id} style={styles.inviteEmail}>
              {inv.inviteeEmail}
            </Text>
          ))}
        </Card>
      ) : null}

      {isOwner && space.status !== "active" ? (
        <Button
          label="Davet gönder"
          style={styles.gap}
          onPress={() => router.push({ pathname: "/spaces/invite", params: { spaceId: space.id } })}
        />
      ) : null}

      {!isOwner && space.myRole ? (
        <Button label="Alandan ayrıl" variant="secondary" style={styles.gap} onPress={handleLeave} />
      ) : null}

      <Text style={styles.note}>
        Kişisel günlük ve check-in verilerin otomatik paylaşılmaz. Paylaşım Faz 3.2 ile gelecek.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { marginTop: theme.space.lg },
  meta: { fontSize: theme.font.size.sm, color: theme.color.text.secondary },
  memberRow: {
    paddingVertical: theme.space.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.line.soft,
  },
  memberName: {
    fontSize: theme.font.size.md,
    fontWeight: theme.font.weight.medium,
    color: theme.color.text.primary,
  },
  memberMeta: {
    marginTop: theme.space.xs,
    fontSize: theme.font.size.xs,
    color: theme.color.text.tertiary,
  },
  inviteEmail: {
    fontSize: theme.font.size.sm,
    color: theme.color.text.secondary,
    marginBottom: theme.space.xs,
  },
  note: {
    marginTop: theme.space.xl,
    fontSize: theme.font.size.xs,
    lineHeight: 18,
    color: theme.color.text.tertiary,
    textAlign: "center",
  },
});
