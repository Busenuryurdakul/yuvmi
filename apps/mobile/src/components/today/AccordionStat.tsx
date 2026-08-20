import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Glass, Mono } from "@/components/ui/Glass";
import { theme } from "@/theme";

type AccordionStatProps = {
  label: string;
  hint?: string;
  defaultOpen?: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function AccordionStat({ label, hint, defaultOpen = false, children, style }: AccordionStatProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Glass style={[styles.stat, style]}>
      <Pressable onPress={() => setOpen((v) => !v)} style={styles.head} accessibilityRole="button">
        <Mono style={styles.lbl}>{label}</Mono>
        <View style={styles.right}>
          {hint ? <Text style={styles.hint}>{hint}</Text> : null}
          <Text style={[styles.chev, open && styles.chevOpen]}>▾</Text>
        </View>
      </Pressable>
      {open ? <View style={styles.body}>{children}</View> : null}
    </Glass>
  );
}

const styles = StyleSheet.create({
  stat: {
    paddingVertical: 15,
    paddingHorizontal: 16,
    marginBottom: 9,
  },
  head: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  lbl: {
    marginBottom: 0,
    letterSpacing: 1.2,
    flexShrink: 1,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  hint: {
    fontFamily: theme.font.mono,
    fontSize: 11,
    letterSpacing: 0.4,
    color: theme.color.ink40,
  },
  chev: {
    fontSize: 14,
    color: theme.color.ink40,
  },
  chevOpen: {
    transform: [{ rotate: "180deg" }],
  },
  body: {
    marginTop: 10,
  },
});
