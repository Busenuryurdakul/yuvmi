import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { setAlertPresenter, type AlertButton, type AlertRequest } from "@/lib/alert";
import { theme } from "@/theme";

/**
 * Renders alert() dialogs in-app on web, where the platform dialogs are either
 * a no-op (react-native-web's Alert) or suppressed by the embedding browser.
 * Mounted once at the root; native platforms keep using the OS alert and this
 * simply never receives a request.
 */
export function AlertHost() {
  const [request, setRequest] = useState<AlertRequest | null>(null);

  useEffect(() => {
    setAlertPresenter((next) => setRequest(next));
    return () => setAlertPresenter(null);
  }, []);

  function dismiss(button?: AlertButton) {
    setRequest(null);
    button?.onPress?.();
  }

  const cancelButton = request?.buttons.find((b) => b.style === "cancel");
  const actionButtons = request?.buttons.filter((b) => b.style !== "cancel") ?? [];

  return (
    <Modal
      visible={request !== null}
      transparent
      animationType="fade"
      onRequestClose={() => dismiss(cancelButton)}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{request?.title}</Text>
          {request?.message ? <Text style={styles.message}>{request.message}</Text> : null}

          <View style={styles.actions}>
            {actionButtons.map((button) => (
              <Pressable
                key={button.text}
                accessibilityRole="button"
                onPress={() => dismiss(button)}
                style={({ pressed }) => [
                  styles.action,
                  button.style === "destructive" ? styles.destructive : styles.primary,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.actionLabel}>{button.text}</Text>
              </Pressable>
            ))}

            {cancelButton ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => dismiss(cancelButton)}
                style={({ pressed }) => [styles.action, styles.cancel, pressed && styles.pressed]}
              >
                <Text style={styles.cancelLabel}>{cancelButton.text}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(11,18,32,0.42)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#fff",
    borderRadius: theme.radius.xl,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontFamily: theme.font.sansBold,
    fontWeight: theme.font.weight.bold,
    fontSize: 16,
    color: theme.color.ink,
  },
  message: {
    marginTop: 8,
    fontFamily: theme.font.sans,
    fontSize: 13.5,
    lineHeight: 19,
    color: theme.color.ink70,
  },
  actions: {
    marginTop: 18,
    gap: 8,
  },
  action: {
    minHeight: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  primary: {
    backgroundColor: theme.color.blue,
  },
  destructive: {
    backgroundColor: theme.color.danger,
  },
  cancel: {
    backgroundColor: "transparent",
  },
  pressed: {
    opacity: 0.85,
  },
  actionLabel: {
    fontFamily: theme.font.sansSemibold,
    fontWeight: theme.font.weight.semibold,
    fontSize: 14.5,
    color: "#fff",
  },
  cancelLabel: {
    fontFamily: theme.font.sansSemibold,
    fontWeight: theme.font.weight.semibold,
    fontSize: 14.5,
    color: theme.color.ink70,
  },
});
