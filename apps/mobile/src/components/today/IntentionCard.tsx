import { Pressable, StyleSheet, Text, View } from "react-native";
import { Glass } from "@/components/ui/Glass";
import { theme } from "@/theme";

export type IntentionState = "full" | "small" | "none";

type IntentionCardProps = {
  title: string;
  anchor?: string;
  target?: string;
  protectHint?: string;
  protected?: boolean;
  lowEnergy?: boolean;
  value?: IntentionState;
  onChange: (value: IntentionState | undefined) => void;
};

const STATES: Array<{ v: IntentionState; label: string }> = [
  { v: "full", label: "Yaptım" },
  { v: "small", label: "Minimum hâliyle" },
  { v: "none", label: "Olmadı" },
];

export function IntentionCard({
  title,
  anchor,
  target,
  protectHint,
  protected: isProtected,
  lowEnergy,
  value,
  onChange,
}: IntentionCardProps) {
  return (
    <Glass style={[styles.card, value && styles.done, lowEnergy && styles.lowE]}>
      <Text style={styles.title}>{title}</Text>
      {anchor ? <Text style={styles.anchor}>{anchor}</Text> : null}
      {target ? <Text style={styles.target}>{target}</Text> : null}
      {isProtected && protectHint ? <Text style={styles.protect}>{protectHint}</Text> : null}
      <View style={styles.states}>
        {(isProtected ? [STATES[1], STATES[0], STATES[2]] : STATES).map((s) => {
          const on = value === s.v;
          return (
            <Pressable
              key={s.v}
              onPress={() => onChange(on ? undefined : s.v)}
              style={[
                styles.st,
                s.v === "small" && isProtected && styles.stProtect,
                on && s.v === "full" && styles.stFull,
                on && s.v === "small" && styles.stSmall,
                on && s.v === "none" && styles.stNone,
              ]}
            >
              <Text
                style={[
                  styles.stLabel,
                  on && s.v === "full" && styles.stLabelOn,
                  on && s.v === "small" && styles.stLabelSmall,
                  on && s.v === "none" && styles.stLabelOn,
                ]}
              >
                {s.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Glass>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingTop: 13,
    paddingBottom: 13,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  done: {
    opacity: 0.55,
  },
  lowE: {
    borderColor: "rgba(37,99,235,0.35)",
  },
  title: {
    fontFamily: theme.font.sansBold,
    fontSize: 14.5,
    fontWeight: theme.font.weight.bold,
    lineHeight: 19,
    letterSpacing: -0.1,
    color: theme.color.ink,
  },
  anchor: {
    fontFamily: theme.font.mono,
    fontSize: 10,
    letterSpacing: 0.2,
    textTransform: "none",
    color: theme.color.ink40,
    marginTop: 4,
  },
  target: {
    marginTop: 6,
    fontFamily: theme.font.sansSemibold,
    fontSize: 12.5,
    fontWeight: theme.font.weight.semibold,
    color: theme.color.blueDeep,
  },
  protect: {
    marginTop: 9,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "rgba(37,99,235,0.13)",
    color: theme.color.blueDeep,
    fontFamily: theme.font.sans,
    fontSize: 11.5,
    lineHeight: 16,
  },
  states: {
    flexDirection: "row",
    gap: 5,
    marginTop: 10,
  },
  st: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.color.ink15,
    backgroundColor: "rgba(255,255,255,0.4)",
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  stProtect: {
    borderColor: theme.color.blue,
    flex: 1.5,
  },
  stFull: {
    backgroundColor: theme.color.blue,
    borderColor: theme.color.blue,
  },
  stSmall: {
    backgroundColor: "rgba(37,99,235,0.2)",
    borderColor: "transparent",
  },
  stNone: {
    backgroundColor: theme.color.ink,
    borderColor: theme.color.ink,
  },
  stLabel: {
    fontFamily: theme.font.sansMedium,
    fontSize: 11,
    fontWeight: theme.font.weight.medium,
    color: theme.color.ink70,
    textAlign: "center",
    lineHeight: 16,
  },
  stLabelOn: {
    color: "#fff",
  },
  stLabelSmall: {
    color: theme.color.blueDeep,
  },
});
