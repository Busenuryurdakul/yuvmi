import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SubpageScreen } from "@/components/ui/SubpageScreen";
import { Eyebrow, Glass } from "@/components/ui/Glass";
import { Button } from "@/components/ui/Button";
import { loadDeck, saveDeck, type DeckCard } from "@/lib/local";
import { alert } from "@/lib/alert";
import { theme } from "@/theme";

export default function DeckScreen() {
  const [cards, setCards] = useState<DeckCard[]>([]);
  const [text, setText] = useState("");

  useEffect(() => {
    void loadDeck().then(setCards);
  }, []);

  async function add() {
    const t = text.trim();
    if (!t) return;
    const next = [...cards, { id: `c${Date.now()}`, text: t }];
    setCards(next);
    setText("");
    await saveDeck(next);
    alert("Eklendi", "Desten güncellendi.");
  }

  async function remove(id: string) {
    const next = cards.filter((c) => c.id !== id);
    setCards(next);
    await saveDeck(next);
  }

  return (
    <SubpageScreen title="Kendi desten">
      <Glass style={styles.stat}>
        <Eyebrow style={styles.lbl}>Kartların · {cards.length}</Eyebrow>
        <Text style={styles.body}>Kendine yazdığın kısa cümleler. Sabah destenden bir kart çekilir.</Text>
        {cards.map((c) => (
          <View key={c.id} style={styles.row}>
            <Text style={styles.cardText}>{c.text}</Text>
            <Pressable onPress={() => void remove(c.id)}>
              <Text style={styles.del}>Sil</Text>
            </Pressable>
          </View>
        ))}
      </Glass>
      <Glass style={styles.stat}>
        <Text style={styles.body}>Duymak istediğin, sana iyi gelecek şeyleri ekleyebilirsin.</Text>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Bir cümle yaz"
          placeholderTextColor={theme.color.ink40}
          multiline
        />
        <Button label="Karta ekle" onPress={() => void add()} />
      </Glass>
    </SubpageScreen>
  );
}

const styles = StyleSheet.create({
  stat: { padding: 14, marginBottom: 10 },
  lbl: { marginBottom: 8 },
  body: { fontFamily: theme.font.sans, fontSize: 12.5, color: theme.color.ink70, lineHeight: 18, marginBottom: 8 },
  row: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(11,18,32,0.09)",
  },
  cardText: { flex: 1, fontFamily: theme.font.sans, fontSize: 16, color: theme.color.ink, lineHeight: 22 },
  del: { fontFamily: theme.font.mono, fontSize: 11, color: theme.color.ink40 },
  input: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: theme.color.ink15,
    backgroundColor: "rgba(255,255,255,0.55)",
    borderRadius: 12,
    padding: 11,
    fontFamily: theme.font.sans,
    fontSize: 14,
    color: theme.color.ink,
    textAlignVertical: "top",
    marginBottom: 10,
  },
});
