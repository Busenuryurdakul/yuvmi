import { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/context/AuthContext";
import {
  fetchNotifications,
  markNotificationRead,
  sendTestPush,
} from "@/lib/api/yuvmi";
import type { NotificationResponse } from "@/lib/api/types";
import { theme } from "@/theme";

export default function NotificationsScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.token) return;
    setLoading(true);
    try {
      const data = await fetchNotifications(user.token);
      setItems(data);
    } catch (error) {
      Alert.alert("Yüklenemedi", error instanceof Error ? error.message : "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, [user?.token]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function handleRead(item: NotificationResponse) {
    if (!user?.token || item.readAt) return;
    try {
      await markNotificationRead(user.token, item.id);
      await load();
    } catch {
      // ignore
    }
  }

  async function handleTestPush() {
    if (!user?.token) return;
    try {
      await sendTestPush(user.token);
      Alert.alert("Gönderildi", "Test bildirimi kuyruğa alındı.");
      await load();
    } catch (error) {
      Alert.alert("Gönderilemedi", error instanceof Error ? error.message : "Bir hata oluştu.");
    }
  }

  if (loading) return <LoadingScreen />;

  return (
    <Screen>
      <PageHeader title="Bildirimler" subtitle="Uygulama içi mesajlar." />
      <Button label="Test push gönder" variant="secondary" onPress={() => void handleTestPush()} />

      {items.length === 0 ? (
        <Card style={styles.gap}>
          <EmptyState emoji="🔔" title="Bildirim yok" description="Haftalık değerlendirme ve hatırlatıcılar burada görünür." />
        </Card>
      ) : (
        items.map((item) => (
          <Pressable key={item.id} onPress={() => void handleRead(item)}>
            <Card style={[styles.gap, !item.readAt && styles.unread]}>
              <View style={styles.row}>
                <Text style={styles.title}>{item.title}</Text>
                {!item.readAt ? <View style={styles.dot} /> : null}
              </View>
              <Text style={styles.body}>{item.body}</Text>
              {item.type === "weekly_review" ? (
                <Button
                  label="Değerlendirmeyi aç"
                  variant="ghost"
                  onPress={() => router.push("/weekly-review")}
                />
              ) : null}
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { marginTop: theme.space.lg },
  unread: { borderColor: theme.color.brand.roseText, borderWidth: 1 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: {
    fontSize: theme.font.size.md,
    fontWeight: theme.font.weight.semibold,
    color: theme.color.text.primary,
    flex: 1,
  },
  body: {
    fontSize: theme.font.size.sm,
    color: theme.color.text.secondary,
    lineHeight: 20,
    marginTop: theme.space.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.color.brand.roseText,
    marginLeft: theme.space.sm,
  },
});
