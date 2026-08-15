import { StyleSheet, Text, View } from "react-native";
import { theme } from "@/theme";

type EmptyStateProps = {
  emoji?: string;
  title: string;
  description: string;
};

export function EmptyState({ emoji, title, description }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {emoji ? <Text style={styles.emoji}>{emoji}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: theme.space.xxl,
    paddingHorizontal: theme.space.lg,
  },
  emoji: {
    fontSize: 28,
    marginBottom: theme.space.md,
  },
  title: {
    fontFamily: theme.font.sansBold,
    fontSize: theme.font.size.lg,
    fontWeight: theme.font.weight.bold,
    color: theme.color.ink,
    textAlign: "center",
    marginBottom: theme.space.sm,
  },
  description: {
    fontFamily: theme.font.sans,
    fontSize: theme.font.size.sm,
    lineHeight: 22,
    color: theme.color.ink70,
    textAlign: "center",
  },
});
