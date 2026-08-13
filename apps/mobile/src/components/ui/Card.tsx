import type { ReactNode } from "react";
import { StyleSheet, Text, View, type ViewProps } from "react-native";
import { Glass } from "@/components/ui/Glass";
import { theme } from "@/theme";

type CardProps = ViewProps & {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  tone?: "paper" | "ink";
};

export function Card({ children, title, subtitle, tone = "paper", style }: CardProps) {
  const ink = tone === "ink";
  const body = (
    <>
      {title ? <Text style={[styles.title, ink && styles.titleInk]}>{title}</Text> : null}
      {subtitle ? <Text style={[styles.subtitle, ink && styles.subtitleInk]}>{subtitle}</Text> : null}
      {children}
    </>
  );

  if (ink) {
    return (
      <View style={[styles.cardInk, style]}>
        {body}
      </View>
    );
  }

  return (
    <Glass style={[styles.pad, style]}>
      {body}
    </Glass>
  );
}

const styles = StyleSheet.create({
  pad: {
    padding: 17,
  },
  cardInk: {
    backgroundColor: theme.color.ink,
    borderRadius: theme.radius.xl,
    padding: 17,
  },
  title: {
    fontFamily: theme.font.sansBold,
    fontSize: 16.5,
    fontWeight: theme.font.weight.bold,
    color: theme.color.ink,
    marginBottom: 4,
  },
  titleInk: {
    color: theme.color.onInk,
  },
  subtitle: {
    fontFamily: theme.font.sans,
    fontSize: theme.font.size.sm,
    color: theme.color.ink70,
    marginBottom: 13,
    lineHeight: 20,
  },
  subtitleInk: {
    color: theme.color.onInkMuted,
  },
});
