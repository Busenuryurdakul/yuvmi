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

type ButtonVariant = "primary" | "secondary" | "ghost" | "apple" | "google" | "onInk" | "outlineInk";

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
  const spinnerOnLight = variant === "secondary" || variant === "ghost" || variant === "google";

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
        <ActivityIndicator color={spinnerOnLight ? theme.color.blueDeep : theme.color.onInk} />
      ) : (
        <Text style={[styles.label, styles[`${variant}Label` as const]]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: 14,
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
    fontFamily: theme.font.sansSemibold,
    fontSize: 14.5,
    fontWeight: theme.font.weight.semibold,
  },
  primary: {
    backgroundColor: theme.color.blue,
    ...theme.shadow.blue,
  },
  primaryLabel: {
    color: "#fff",
  },
  secondary: {
    backgroundColor: "rgba(255,255,255,0.45)",
    borderWidth: 1,
    borderColor: theme.color.blue,
  },
  secondaryLabel: {
    color: theme.color.blueDeep,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  ghostLabel: {
    color: theme.color.danger,
    fontFamily: theme.font.sansSemibold,
  },
  apple: {
    backgroundColor: theme.color.ink,
  },
  appleLabel: {
    color: theme.color.onInk,
  },
  google: {
    backgroundColor: "rgba(255,255,255,0.55)",
    borderWidth: 1,
    borderColor: theme.color.edge,
  },
  googleLabel: {
    color: theme.color.ink,
  },
  onInk: {
    backgroundColor: theme.color.blue,
    ...theme.shadow.blue,
  },
  onInkLabel: {
    color: "#fff",
  },
  outlineInk: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  outlineInkLabel: {
    color: theme.color.onInk,
  },
});
