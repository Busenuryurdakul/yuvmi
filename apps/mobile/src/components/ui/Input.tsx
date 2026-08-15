import { StyleSheet, Text, TextInput, type TextInputProps } from "react-native";
import { theme } from "@/theme";

type InputProps = TextInputProps & {
  label?: string;
};

export function Input({ label, style, ...props }: InputProps) {
  return (
    <>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={theme.color.text.tertiary}
        style={[styles.input, style]}
        {...props}
      />
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: theme.font.size.sm,
    fontWeight: theme.font.weight.medium,
    color: theme.color.text.primary,
    marginBottom: theme.space.xs,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: theme.color.line.firm,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.md,
    fontSize: theme.font.size.md,
    color: theme.color.text.primary,
    backgroundColor: theme.color.surface.raised,
    marginBottom: theme.space.md,
  },
});
