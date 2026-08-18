import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { AISuggestionState } from "@/hooks/useAISuggestions";
import { theme } from "@/theme";

type Props = {
  state: AISuggestionState;
  /** Label shown when the list is the app's own static one. */
  fallbackLabel: string;
  /** Label shown once the suggestions came from the model. */
  aiLabel: string;
  /** One-line pitch on the opt-in prompt, e.g. what will be personalised. */
  consentPitch: string;
  onGrant: () => void;
};

/**
 * The strip above a suggestion list. It has one job: never let the user wonder
 * where a suggestion came from.
 *
 * `unavailable` deliberately renders as the plain fallback label with no error
 * text. A failed generation is not the user's problem to solve — they still
 * have a working list in front of them, and surfacing "AI request failed" here
 * would only make a working screen feel broken.
 */
export function AISuggestionHeader({
  state,
  fallbackLabel,
  aiLabel,
  consentPitch,
  onGrant,
}: Props) {
  if (state === "needsConsent") {
    return (
      <View style={styles.consentBox}>
        <Text style={styles.consentPitch}>{consentPitch}</Text>
        <View style={styles.consentActions}>
          <Pressable onPress={onGrant} style={styles.consentButton}>
            <Text style={styles.consentButtonText}>Öneri hazırla</Text>
          </Pressable>
        </View>
        <Text style={styles.consentNote}>
          Sadece Gelecekteki Ben profilin kullanılır. E-postan veya adın gönderilmez.
          Bunu istediğin an ayarlardan kapatabilirsin.
        </Text>
      </View>
    );
  }

  if (state === "generating" || state === "checking") {
    return (
      <View style={styles.row}>
        <ActivityIndicator size="small" color={theme.color.text.secondary} />
        <Text style={styles.hint}>Senin için hazırlanıyor…</Text>
      </View>
    );
  }

  if (state === "ready") {
    return (
      <View style={styles.row}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>AI önerisi</Text>
        </View>
        <Text style={styles.hint}>{aiLabel}</Text>
      </View>
    );
  }

  return <Text style={styles.hint}>{fallbackLabel}</Text>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: theme.space.sm,
  },
  hint: {
    fontSize: theme.font.size.xs,
    color: theme.color.text.secondary,
    lineHeight: 18,
    marginBottom: theme.space.sm,
  },
  badge: {
    backgroundColor: theme.color.blue,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
    marginBottom: theme.space.sm,
  },
  badgeText: {
    fontSize: 11,
    color: "#fff",
    fontWeight: theme.font.weight.semibold,
  },
  consentBox: {
    borderWidth: 1,
    borderColor: theme.color.line.soft,
    borderRadius: theme.radius.md,
    backgroundColor: "rgba(255,255,255,0.5)",
    padding: theme.space.md,
    marginBottom: theme.space.md,
  },
  consentPitch: {
    fontSize: theme.font.size.sm,
    color: theme.color.text.primary,
    lineHeight: 20,
    marginBottom: theme.space.sm,
  },
  consentActions: {
    flexDirection: "row",
  },
  consentButton: {
    backgroundColor: theme.color.blue,
    borderRadius: 999,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  consentButtonText: {
    color: "#fff",
    fontSize: theme.font.size.sm,
    fontWeight: theme.font.weight.semibold,
  },
  consentNote: {
    fontSize: 11,
    color: theme.color.text.tertiary,
    lineHeight: 16,
    marginTop: theme.space.sm,
  },
});
