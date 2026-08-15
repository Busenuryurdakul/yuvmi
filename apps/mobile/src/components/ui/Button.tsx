import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { theme } from "@/theme";

type ButtonVariant = "primary" | "secondary" | "ghost" | "apple" | "google";

type ButtonProps = Omit<PressableProps, "style"> & {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  variant = "primary",
  loading = false,
  fullWidth = true,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        fullWidth && styles.fullWidth,
        styles[variant],
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === "secondary" || variant === "ghost" ? theme.color.brand.rose : "#fff"} />
      ) : (
        <Text style={[styles.label, styles[`${variant}Label` as const]]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.space.xl,
  },
  fullWidth: {
    alignSelf: "stretch",
  },
  pressed: {
    opacity: 0.88,
  },
  disabled: {
    opacity: 0.55,
  },
  label: {
    fontSize: theme.font.size.md,
    fontWeight: theme.font.weight.semibold,
  },
  primary: {
    backgroundColor: theme.color.brand.roseBtn,
  },
  primaryLabel: {
    color: "#fff",
  },
  secondary: {
    backgroundColor: theme.color.surface.raised,
    borderWidth: 1,
    borderColor: theme.color.line.firm,
  },
  secondaryLabel: {
    color: theme.color.text.primary,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  ghostLabel: {
    color: theme.color.brand.roseText,
  },
  apple: {
    backgroundColor: "#111111",
  },
  appleLabel: {
    color: "#fff",
  },
  google: {
    backgroundColor: theme.color.surface.raised,
    borderWidth: 1,
    borderColor: theme.color.line.firm,
  },
  googleLabel: {
    color: theme.color.text.primary,
  },
});
