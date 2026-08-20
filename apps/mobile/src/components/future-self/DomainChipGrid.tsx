import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { LIFE_DOMAINS, LIFE_DOMAIN_ORDER, type LifeDomain } from "@yuvmi/shared";
import { theme } from "@/theme";

const PICKER_DOMAINS = LIFE_DOMAIN_ORDER.filter((d) => d !== "freedom");

export function domainDisplayLabel(key: string): string {
  return LIFE_DOMAINS[key as LifeDomain]?.label.tr ?? key;
}

type DomainChipGridProps = {
  selected: string[];
  onToggle: (domain: string) => void;
  onAddCustom?: (label: string) => void;
  allowCustom?: boolean;
};

export function DomainChipGrid({
  selected,
  onToggle,
  onAddCustom,
  allowCustom = true,
}: DomainChipGridProps) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const predefined = new Set<string>(PICKER_DOMAINS);
  const customs = selected.filter((d) => !predefined.has(d) && d !== "freedom");

  function commitCustom() {
    const label = draft.trim().replace(/\s+/g, " ");
    if (!label) {
      setAdding(false);
      setDraft("");
      return;
    }
    const exists = selected.some((d) => domainDisplayLabel(d).toLocaleLowerCase("tr") === label.toLocaleLowerCase("tr"));
    if (!exists) onAddCustom?.(label);
    setDraft("");
    setAdding(false);
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.grid}>
        {PICKER_DOMAINS.map((domain) => {
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
        {customs.map((domain) => (
          <Pressable
            key={domain}
            onPress={() => onToggle(domain)}
            style={[styles.chip, styles.chipActive]}
          >
            <Text style={[styles.chipText, styles.chipTextActive]}>{domain}</Text>
          </Pressable>
        ))}
        {allowCustom && !adding ? (
          <Pressable onPress={() => setAdding(true)} style={styles.chipAdd}>
            <Text style={styles.chipAddText}>+ Kendi alanım</Text>
          </Pressable>
        ) : null}
      </View>

      {allowCustom && adding ? (
        <View style={styles.addRow}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Örn. Spor, Dil, Aile…"
            placeholderTextColor={theme.color.ink40}
            autoFocus
            maxLength={32}
            onSubmitEditing={commitCustom}
            returnKeyType="done"
          />
          <Pressable onPress={commitCustom} style={styles.addBtn}>
            <Text style={styles.addBtnText}>Ekle</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setAdding(false);
              setDraft("");
            }}
            style={styles.cancelBtn}
          >
            <Text style={styles.cancelText}>Vazgeç</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
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
  chipAdd: {
    backgroundColor: "rgba(11,18,32,0.06)",
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: theme.color.blueLight,
  },
  chipAddText: {
    fontFamily: theme.font.sansSemibold,
    fontSize: 12.5,
    fontWeight: theme.font.weight.semibold,
    color: theme.color.blueDeep,
  },
  addRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.color.ink15,
    backgroundColor: "rgba(255,255,255,0.65)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: theme.font.sans,
    fontSize: 14,
    color: theme.color.ink,
  },
  addBtn: {
    backgroundColor: theme.color.blue,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  addBtnText: {
    color: "#fff",
    fontFamily: theme.font.sansSemibold,
    fontWeight: theme.font.weight.semibold,
    fontSize: 13,
  },
  cancelBtn: { paddingHorizontal: 6, paddingVertical: 10 },
  cancelText: { fontFamily: theme.font.sans, fontSize: 13, color: theme.color.ink40 },
});
