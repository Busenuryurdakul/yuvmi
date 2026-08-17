import { useEffect } from "react";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { registerPushToken } from "@/lib/api/yuvmi";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Modül seviyesinde tutuluyor — hook örneğine bağlı bir ref olsaydı çıkış
 * yapıldığında sıfırlanamazdı ve push token yeni hesaba hiç yazılmazdı;
 * bildirimler eski hesaba gitmeye devam ederdi.
 */
let pushTokenRegistered = false;

/** Çıkışta çağrılır (src/context/AuthContext.tsx → signOut). */
export function resetPushRegistration() {
  pushTokenRegistered = false;
}

/**
 * `getExpoPushTokenAsync` projectId'yi kendisi `extra.eas.projectId`'den
 * okumayı dener, ama değer yoksa çalışma zamanında hata verir. Burada açıkça
 * okuyup eksikse anlaşılır bir uyarı basıyoruz.
 */
/** app.json'daki gerçek `eas init` çıktısı gelene kadar duran doldurucu değer. */
const PLACEHOLDER_PROJECT_ID = "YOUR_EAS_PROJECT_ID";

function easProjectId(): string | undefined {
  const eas: unknown = Constants.expoConfig?.extra?.eas;
  if (eas && typeof eas === "object" && "projectId" in eas) {
    const id = (eas as { projectId?: unknown }).projectId;
    if (typeof id === "string" && id.length > 0 && id !== PLACEHOLDER_PROJECT_ID) return id;
  }
  const fromEasConfig = Constants.easConfig?.projectId;
  if (typeof fromEasConfig === "string" && fromEasConfig.length > 0) return fromEasConfig;
  return undefined;
}

export function usePushNotifications(token: string | null | undefined) {
  useEffect(() => {
    if (!token || pushTokenRegistered) return;
    let cancelled = false;

    void (async () => {
      if (!Device.isDevice) return;

      const { status: existing } = await Notifications.getPermissionsAsync();
      let finalStatus = existing;
      if (existing !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== "granted") return;

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Yuvmi",
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }

      const projectId = easProjectId();
      if (!projectId) {
        console.warn(
          "[push] extra.eas.projectId tanımlı değil — push token alınamıyor. " +
            "apps/mobile dizininde `eas init` çalıştırın; komut değeri app.json'a yazar.",
        );
        return;
      }

      const pushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      if (cancelled) return;
      await registerPushToken(pushToken);
      pushTokenRegistered = true;
    })().catch((error: unknown) => {
      // Simülatörde ve izin verilmemiş cihazlarda beklenen bir durum; yine de
      // sessizce yutmuyoruz, çünkü gerçek kayıt hataları da buraya düşüyor.
      console.warn("[push] token kaydı başarısız:", error);
    });

    return () => {
      cancelled = true;
    };
  }, [token]);
}
