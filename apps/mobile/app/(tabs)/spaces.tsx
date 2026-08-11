import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { SPACE_TYPES, type SpaceType } from "@yuvmi/shared";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/context/AuthContext";
import {
  acceptSpaceInvite,
  createSpace,
  declineSpaceInvite,
  fetchPendingSpaceInvites,
  fetchSpaces,
} from "@/lib/api/yuvmi";
import type { PendingSpaceInviteResponse, SpaceResponse } from "@/lib/api/types";
import { theme } from "@/theme";

const sharedTypes: SpaceType[] = ["couple", "friends", "family"];

const statusLabel: Record<string, string> = {
  draft: "Taslak",
  pending: "Davet bekleniyor",
  active: "Aktif",
  archived: "Arşivlendi",
};

export default function SpacesScreen() {
  const { user } = useAuth();
  const [spaces, setSpaces] = useState<SpaceResponse[]>([]);
  const [invites, setInvites] = useState<PendingSpaceInviteResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<SpaceType | null>(null);

  const load = useCallback(async () => {
    if (!user?.token) return;
    const [s, i] = await Promise.allSettled([
      fetchSpaces(user.token),
      fetchPendingSpaceInvites(user.token),
    ]);
    setSpaces(s.status === "fulfilled" ? s.value : []);
    setInvites(i.status === "fulfilled" ? i.value : []);
    setLoading(false);
  }, [user?.token]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (type: SpaceType) => {
    if (!user?.token) return;
    setCreating(type);
    try {
      const space = await createSpace(user.token, { type });
      router.push(`/spaces/${space.id}`);
    } catch (e) {
      Alert.alert("Hata", e instanceof Error ? e.message : "Alan oluşturulamadı.");
    } finally {
      setCreating(null);
    }
  };

  const handleAccept = async (inviteId: string) => {
    if (!user?.token) return;
    try {
      const space = await acceptSpaceInvite(user.token, inviteId);
      await load();
      router.push(`/spaces/${space.id}`);
    } catch (e) {
      Alert.alert("Hata", e instanceof Error ? e.message : "Davet kabul edilemedi.");
    }
  };

  const handleDecline = async (inviteId: string) => {
    if (!user?.token) return;
    try {
      await declineSpaceInvite(user.token, inviteId);
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    } catch (e) {
      Alert.alert("Hata", e instanceof Error ? e.message : "Davet reddedilemedi.");
    }
  };

  if (loading) return <LoadingScreen />;

  const spacesByType = Object.fromEntries(spaces.map((s) => [s.type, s])) as Partial<
    Record<SpaceType, SpaceResponse>
  >;

  return (
    <Screen>
      <PageHeader
        title="Alanlar"
        subtitle="Kişisel yolculuğundan ortak alanlara — ne paylaşacağına sen karar ver."
      />

      {invites.length > 0 ? (
        <Card title="Bekleyen davetler" style={styles.section}>
          {invites.map((inv) => (
            <View key={inv.id} style={styles.inviteRow}>
              <View style={styles.inviteInfo}>
                <Text style={styles.inviteTitle}>{inv.spaceName}</Text>
                <Text style={styles.inviteMeta}>
                  {inv.inviterName} · {SPACE_TYPES[inv.spaceType as SpaceType]?.label.tr ?? inv.spaceType}
                </Text>
              </View>
              <View style={styles.inviteActions}>
                <Button label="Kabul" onPress={() => handleAccept(inv.id)} />
                <Button label="Reddet" variant="secondary" onPress={() => handleDecline(inv.id)} />
              </View>
            </View>
          ))}
        </Card>
      ) : null}

      <Card title={SPACE_TYPES.personal.label.tr} subtitle={SPACE_TYPES.personal.description.tr} style={styles.section}>
        <View style={styles.activeBadge}>
          <Text style={styles.activeBadgeText}>Varsayılan alanın</Text>
        </View>
      </Card>

      {sharedTypes.map((type) => {
        const existing = spacesByType[type];
        return (
          <Card
            key={type}
            title={SPACE_TYPES[type].label.tr}
            subtitle={SPACE_TYPES[type].description.tr}
            style={styles.section}
          >
            {existing ? (
              <Pressable onPress={() => router.push(`/spaces/${existing.id}`)}>
                <View style={styles.spaceRow}>
                  <View>
                    <Text style={styles.spaceName}>{existing.name}</Text>
                    <Text style={styles.spaceMeta}>
                      {statusLabel[existing.status] ?? existing.status} · {existing.members.length} üye
                    </Text>
                  </View>
                  <Text style={styles.chevron}>→</Text>
                </View>
              </Pressable>
            ) : (
              <Button
                label="Alan oluştur"
                variant="secondary"
                loading={creating === type}
                onPress={() => handleCreate(type)}
              />
            )}
          </Card>
        );
      })}

      {spaces.length === 0 && invites.length === 0 ? (
        <EmptyState
          emoji="🤝"
          title="Henüz ortak alan yok"
          description="Çift, arkadaş veya aile alanı oluşturarak birlikte büyümeye başla."
        />
      ) : null}

      <Text style={styles.note}>
        Ortak alanlar karşılıklı onayla açılır. Kişisel günlük ve notların otomatik paylaşılmaz.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: theme.space.lg },
  activeBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(91, 138, 138, 0.12)",
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.sm,
  },
  activeBadgeText: {
    fontSize: theme.font.size.sm,
    fontWeight: theme.font.weight.medium,
    color: theme.color.brand.tealText,
  },
  spaceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  spaceName: {
    fontSize: theme.font.size.md,
    fontWeight: theme.font.weight.semibold,
    color: theme.color.text.primary,
  },
  spaceMeta: {
    marginTop: theme.space.xs,
    fontSize: theme.font.size.xs,
    color: theme.color.text.tertiary,
  },
  chevron: { fontSize: theme.font.size.lg, color: theme.color.brand.roseText },
  inviteRow: { marginBottom: theme.space.lg },
  inviteInfo: { marginBottom: theme.space.sm },
  inviteTitle: {
    fontSize: theme.font.size.md,
    fontWeight: theme.font.weight.semibold,
    color: theme.color.text.primary,
  },
  inviteMeta: {
    marginTop: theme.space.xs,
    fontSize: theme.font.size.xs,
    color: theme.color.text.secondary,
  },
  inviteActions: { gap: theme.space.sm },
  note: {
    marginTop: theme.space.sm,
    fontSize: theme.font.size.xs,
    lineHeight: 18,
    color: theme.color.text.tertiary,
    textAlign: "center",
  },
});
