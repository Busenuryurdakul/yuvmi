import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { SPACE_TYPES, type SpaceType } from "@yuvmi/shared";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { useAuth } from "@/context/AuthContext";
import { assetContentUrl, fetchSpace, fetchSpaceAssets, leaveSpace } from "@/lib/api/yuvmi";
import type { AssetResponse, SpaceResponse } from "@/lib/api/types";
import { alert } from "@/lib/alert";
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
  const [assets, setAssets] = useState<AssetResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.token || !id) return;
    Promise.all([fetchSpace(id), fetchSpaceAssets(id)])
      .then(([s, a]) => {
        setSpace(s);
        setAssets(a);
      })
      .catch(() => alert("Hata", "Alan yüklenemedi."))
      .finally(() => setLoading(false));
  }, [user?.token, id]);

  const isOwner = space?.myRole === "owner";
  const typeInfo = space ? SPACE_TYPES[space.type as SpaceType] : null;

  const handleLeave = () => {
    if (!user?.token || !space) return;
    alert("Alandan ayrıl", "Bu alandan ayrılmak istediğine emin misin?", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Ayrıl",
        style: "destructive",
        onPress: async () => {
          try {
            await leaveSpace(space.id);
            router.back();
          } catch (e) {
            alert("Hata", e instanceof Error ? e.message : "Ayrılma başarısız.");
          }
        },
      },
    ]);
  };

  if (loading) return <LoadingScreen />;
  if (!space) return null;

  return (
    <Screen scroll={false}>
      <FlatList
        data={assets}
        keyExtractor={(asset) => asset.id}
        style={styles.list}
        ListHeaderComponent={
          <>
            <Button label="← Geri" variant="ghost" fullWidth={false} onPress={() => router.back()} />
            <PageHeader title={space.name} subtitle={typeInfo?.description.tr ?? "Ortak alan"} />

            <Card title="Durum">
              <Text style={styles.meta}>{statusLabel[space.status] ?? space.status}</Text>
            </Card>

            <Card title="Üyeler" style={styles.gap}>
              {space.members.map((m) => (
                <View key={m.userId} style={styles.memberRow}>
                  <Text style={styles.memberName}>{m.displayName}</Text>
                  <Text style={styles.memberMeta}>
                    {m.role === "owner" ? "Sahip" : m.role === "viewer" ? "İzleyici" : "Üye"}
                    {m.status === "pending" ? " · Onay bekliyor" : ""}
                  </Text>
                </View>
              ))}
            </Card>

            <Text style={[styles.sectionTitle, styles.gap]}>Paylaşılan içerikler</Text>
            {assets.length === 0 ? <Text style={styles.meta}>Henüz paylaşılan içerik yok.</Text> : null}
          </>
        }
        renderItem={({ item: asset }) => (
          <Pressable onPress={() => router.push(`/asset/${asset.id}`)} style={styles.assetRow}>
            {asset.type === "image" && asset.url && user?.token ? (
              <Image
                source={{
                  uri: assetContentUrl(asset),
                  headers: { Authorization: `Bearer ${user.token}` },
                }}
                style={styles.thumb}
                cachePolicy="disk"
              />
            ) : (
              <View style={styles.docThumb}>
                <Text>📄</Text>
              </View>
            )}
            <View style={styles.assetInfo}>
              <Text style={styles.memberName}>{asset.title}</Text>
              <Text style={styles.memberMeta}>
                {asset.isOwner ? "Senin paylaşımın" : "Paylaşılan"}
              </Text>
            </View>
          </Pressable>
        )}
        ListFooterComponent={
          <>
            <Button label="Arşivden paylaş" variant="secondary" style={styles.gap} onPress={() => router.push("/archive")} />

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
          </>
        }
        contentContainerStyle={styles.listContent}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { marginTop: theme.space.lg },
  list: { flex: 1 },
  listContent: { paddingBottom: theme.space.xl },
  sectionTitle: {
    fontSize: 16.5,
    fontWeight: theme.font.weight.bold,
    color: theme.color.text.primary,
    marginBottom: theme.space.sm,
  },
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
  assetRow: { flexDirection: "row", gap: theme.space.md, alignItems: "center", marginBottom: theme.space.md },
  thumb: { width: 48, height: 48, borderRadius: theme.radius.sm },
  docThumb: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.color.surface.sunken,
    alignItems: "center",
    justifyContent: "center",
  },
  assetInfo: { flex: 1 },
  inviteEmail: {
    fontSize: theme.font.size.sm,
    color: theme.color.text.secondary,
    marginBottom: theme.space.xs,
  },
});
