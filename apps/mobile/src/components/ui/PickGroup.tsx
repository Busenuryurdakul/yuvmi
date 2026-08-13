import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "@/theme";

type PickGroupProps = {
  options: string[];
  value: string;
  onChange: (value: string) => void;
};

export function PickGroup({ options, value, onChange }: PickGroupProps) {
  return (
    <View style={styles.row}>
      {options.map((opt) => {
        const on = opt === value;
        return (
          <Pressable key={opt} onPress={() => onChange(opt)} style={[styles.pk, on && styles.on]}>
            <Text style={[styles.label, on && styles.labelOn]}>{opt}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  pk: {
    borderWidth: 1,
    borderColor: theme.color.ink15,
    backgroundColor: "rgba(255,255,255,0.5)",
    borderRadius: 11,
    paddingVertical: 9,
    paddingHorizontal: 13,
  },
  on: {
    backgroundColor: theme.color.blue,
    borderColor: theme.color.blue,
  },
  label: {
    fontFamily: theme.font.sans,
    fontSize: 12.5,
    color: theme.color.ink70,
  },
  labelOn: {
    color: "#fff",
  },
});
