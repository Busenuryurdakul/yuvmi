import { useEffect, useRef } from "react";
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

export function usePushNotifications(token: string | null | undefined) {
  const registered = useRef(false);

  useEffect(() => {
    if (!token || registered.current) return;

    (async () => {
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

      const pushToken = (await Notifications.getExpoPushTokenAsync()).data;
      await registerPushToken(token, pushToken);
      registered.current = true;
    })().catch(() => {
      // Push optional in dev/simulator
    });
  }, [token]);
}
