import { Pressable, StyleSheet, View } from "react-native";
import { theme } from "@/theme";

type SwitchProps = {
  value: boolean;
  onChange?: (next: boolean) => void;
  onValueChange?: (next: boolean) => void;
  disabled?: boolean;
  trackColor?: { false?: string; true?: string };
  thumbColor?: string;
  ios_backgroundColor?: string;
};

export function Switch({ value, onChange, onValueChange, disabled }: SwitchProps) {
  const handleToggle = () => {
    if (disabled) return;
    const next = !value;
    onChange?.(next);
    onValueChange?.(next);
  };

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: Boolean(disabled) }}
      onPress={handleToggle}
      disabled={disabled}
      style={[styles.track, value && styles.trackOn]}
    >
      <View style={[styles.thumb, value && styles.thumbOn]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 42,
    height: 25,
    borderRadius: 99,
    backgroundColor: theme.color.ink15,
    justifyContent: "center",
  },
  trackOn: {
    backgroundColor: theme.color.blue,
  },
  thumb: {
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: "#fff",
    marginLeft: 3,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  thumbOn: {
    marginLeft: 20,
  },
});
