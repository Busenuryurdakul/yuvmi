import { StyleSheet, Text, TextInput, type TextInputProps } from "react-native";
import { theme } from "@/theme";

type InputProps = TextInputProps & {
  label?: string;
  tone?: "paper" | "ink";
};

export function Input({ label, style, tone = "paper", ...props }: InputProps) {
  const ink = tone === "ink";
  return (
    <>
      {label ? <Text style={[styles.label, ink && styles.labelInk]}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={ink ? theme.color.onInkMuted : theme.color.ink40}
        style={[styles.input, ink && styles.inputInk, style]}
        {...props}
      />
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: theme.font.sansMedium,
    fontSize: theme.font.size.sm,
    fontWeight: theme.font.weight.medium,
    color: theme.color.ink,
    marginBottom: theme.space.xs,
  },
  labelInk: {
    color: theme.color.onInkMuted,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "rgba(11,18,32,0.16)",
    borderRadius: 13,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.md,
    fontSize: theme.font.size.md,
    fontFamily: theme.font.sans,
    color: theme.color.ink,
    backgroundColor: "rgba(255,255,255,0.55)",
    marginBottom: theme.space.md,
  },
  inputInk: {
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "rgba(255,255,255,0.08)",
    color: theme.color.onInk,
  },
});
