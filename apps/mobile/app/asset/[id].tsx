import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import type { VisibilityLevel } from "@yuvmi/shared";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { ShareVisibilityPicker } from "@/components/share/ShareVisibilityPicker";
import { useAuth } from "@/context/AuthContext";
import {
  assetContentUrl,
  fetchAsset,
  fetchSpaces,
  revokeAssetFromSpace,
  shareAsset,
} from "@/lib/api/yuvmi";
import type { AssetResponse, SpaceResponse } from "@/lib/api/types";
import { alert } from "@/lib/alert";
import { theme } from "@/theme";

export default function AssetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [asset, setAsset] = useState<AssetResponse | null>(null);
  const [spaces, setSpaces] = useState<SpaceResponse[]>([]);
  const [visibility, setVisibility] = useState<VisibilityLevel>("private");
  const [spaceId, setSpaceId] = useState<string | null>(null);
  const [granteeIds, setGranteeIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.token || !id) return;
    Promise.all([fetchAsset(id), fetchSpaces()])
      .then(([a, s]) => {
        setAsset(a);
        setSpaces(s.filter((sp) => sp.status === "active" || sp.status === "pending"));
        setVisibility(a.visibility as VisibilityLevel);
        setSpaceId(a.spaceId ?? null);
        setGranteeIds(a.granteeIds ?? []);
      })
      .catch(() => alert("Hata", "Dosya yüklenemedi."))
      .finally(() => setLoading(false));
  }, [user?.token, id]);

  const selectedSpace = spaces.find((s) => s.id === spaceId);

  const toggleGrantee = (userId: string) => {
    setGranteeIds((prev) =>
      prev.includes(userId) ? prev.filter((x) => x !== userId) : [...prev, userId],
    );
  };

  const handleShare = async () => {
    if (!user?.token || !asset) return;
    if (visibility !== "private" && !spaceId) {
      alert("Alan seç", "Paylaşım için bir ortak alan seç.");
      return;
    }
    setSaving(true);
    try {
      const updated = await shareAsset(asset.id, {
        visibility,
        spaceId: visibility === "private" ? undefined : spaceId ?? undefined,
        granteeIds: visibility === "specific_members" ? granteeIds : undefined,
      });
      setAsset(updated);
      alert("Kaydedildi", "Görünürlük ayarları güncellendi.");
    } catch (e) {
      alert("Hata", e instanceof Error ? e.message : "Paylaşım başarısız.");
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = () => {
    if (!user?.token || !asset) return;
    alert("Geri çek", "Bu içerik ortak alandan kaldırılır; arşivinde kalır.", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Geri çek",
        style: "destructive",
        onPress: async () => {
          try {
            const updated = await revokeAssetFromSpace(asset.id);
            setAsset(updated);
            setVisibility("private");
          } catch (e) {
            alert("Hata", e instanceof Error ? e.message : "Geri çekme başarısız.");
          }
        },
      },
    ]);
  };

  if (loading) return <LoadingScreen />;
  if (!asset) return null;

  const isShared = asset.visibility !== "private" && !asset.revokedFromSpaceAt;

  return (
    <Screen>
      <Button label="← Geri" variant="ghost" fullWidth={false} onPress={() => router.back()} />
      <PageHeader title={asset.title} subtitle={asset.type === "image" ? "Görsel" : "Belge"} />

      {asset.type === "image" && asset.url && user?.token ? (
        <Image
          source={{
            uri: assetContentUrl(asset),
            headers: { Authorization: `Bearer ${user.token}` },
          }}
          style={styles.preview}
          contentFit="cover"
          cachePolicy="disk"
        />
      ) : (
        <Card>
          <Text style={styles.docMeta}>{asset.mimeType} · {(asset.fileSize / 1024).toFixed(0)} KB</Text>
        </Card>
      )}

      {asset.isOwner ? (
        <>
          <Card title="Görünürlük" style={styles.gap}>
            <ShareVisibilityPicker value={visibility} onChange={setVisibility} />
          </Card>

          {visibility !== "private" ? (
            <Card title="Hangi alan?" style={styles.gap}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.spaceScroll}>
                {spaces.map((sp) => (
                  <Pressable
                    key={sp.id}
                    onPress={() => setSpaceId(sp.id)}
                    style={[styles.spaceChip, spaceId === sp.id && styles.spaceChipActive]}
                  >
                    <Text style={[styles.spaceChipText, spaceId === sp.id && styles.spaceChipTextActive]}>
                      {sp.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </Card>
          ) : null}

          {visibility === "specific_members" && selectedSpace ? (
            <Card title="Kimler görebilir?" style={styles.gap}>
              {selectedSpace.members
                .filter((m) => m.userId !== user?.id)
                .map((m) => (
                  <Pressable key={m.userId} onPress={() => toggleGrantee(m.userId)} style={styles.memberPick}>
                    <View style={[styles.check, granteeIds.includes(m.userId) && styles.checkOn]} />
                    <Text style={styles.memberName}>{m.displayName}</Text>
                  </Pressable>
                ))}
            </Card>
          ) : null}

          <Button label="Paylaşımı kaydet" loading={saving} style={styles.gap} onPress={handleShare} />

          {isShared ? (
            <Button label="Alandan geri çek" variant="secondary" style={styles.gap} onPress={handleRevoke} />
          ) : null}
        </>
      ) : (
        <Card style={styles.gap}>
          <Text style={styles.sharedNote}>Bu içerik seninle paylaşıldı.</Text>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { marginTop: theme.space.lg },
  preview: {
    width: "100%",
    height: 220,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.color.surface.sunken,
    marginBottom: theme.space.md,
  },
  docMeta: { fontSize: theme.font.size.sm, color: theme.color.text.secondary },
  spaceScroll: { flexGrow: 0 },
  spaceChip: {
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.sm,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.color.line.firm,
    marginRight: theme.space.sm,
  },
  spaceChipActive: {
    borderColor: theme.color.blue,
    backgroundColor: "rgba(196, 113, 123, 0.1)",
  },
  spaceChipText: { fontSize: theme.font.size.sm, color: theme.color.text.secondary },
  spaceChipTextActive: { color: theme.color.blueDeep, fontWeight: theme.font.weight.semibold },
  memberPick: { flexDirection: "row", alignItems: "center", gap: theme.space.md, paddingVertical: theme.space.sm },
  check: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: theme.color.line.firm,
  },
  checkOn: { backgroundColor: theme.color.blue, borderColor: theme.color.blue },
  memberName: { fontSize: theme.font.size.md, color: theme.color.text.primary },
  sharedNote: { fontSize: theme.font.size.sm, color: theme.color.text.secondary },
});
