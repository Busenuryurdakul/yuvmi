import { Pressable, StyleSheet, Text, View } from "react-native";
import { LIFE_DOMAINS, type LifeDomain } from "@yuvmi/shared";
import { theme } from "@/theme";

const ALL_DOMAINS = Object.keys(LIFE_DOMAINS) as LifeDomain[];

type DomainChipGridProps = {
  selected: LifeDomain[];
  onToggle: (domain: LifeDomain) => void;
};

export function DomainChipGrid({ selected, onToggle }: DomainChipGridProps) {
  return (
    <View style={styles.grid}>
      {ALL_DOMAINS.map((domain) => {
        const active = selected.includes(domain);
        return (
          <Pressable
            key={domain}
            onPress={() => onToggle(domain)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {LIFE_DOMAINS[domain].label.tr}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: {
    backgroundColor: "rgba(255,255,255,0.4)",
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "rgba(11,18,32,0.12)",
  },
  chipActive: {
    backgroundColor: "rgba(37,99,235,0.14)",
    borderColor: "transparent",
  },
  chipText: {
    fontFamily: theme.font.sansMedium,
    fontSize: 12.5,
    color: theme.color.ink70,
  },
  chipTextActive: {
    color: theme.color.blueDeep,
    fontWeight: theme.font.weight.medium,
  },
});
