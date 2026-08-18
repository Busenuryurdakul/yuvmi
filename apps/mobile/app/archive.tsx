import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { alert } from "@/lib/alert";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { assetContentUrl, fetchMyAssets, uploadAsset } from "@/lib/api/yuvmi";
import type { AssetResponse } from "@/lib/api/types";
import { theme } from "@/theme";

function visibilityLabel(v: AssetResponse["visibility"]) {
  switch (v) {
    case "space_members":
      return "Alan üyeleriyle paylaşıldı";
    case "specific_members":
      return "Seçili üyelerle paylaşıldı";
    default:
      return "Yalnızca sen";
  }
}

export default function ArchiveScreen() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<AssetResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    if (!user?.token) return;
    try {
      setAssets(await fetchMyAssets());
    } catch {
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [user?.token]);

  useEffect(() => {
    void load();
  }, [load]);

  const pickImage = async () => {
    if (!user?.token) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      alert("İzin gerekli", "Galeri erişimi olmadan yükleme yapılamaz.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    const file = result.assets[0];
    setUploading(true);
    try {
      const name = file.fileName ?? `image-${Date.now()}.jpg`;
      const type = file.mimeType ?? "image/jpeg";
      await uploadAsset({ uri: file.uri, name, type });
      await load();
    } catch (e) {
      alert("Hata", e instanceof Error ? e.message : "Yükleme başarısız.");
    } finally {
      setUploading(false);
    }
  };

  const pickDocument = async () => {
    if (!user?.token) return;
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "text/plain"],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const file = result.assets[0];
    setUploading(true);
    try {
      await uploadAsset({
        uri: file.uri,
        name: file.name,
        type: file.mimeType ?? "application/pdf",
      });
      await load();
    } catch (e) {
      alert("Hata", e instanceof Error ? e.message : "Yükleme başarısız.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <Screen scroll={false}>
      <Button label="← Geri" variant="ghost" fullWidth={false} onPress={() => router.back()} />
      <PageHeader
        title="Arşiv"
        subtitle="Görseller ve belgeler — neyi, kiminle paylaşacağına sen karar ver."
      />

      <View style={styles.actions}>
        <Button label="Görsel yükle" loading={uploading} onPress={pickImage} />
        <Button label="Belge yükle" variant="secondary" loading={uploading} onPress={pickDocument} />
      </View>

      <FlatList
        data={assets}
        keyExtractor={(asset) => asset.id}
        style={styles.list}
        contentContainerStyle={assets.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={
          <EmptyState
            emoji="📁"
            title="Arşiv boş"
            description="Vizyon kartları, PDF'ler veya fotoğraflarını buraya ekle."
          />
        }
        renderItem={({ item: asset }) => (
          <Pressable onPress={() => router.push(`/asset/${asset.id}`)}>
            <Card style={styles.card}>
              <View style={styles.row}>
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
                    <Text style={styles.docEmoji}>{asset.type === "image" ? "🖼️" : "📄"}</Text>
                  </View>
                )}
                <View style={styles.info}>
                  <Text style={styles.title}>{asset.title}</Text>
                  <Text style={styles.meta}>{visibilityLabel(asset.visibility)}</Text>
                  {asset.revokedFromSpaceAt ? (
                    <Text style={styles.revoked}>Alandan geri çekildi</Text>
                  ) : null}
                </View>
              </View>
            </Card>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: theme.space.sm, marginBottom: theme.space.lg },
  list: { flex: 1 },
  listContent: { paddingBottom: theme.space.xl },
  emptyContainer: { flexGrow: 1 },
  card: { marginBottom: theme.space.md },
  row: { flexDirection: "row", gap: theme.space.md, alignItems: "center" },
  thumb: { width: 56, height: 56, borderRadius: theme.radius.sm, backgroundColor: theme.color.surface.sunken },
  docThumb: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.color.surface.sunken,
    alignItems: "center",
    justifyContent: "center",
  },
  docEmoji: { fontSize: 24 },
  info: { flex: 1 },
  title: {
    fontSize: theme.font.size.md,
    fontWeight: theme.font.weight.semibold,
    color: theme.color.text.primary,
  },
  meta: { marginTop: theme.space.xs, fontSize: theme.font.size.xs, color: theme.color.text.secondary },
  revoked: { marginTop: theme.space.xs, fontSize: theme.font.size.xs, color: theme.color.danger },
});
