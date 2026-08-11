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
              {LIFE_DOMAINS[domain].emoji} {LIFE_DOMAINS[domain].label.tr}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: theme.space.sm },
  chip: {
    borderWidth: 1,
    borderColor: theme.color.line.soft,
    backgroundColor: theme.color.surface.raised,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.sm,
  },
  chipActive: {
    borderColor: theme.color.brand.rose,
    backgroundColor: theme.color.surface.sunken,
  },
  chipText: { fontSize: theme.font.size.sm, color: theme.color.text.primary },
  chipTextActive: { color: theme.color.brand.roseText, fontWeight: theme.font.weight.medium },
});
