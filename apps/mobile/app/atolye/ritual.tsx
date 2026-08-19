import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SubpageScreen } from "@/components/ui/SubpageScreen";
import { Eyebrow, Glass } from "@/components/ui/Glass";
import { Button } from "@/components/ui/Button";
import { useMode } from "@/context/ModeContext";
import { loadRituals, saveRituals, type RitualDraft } from "@/lib/local";
import { alert } from "@/lib/alert";
import { theme } from "@/theme";

const BLOCKS = [
  { id: "breath", label: "Nefes" },
  { id: "candle", label: "Fener" },
  { id: "card", label: "Kart" },
  { id: "intent", label: "Niyet" },
] as const;

export default function RitualBuilderScreen() {
  const { prefs, patchPrefs } = useMode();
  const [name, setName] = useState("");
  const [seq, setSeq] = useState<string[]>([]);
  const [rituals, setRituals] = useState<RitualDraft[]>([]);

  useEffect(() => {
    void loadRituals().then(setRituals);
  }, []);

  function addBlock(label: string) {
    setSeq((prev) => [...prev, label]);
  }

  async function save() {
    if (!seq.length) {
      alert("Blok ekle", "En az bir blok seç.");
      return;
    }
    const item: RitualDraft = {
      id: `r${Date.now()}`,
      name: name.trim() || "Ritüelim",
      blocks: seq,
    };
    const next = [...rituals, item];
    setRituals(next);
    await saveRituals(next);
    await patchPrefs({ tohum: (prefs?.tohum ?? 48) + 3 });
    setName("");
    setSeq([]);
    alert("Kuruldu", `"${item.name}" Bugün → Ritüel sekmesinde. +3 tohum`);
  }

  return (
    <SubpageScreen title="Ritüel kurucusu">
      <Glass style={styles.stat}>
        <Eyebrow style={styles.lbl}>Ritüellerin</Eyebrow>
        {rituals.length === 0 ? (
          <Text style={styles.body}>Nefes, fener, kart gibi adımları sıraya koyarak kendi ritüelini kurarsın.</Text>
        ) : (
          rituals.map((r) => (
            <View key={r.id} style={styles.row}>
              <Text style={styles.title}>{r.name}</Text>
              <Text style={styles.sub}>{r.blocks.join(" → ")}</Text>
            </View>
          ))
        )}
      </Glass>

      <Glass style={styles.stat}>
        <Eyebrow style={styles.lbl}>Yeni ritüel</Eyebrow>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Adı"
          placeholderTextColor={theme.color.ink40}
        />
        <View style={styles.chips}>
          {BLOCKS.map((b) => (
            <Pressable key={b.id} style={styles.chip} onPress={() => addBlock(b.label)}>
              <Text style={styles.chipText}>+ {b.label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.sub}>{seq.length ? seq.join(" → ") : "Blok sırası burada oluşur."}</Text>
        <Button label="Ritüeli kaydet" onPress={() => void save()} style={{ marginTop: 12 }} />
      </Glass>
      <Text style={styles.note}>Ritüel bitince +3 tohum. Kaçırırsan hiçbir şey olmaz.</Text>
    </SubpageScreen>
  );
}

const styles = StyleSheet.create({
  stat: { padding: 14, marginBottom: 10 },
  lbl: { marginBottom: 8 },
  body: { fontFamily: theme.font.sans, fontSize: 13, color: theme.color.ink70, lineHeight: 18 },
  row: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(11,18,32,0.09)" },
  title: { fontFamily: theme.font.sansBold, fontWeight: theme.font.weight.bold, fontSize: 14, color: theme.color.ink },
  sub: { marginTop: 4, fontFamily: theme.font.mono, fontSize: 11, color: theme.color.ink40 },
  input: {
    borderWidth: 1,
    borderColor: theme.color.ink15,
    backgroundColor: "rgba(255,255,255,0.55)",
    borderRadius: 12,
    padding: 11,
    fontFamily: theme.font.sans,
    fontSize: 14,
    color: theme.color.ink,
    marginBottom: 10,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 10 },
  chip: {
    backgroundColor: "rgba(37,99,235,0.12)",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  chipText: { fontFamily: theme.font.sansSemibold, fontWeight: theme.font.weight.semibold, fontSize: 12, color: theme.color.blueDeep },
  note: { textAlign: "center", fontFamily: theme.font.sans, fontSize: 11.5, color: theme.color.ink40, marginTop: 8 },
});
