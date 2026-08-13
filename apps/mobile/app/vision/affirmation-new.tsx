import { useState } from "react";
import { StyleSheet, Text, TextInput } from "react-native";
import { router } from "expo-router";
import { SubpageScreen } from "@/components/ui/SubpageScreen";
import { Glass } from "@/components/ui/Glass";
import { Field } from "@/components/ui/Field";
import { PickGroup } from "@/components/ui/PickGroup";
import { Button } from "@/components/ui/Button";
import { loadExtraAffirmations, saveExtraAffirmations } from "@/lib/local";
import { LIFE_DOMAINS } from "@yuvmi/shared";
import { theme } from "@/theme";

const BELONGS = ["Genel", ...Object.values(LIFE_DOMAINS).map((d) => d.label.tr)];

export default function NewAffirmationScreen() {
  const [text, setText] = useState("");
  const [who, setWho] = useState("Genel");
  const [saving, setSaving] = useState(false);

  async function save() {
    const t = text.trim();
    if (!t) return;
    setSaving(true);
    const extra = await loadExtraAffirmations();
    extra.unshift({ text: t, who: who === "Genel" ? "Senin olumlaman" : who });
    await saveExtraAffirmations(extra);
    setSaving(false);
    router.back();
  }

  return (
    <SubpageScreen title="Olumlama yaz">
      <Text style={styles.sub}>Kendi cümlen, kendi sesin. Kısa ve şimdiki zamanda en iyi çalışır.</Text>
      <Glass style={styles.stat}>
        <TextInput
          style={styles.area}
          multiline
          value={text}
          onChangeText={setText}
          placeholder="Ben..."
          placeholderTextColor={theme.color.ink40}
        />
      </Glass>
      <Field label="Nereye ait">
        <PickGroup options={BELONGS} value={who} onChange={setWho} />
      </Field>
      <Button label="Olumlamayı ekle" loading={saving} onPress={() => void save()} />
    </SubpageScreen>
  );
}

const styles = StyleSheet.create({
  sub: {
    fontFamily: theme.font.sans,
    fontSize: 14,
    color: theme.color.ink70,
    lineHeight: 21,
    marginBottom: 14,
  },
  stat: {
    padding: 16,
    marginBottom: 12,
  },
  area: {
    minHeight: 100,
    fontFamily: theme.font.sans,
    fontSize: 16,
    color: theme.color.ink,
    textAlignVertical: "top",
  },
});
