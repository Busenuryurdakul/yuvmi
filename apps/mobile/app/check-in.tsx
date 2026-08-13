import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Screen } from "@/components/ui/Screen";
import { CheckInForm } from "@/components/checkin/CheckInForm";
import { useAuth } from "@/context/AuthContext";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { upsertCheckin } from "@/lib/api/yuvmi";
import { longDate } from "@/lib/formatDate";
import { theme } from "@/theme";

export default function CheckInScreen() {
  const { user } = useAuth();
  const { enqueue } = useOfflineQueue(user?.token);

  return (
    <Screen>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.kicker}>{longDate()}</Text>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Bugünkü hâlin</Text>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.close}>✕</Text>
          </Pressable>
        </View>
      </View>
      <CheckInForm
        onSubmit={async (data) => {
          if (!user?.token) return;
          try {
            await upsertCheckin(user.token, data);
            router.back();
          } catch {
            await enqueue({ type: "checkin", payload: data });
            Alert.alert("Çevrimdışı kaydedildi", "Günlük kontrol bağlantı gelince gönderilecek.");
            router.back();
          }
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: theme.space.xxl,
  },
  kicker: {
    fontFamily: theme.font.mono,
    color: theme.color.ink40,
    fontSize: 10.5,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: theme.space.sm,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    color: theme.color.ink,
    fontFamily: theme.font.sansExtra,
    fontSize: theme.font.size.display,
    fontWeight: theme.font.weight.extra,
    letterSpacing: -0.8,
  },
  close: {
    color: theme.color.ink40,
    fontSize: 22,
  },
});
