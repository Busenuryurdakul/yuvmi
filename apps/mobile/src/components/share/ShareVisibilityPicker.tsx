import { StyleSheet, Text, View, Pressable } from "react-native";
import type { VisibilityLevel } from "@yuvmi/shared";
import { theme } from "@/theme";

const OPTIONS: Array<{ value: VisibilityLevel; label: string; hint: string }> = [
  { value: "private", label: "Yalnızca ben", hint: "Kimseyle paylaşılmaz" },
  { value: "space_members", label: "Tüm alan üyeleri", hint: "Bu alandaki herkes görebilir" },
  { value: "specific_members", label: "Seçili üyeler", hint: "Yalnızca seçtiklerin görebilir" },
];

type ShareVisibilityPickerProps = {
  value: VisibilityLevel;
  onChange: (value: VisibilityLevel) => void;
  disabled?: boolean;
};

export function ShareVisibilityPicker({ value, onChange, disabled }: ShareVisibilityPickerProps) {
  return (
    <View style={styles.wrap}>
      {OPTIONS.map((opt) => {
        const selected = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            disabled={disabled}
            onPress={() => onChange(opt.value)}
            style={[styles.option, selected && styles.optionSelected, disabled && styles.disabled]}
          >
            <View style={[styles.radio, selected && styles.radioSelected]} />
            <View style={styles.texts}>
              <Text style={[styles.label, selected && styles.labelSelected]}>{opt.label}</Text>
              <Text style={styles.hint}>{opt.hint}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.space.sm },
  option: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.space.md,
    padding: theme.space.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.color.line.soft,
    backgroundColor: theme.color.surface.raised,
  },
  optionSelected: {
    borderColor: theme.color.brand.rose,
    backgroundColor: "rgba(196, 113, 123, 0.06)",
  },
  disabled: { opacity: 0.5 },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: theme.color.line.firm,
    marginTop: 2,
  },
  radioSelected: {
    borderColor: theme.color.brand.rose,
    backgroundColor: theme.color.brand.rose,
  },
  texts: { flex: 1 },
  label: {
    fontSize: theme.font.size.md,
    fontWeight: theme.font.weight.medium,
    color: theme.color.text.primary,
  },
  labelSelected: { color: theme.color.brand.roseText },
  hint: {
    marginTop: theme.space.xs,
    fontSize: theme.font.size.xs,
    color: theme.color.text.tertiary,
    lineHeight: 16,
  },
});
