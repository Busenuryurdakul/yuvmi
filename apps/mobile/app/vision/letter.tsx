import { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput } from "react-native";
import { router } from "expo-router";
import { SubpageScreen } from "@/components/ui/SubpageScreen";
import { Glass } from "@/components/ui/Glass";
import { Field } from "@/components/ui/Field";
import { PickGroup } from "@/components/ui/PickGroup";
import { Button } from "@/components/ui/Button";
import { loadLetter, saveLetter } from "@/lib/local";
import { theme } from "@/theme";

const OPENS: Record<string, "3m" | "6m" | "1y"> = {
  "3 ay sonra": "3m",
  "6 ay sonra": "6m",
  "1 yıl sonra": "1y",
};

export default function LetterScreen() {
  const [body, setBody] = useState("");
  const [openIn, setOpenIn] = useState("1 yıl sonra");
  const [sealed, setSealed] = useState(false);

  useEffect(() => {
    void loadLetter().then((letter) => {
      if (!letter) return;
      setBody(letter.body);
      setOpenIn(letter.openIn === "3m" ? "3 ay sonra" : letter.openIn === "6m" ? "6 ay sonra" : "1 yıl sonra");
      setSealed(Boolean(letter.sealedAt));
    });
  }, []);

  async function seal() {
    await saveLetter({
      body,
      openIn: OPENS[openIn] ?? "1y",
      sealedAt: new Date().toISOString(),
    });
    setSealed(true);
    router.back();
  }

  return (
    <SubpageScreen title="Gelecekteki Ben'e mektup">
      <Text style={styles.sub}>Bugünkü hâlinden geleceğe yaz. Seçtiğin tarihte sana geri açılır.</Text>
      <Glass style={styles.stat}>
        <TextInput
          style={styles.area}
          multiline
          editable={!sealed}
          value={body}
          onChangeText={setBody}
          placeholder={"Sevgili ben,\n\nBunu yazarken..."}
          placeholderTextColor={theme.color.ink40}
        />
      </Glass>
      <Field label="Ne zaman açılsın">
        <PickGroup options={["3 ay sonra", "6 ay sonra", "1 yıl sonra"]} value={openIn} onChange={setOpenIn} />
      </Field>
      <Button label={sealed ? "Mühürlendi" : "Mektubu mühürle"} disabled={sealed} onPress={() => void seal()} />
      <Text style={styles.note}>Mühürlenen mektup tarihi gelene kadar açılmaz.</Text>
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
    minHeight: 220,
    fontFamily: theme.font.sans,
    fontSize: 15,
    color: theme.color.ink,
    textAlignVertical: "top",
    lineHeight: 22,
  },
  note: {
    marginTop: 14,
    fontFamily: theme.font.sans,
    fontSize: 11.5,
    color: theme.color.ink40,
    textAlign: "center",
  },
});
