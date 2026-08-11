import { StyleSheet, Text, View } from "react-native";
import { theme } from "@/theme";

type EmptyStateProps = {
  emoji: string;
  title: string;
  description: string;
};

export function EmptyState({ emoji, title, description }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: theme.space.xxxl,
    paddingHorizontal: theme.space.lg,
  },
  emoji: {
    fontSize: 40,
    marginBottom: theme.space.lg,
  },
  title: {
    fontSize: theme.font.size.lg,
    fontWeight: theme.font.weight.semibold,
    color: theme.color.text.primary,
    textAlign: "center",
    marginBottom: theme.space.sm,
  },
  description: {
    fontSize: theme.font.size.sm,
    lineHeight: 22,
    color: theme.color.text.secondary,
    textAlign: "center",
  },
});
