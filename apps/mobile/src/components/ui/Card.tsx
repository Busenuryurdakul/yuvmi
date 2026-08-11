import type { ReactNode } from "react";
import { StyleSheet, Text, View, type ViewProps } from "react-native";
import { theme } from "@/theme";

type CardProps = ViewProps & {
  children: ReactNode;
  title?: string;
  subtitle?: string;
};

export function Card({ children, title, subtitle, style, ...props }: CardProps) {
  return (
    <View style={[styles.card, style]} {...props}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.88)",
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.color.line.soft,
    padding: theme.space.xl,
  },
  title: {
    fontSize: theme.font.size.lg,
    fontWeight: theme.font.weight.semibold,
    color: theme.color.text.primary,
    marginBottom: theme.space.xs,
  },
  subtitle: {
    fontSize: theme.font.size.sm,
    color: theme.color.text.secondary,
    marginBottom: theme.space.lg,
    lineHeight: 20,
  },
});
