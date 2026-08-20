import { useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { SubpageScreen } from "@/components/ui/SubpageScreen";
import { Eyebrow, Glass } from "@/components/ui/Glass";
import { Button } from "@/components/ui/Button";
import { alert } from "@/lib/alert";
import { theme } from "@/theme";

type RelationType = "Partner" | "Arkadaş" | "Aile";

export default function InviteScreen() {
  const [email, setEmail] = useState("");
  const [relation, setRelation] = useState<RelationType>("Partner");

  // Share Toggles
  const [shareRhythm, setShareRhythm] = useState(true);
  const [shareVision, setShareVision] = useState(true);
  const [shareMood, setShareMood] = useState(false);
  const [shareNotes, setShareNotes] = useState(false);

  const handleSendInvite = () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      alert("Hata", "Lütfen geçerli bir e-posta adresi girin.");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
      alert("Hata", "Lütfen geçerli bir e-posta formatı girin.");
      return;
    }

    alert(
      "Davet Gönderildi",
      `${trimmedEmail} adresine ortak alan daveti başarıyla iletildi.`,
      [
        {
          text: "Tamam",
          onPress: () => router.back(),
        },
      ]
    );
  };

  return (
    <SubpageScreen title="Davet gönder">
      <Text style={styles.sub}>
        Ortak alan karşılıklı onayla açılır. Neyi paylaşacağını sen seçersin.
      </Text>

      {/* E-POSTA */}
      <Text style={styles.formLabel}>E-POSTA</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="ornek@email.com"
        placeholderTextColor={theme.color.ink40}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      {/* BU KİŞİ SENİN İÇİN */}
      <Text style={styles.formLabel}>BU KİŞİ SENİN İÇİN</Text>
      <View style={styles.pills}>
        {(["Partner", "Arkadaş", "Aile"] as RelationType[]).map((rel) => {
          const isSelected = relation === rel;
          return (
            <Pressable
              key={rel}
              style={[styles.pill, isSelected && styles.pillSelected]}
              onPress={() => setRelation(rel)}
            >
              <Text style={[styles.pillText, isSelected && styles.pillTextOn]}>
                {rel}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.hint}>
        Sadece alanın adını belirler, izinleri değiştirmez.
      </Text>

      {/* BAŞLANGIÇTA PAYLAŞILACAKLAR */}
      <Glass style={styles.card}>
        <Eyebrow style={styles.lbl}>BAŞLANGIÇTA PAYLAŞILACAKLAR</Eyebrow>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Ritim şeridi</Text>
          <Switch
            value={shareRhythm}
            onValueChange={setShareRhythm}
            trackColor={{ false: "rgba(11, 18, 32, 0.12)", true: theme.color.blue }}
            thumbColor="#ffffff"
            {...{ activeThumbColor: "#ffffff" }}
            ios_backgroundColor="rgba(11, 18, 32, 0.08)"
          />
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Vizyon cümlesi</Text>
          <Switch
            value={shareVision}
            onValueChange={setShareVision}
            trackColor={{ false: "rgba(11, 18, 32, 0.12)", true: theme.color.blue }}
            thumbColor="#ffffff"
            {...{ activeThumbColor: "#ffffff" }}
            ios_backgroundColor="rgba(11, 18, 32, 0.08)"
          />
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Ruh hâli</Text>
          <Switch
            value={shareMood}
            onValueChange={setShareMood}
            trackColor={{ false: "rgba(11, 18, 32, 0.12)", true: theme.color.blue }}
            thumbColor="#ffffff"
            {...{ activeThumbColor: "#ffffff" }}
            ios_backgroundColor="rgba(11, 18, 32, 0.08)"
          />
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Notlar ve günlük</Text>
          <Switch
            value={shareNotes}
            onValueChange={setShareNotes}
            trackColor={{ false: "rgba(11, 18, 32, 0.12)", true: theme.color.blue }}
            thumbColor="#ffffff"
            {...{ activeThumbColor: "#ffffff" }}
            ios_backgroundColor="rgba(11, 18, 32, 0.08)"
          />
        </View>
      </Glass>

      <Button
        label="Daveti gönder"
        onPress={handleSendInvite}
        style={{ marginTop: 24 }}
      />

      <Text style={styles.bottomNote}>
        İzinleri her zaman geri çekebilirsin.
      </Text>
    </SubpageScreen>
  );
}

const styles = StyleSheet.create({
  sub: {
    fontFamily: theme.font.sans,
    fontSize: 13,
    color: theme.color.ink70,
    lineHeight: 19,
    marginBottom: 14,
  },
  formLabel: {
    fontFamily: theme.font.mono,
    fontSize: 10.5,
    color: theme.color.ink50,
    letterSpacing: 0.6,
    marginTop: 14,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.color.ink15,
    backgroundColor: "rgba(255,255,255,0.55)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: theme.font.sans,
    fontSize: 14,
    color: theme.color.ink,
    marginBottom: 4,
  },
  pills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginVertical: 4,
  },
  pill: {
    borderWidth: 1,
    borderColor: theme.color.ink15,
    backgroundColor: "rgba(255,255,255,0.5)",
    borderRadius: 11,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  pillSelected: {
    backgroundColor: theme.color.blue,
    borderColor: theme.color.blue,
  },
  pillText: {
    fontFamily: theme.font.sansSemibold,
    fontSize: 12.5,
    color: theme.color.ink70,
  },
  pillTextOn: {
    color: "#fff",
  },
  hint: {
    marginTop: 6,
    fontFamily: theme.font.sans,
    fontSize: 11,
    color: theme.color.ink40,
    lineHeight: 16,
  },
  card: {
    padding: 16,
    marginTop: 18,
  },
  lbl: {
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(11,18,32,0.06)",
  },
  rowLabel: {
    fontFamily: theme.font.sansSemibold,
    fontSize: 14,
    color: theme.color.ink,
  },
  bottomNote: {
    fontFamily: theme.font.sans,
    fontSize: 11.5,
    color: theme.color.ink40,
    textAlign: "center",
    marginTop: 14,
    marginBottom: 20,
  },
});
