import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "@/theme";

type FieldProps = {
  label: string;
  help?: string;
  children: ReactNode;
};

export function Field({ label, help, children }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {help ? <Text style={styles.help}>{help}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: 14,
  },
  label: {
    fontFamily: theme.font.mono,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: theme.color.ink40,
    marginBottom: 6,
  },
  help: {
    fontFamily: theme.font.sans,
    fontSize: 11.5,
    color: theme.color.ink40,
    marginTop: 5,
    lineHeight: 16,
  },
});
