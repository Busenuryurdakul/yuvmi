import { Alert } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { PageHeader } from "@/components/ui/PageHeader";
import { CheckInForm } from "@/components/checkin/CheckInForm";
import { useAuth } from "@/context/AuthContext";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { upsertCheckin } from "@/lib/api/yuvmi";

export default function CheckInScreen() {
  const { user } = useAuth();
  const { enqueue } = useOfflineQueue(user?.token);

  return (
    <Screen>
      <PageHeader title="Bugünkü hal" subtitle="Nasıl hissediyorsun?" />
      <CheckInForm
        onSubmit={async (data) => {
          if (!user?.token) return;
          try {
            await upsertCheckin(user.token, data);
            router.back();
          } catch (e) {
            await enqueue({ type: "checkin", payload: data });
            Alert.alert("Çevrimdışı kaydedildi", "Check-in bağlantı gelince gönderilecek.");
            router.back();
          }
        }}
      />
    </Screen>
  );
}
