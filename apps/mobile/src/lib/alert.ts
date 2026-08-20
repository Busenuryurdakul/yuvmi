import { Alert as RNAlert, Platform } from "react-native";

export type AlertButton = { text: string; onPress?: () => void; style?: "default" | "cancel" | "destructive" };

export type AlertRequest = { title: string; message?: string; buttons: AlertButton[] };

type Presenter = (request: AlertRequest) => void;

let presenter: Presenter | null = null;

/**
 * AlertHost registers itself here on mount so web alerts render in-app.
 * Passing null clears the registration on unmount.
 */
export function setAlertPresenter(next: Presenter | null) {
  presenter = next;
}

/**
 * react-native-web's Alert.alert is a no-op, so on web it silently swallows
 * every error/confirmation dialog.
 *
 * The fallback used to be window.confirm / window.alert, but those are
 * suppressed inside embedded browsers (the in-app preview, WebViews, or once
 * a user ticks "prevent additional dialogs"). A suppressed confirm() returns
 * false, so every destructive action silently resolved to "cancel" — deleting
 * an intention, for instance, appeared to do nothing at all. Rendering the
 * dialog in-app instead keeps confirmations working everywhere; window.* is
 * kept only for the window between module load and AlertHost mounting.
 */
export function alert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== "web") {
    RNAlert.alert(title, message, buttons);
    return;
  }

  const list = buttons?.length ? buttons : [{ text: "Tamam" }];

  if (presenter) {
    presenter({ title, message, buttons: list });
    return;
  }

  const text = [title, message].filter(Boolean).join("\n\n");

  if (list.length === 1) {
    window.alert(text);
    list[0].onPress?.();
    return;
  }

  const confirmButton = list.find((b) => b.style !== "cancel") ?? list[0];
  const cancelButton = list.find((b) => b.style === "cancel");

  if (window.confirm(text)) {
    confirmButton.onPress?.();
  } else {
    cancelButton?.onPress?.();
  }
}
