import { Alert as RNAlert, Platform } from "react-native";

type AlertButton = { text: string; onPress?: () => void; style?: "default" | "cancel" | "destructive" };

/**
 * react-native-web's Alert.alert is a no-op, so on web it silently swallows
 * every error/confirmation dialog. This wrapper falls back to window.alert /
 * window.confirm so messages actually reach the user there.
 */
export function alert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== "web") {
    RNAlert.alert(title, message, buttons);
    return;
  }

  const text = [title, message].filter(Boolean).join("\n\n");

  if (!buttons || buttons.length <= 1) {
    window.alert(text);
    buttons?.[0]?.onPress?.();
    return;
  }

  const confirmButton = buttons.find((b) => b.style !== "cancel") ?? buttons[0];
  const cancelButton = buttons.find((b) => b.style === "cancel");

  if (window.confirm(text)) {
    confirmButton.onPress?.();
  } else {
    cancelButton?.onPress?.();
  }
}
