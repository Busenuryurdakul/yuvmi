import { useCallback, useEffect, useState } from "react";
import { Alert, StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { SPACE_TYPES, type SpaceType } from "@yuvmi/shared";
import { Screen } from "@/components/ui/Screen";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { Eyebrow, Glass } from "@/components/ui/Glass";
import { TapRow } from "@/components/ui/TapRow";
import { useAuth } from "@/context/AuthContext";
import {
  acceptSpaceInvite,
  declineSpaceInvite,
  fetchMyAssets,
  fetchPendingSpaceInvites,
  fetchSpaces,
} from "@/lib/api/yuvmi";
import type { PendingSpaceInviteResponse, SpaceResponse } from "@/lib/api/types";
import { theme } from "@/theme";

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
  const [assetLabel, setAssetLabel] = useState("0 görsel · 0 belge");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.token) return;
    const [s, i, a] = await Promise.allSettled([
      fetchSpaces(user.token),
      fetchPendingSpaceInvites(user.token),
      fetchMyAssets(user.token),
    ]);
    setSpaces(s.status === "fulfilled" ? s.value : []);
    setInvites(i.status === "fulfilled" ? i.value : []);
    if (a.status === "fulfilled") {
      const images = a.value.filter((x) => x.type === "image").length;
      const docs = a.value.filter((x) => x.type === "document").length;
      setAssetLabel(`${images} görsel · ${docs} belge`);
    }
    setLoading(false);
  }, [user?.token]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingScreen />;

  return (
    <Screen tabBar>
      <PageHeader
        eyebrow="Paylaşım"
        eyebrowRight={spaces.length === 1 ? "1 alan" : `${spaces.length} alan`}
        title="Alanlar"
        subtitle="Neyi kiminle paylaşacağına sen karar verirsin."
      />

      {invites.map((inv) => (
        <Glass key={inv.id} style={styles.stat}>
          <Eyebrow style={styles.lbl}>Bekleyen davet</Eyebrow>
          <Text style={styles.title}>{inv.spaceName}</Text>
          <Text style={styles.body}>
            {inv.inviterName} · {SPACE_TYPES[inv.spaceType as SpaceType]?.label.tr ?? inv.spaceType}
          </Text>
          <Button label="Kabul et" onPress={async () => {
            if (!user?.token) return;
            try {
              const space = await acceptSpaceInvite(user.token, inv.id);
              router.push(`/spaces/${space.id}`);
            } catch (e) {
              Alert.alert("Hata", e instanceof Error ? e.message : "Davet kabul edilemedi.");
            }
          }} />
          <Button
            label="Reddet"
            variant="secondary"
            style={{ marginTop: 8 }}
            onPress={async () => {
              if (!user?.token) return;
              await declineSpaceInvite(user.token, inv.id);
              setInvites((prev) => prev.filter((x) => x.id !== inv.id));
            }}
          />
        </Glass>
      ))}

      <Glass style={styles.stat}>
        <Eyebrow style={styles.lbl}>Kişisel</Eyebrow>
        <Text style={styles.title}>Kendi alanın</Text>
        <Text style={styles.body}>
          Bugünün ve gelecekteki hâlinin yolculuğu. Varsayılan olarak yalnızca sana görünür.
        </Text>
        <TapRow title="Arşivim" subtitle={assetLabel} nested onPress={() => router.push("/archive")} />
      </Glass>

      <Glass style={styles.stat}>
        <Eyebrow style={styles.lbl}>Ortak alan</Eyebrow>
        <Text style={styles.title}>Birini davet et</Text>
        <Text style={styles.body}>
          Partner, arkadaş ya da aile — kim olduğunu sen seçersin. Alan karşılıklı onayla açılır.
        </Text>
        {spaces.map((space) => (
          <TapRow
            key={space.id}
            title={space.name}
            subtitle={`${statusLabel[space.status] ?? space.status} · ${space.members.length} üye`}
            nested
            onPress={() => router.push(`/spaces/${space.id}`)}
          />
        ))}
        <Button label="Davet gönder" variant="secondary" onPress={() => router.push("/spaces/invite")} />
      </Glass>

      <Text style={styles.note}>
        Kişisel günlüğün, notların ve ruh hâlin{"\n"}ortak alana otomatik yansımaz.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stat: {
    paddingVertical: 15,
    paddingHorizontal: 16,
    marginBottom: 9,
  },
  lbl: {
    marginBottom: 8,
  },
  title: {
    fontFamily: theme.font.sansBold,
    fontSize: 16,
    fontWeight: theme.font.weight.bold,
    color: theme.color.ink,
    marginBottom: 4,
  },
  body: {
    fontFamily: theme.font.sans,
    fontSize: 12.5,
    color: theme.color.ink70,
    lineHeight: 18,
    marginBottom: 12,
  },
  note: {
    marginTop: 14,
    fontFamily: theme.font.sans,
    fontSize: 11.5,
    lineHeight: 18,
    color: theme.color.ink40,
    textAlign: "center",
  },
});
