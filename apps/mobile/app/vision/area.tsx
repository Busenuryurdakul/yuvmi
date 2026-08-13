import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TextInput } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SubpageScreen } from "@/components/ui/SubpageScreen";
import { Glass } from "@/components/ui/Glass";
import { Button } from "@/components/ui/Button";
import { LIFE_DOMAINS, type LifeDomain } from "@yuvmi/shared";
import { loadAreaNote, saveAreaNote } from "@/lib/local";
import { theme } from "@/theme";

export default function AreaNoteScreen() {
  const { domain } = useLocalSearchParams<{ domain: string }>();
  const key = (domain ?? "career") as LifeDomain;
  const title = LIFE_DOMAINS[key]?.label.tr ?? domain ?? "Alan";
  const [now, setNow] = useState("");
  const [want, setWant] = useState("");
  const [savedAt, setSavedAt] = useState<string | undefined>();

  useEffect(() => {
    void loadAreaNote(key).then((n) => {
      setNow(n.now);
      setWant(n.want);
      setSavedAt(n.savedAt);
    });
  }, [key]);

  async function save() {
    const stamp = new Date().toISOString();
    await saveAreaNote(key, { now, want, savedAt: stamp });
    setSavedAt(stamp);
    Alert.alert("Kaydedildi", "Bu alandaki notların yalnızca sana görünür.");
    router.back();
  }

  return (
    <SubpageScreen title={title}>
      <Text style={styles.sub}>Bu alanda kendine ne söylüyorsun? Notların yalnızca sana görünür.</Text>
      <Glass style={styles.stat}>
        <Text style={styles.lbl}>ŞU ANKİ HÂLİM</Text>
        <TextInput
          style={styles.area}
          multiline
          value={now}
          onChangeText={setNow}
          placeholder="Bugün bu alan senin için ne durumda?"
          placeholderTextColor={theme.color.ink40}
        />
      </Glass>
      <Glass style={styles.stat}>
        <Text style={styles.lbl}>ULAŞMAK İSTEDİĞİM</Text>
        <TextInput
          style={styles.area}
          multiline
          value={want}
          onChangeText={setWant}
          placeholder="Bir yıl sonra burada ne görmek istiyorsun?"
          placeholderTextColor={theme.color.ink40}
        />
      </Glass>
      {savedAt ? (
        <Glass style={styles.stat}>
          <Text style={styles.lbl}>ÖNCEKİ NOTLARIN</Text>
          <Text style={styles.prev}>{new Date(savedAt).toLocaleDateString("tr-TR")}</Text>
        </Glass>
      ) : null}
      <Button label="Kaydet" style={{ marginTop: 14 }} onPress={() => void save()} />
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
    marginBottom: 9,
  },
  lbl: {
    fontFamily: theme.font.mono,
    fontSize: 10,
    letterSpacing: 1,
    color: theme.color.ink40,
    marginBottom: 8,
  },
  area: {
    minHeight: 96,
    fontFamily: theme.font.sans,
    fontSize: 14,
    color: theme.color.ink,
    textAlignVertical: "top",
  },
  prev: {
    fontFamily: theme.font.sansSemibold,
    fontSize: 14,
    color: theme.color.ink,
    paddingVertical: 8,
  },
});
