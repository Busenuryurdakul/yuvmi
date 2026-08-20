import type { ReactNode } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Glass, Mono } from "@/components/ui/Glass";
import { theme } from "@/theme";

type StatBlockProps = {
  label: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  row?: boolean;
};

export function StatBlock({ label, children, style, row }: StatBlockProps) {
  return (
    <Glass style={[styles.stat, row && styles.row, style]}>
      {label ? <Mono style={styles.lbl}>{label}</Mono> : null}
      {children}
    </Glass>
  );
}

type BigStatProps = {
  value: string | number;
  suffix?: string;
};

export function BigStat({ value, suffix }: BigStatProps) {
  return (
    <Text style={styles.big}>
      {value}
      {suffix ? <Text style={styles.small}>{suffix}</Text> : null}
    </Text>
  );
}

type BarRowProps = {
  label: string;
  ratio: number;
  value: string;
};

export function BarRow({ label, ratio, value }: BarRowProps) {
  return (
    <View style={styles.barrow}>
      <Text style={styles.barLabel} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.max(0, Math.min(100, Math.round(ratio * 100)))}%` }]} />
      </View>
      <Text style={styles.barVal}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stat: {
    paddingVertical: 15,
    paddingHorizontal: 16,
    marginBottom: 9,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  lbl: {
    marginBottom: 9,
    letterSpacing: 1.2,
  },
  big: {
    fontFamily: theme.font.sansExtra,
    fontSize: 29,
    fontWeight: theme.font.weight.extra,
    letterSpacing: -0.8,
    color: theme.color.ink,
    lineHeight: 32,
  },
  small: {
    fontSize: 13,
    fontWeight: theme.font.weight.medium,
    color: theme.color.ink40,
    letterSpacing: 0,
  },
  barrow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 9,
  },
  barLabel: {
    fontFamily: theme.font.sans,
    fontSize: 12,
    width: 96,
    color: theme.color.ink70,
  },
  track: {
    flex: 1,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.color.ink15,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    backgroundColor: theme.color.blue,
    borderRadius: 4,
  },
  barVal: {
    fontFamily: theme.font.mono,
    fontSize: 11,
    letterSpacing: 0,
    textTransform: "none",
    color: theme.color.ink40,
    width: 30,
    textAlign: "right",
  },
});
