import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SubpageScreen } from "@/components/ui/SubpageScreen";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { PickGroup } from "@/components/ui/PickGroup";
import { Button } from "@/components/ui/Button";
import { Glass, Eyebrow } from "@/components/ui/Glass";
import { Switch } from "@/components/ui/Switch";
import { useAuth } from "@/context/AuthContext";
import { createSpace, createSpaceInvite } from "@/lib/api/yuvmi";
import type { SpaceType } from "@yuvmi/shared";
import { theme } from "@/theme";

const ROLE_TO_TYPE: Record<string, SpaceType> = {
  Partner: "couple",
  Arkadaş: "friends",
  Aile: "family",
};

export default function SpaceInviteScreen() {
  const { spaceId } = useLocalSearchParams<{ spaceId?: string }>();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Partner");
  const [shareRhythm, setShareRhythm] = useState(true);
  const [shareVision, setShareVision] = useState(true);
  const [shareMood, setShareMood] = useState(false);
  const [shareNotes, setShareNotes] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!user?.token) return;
    const trimmed = email.trim();
    if (!trimmed.includes("@")) {
      Alert.alert("Eksik bilgi", "Geçerli bir e-posta adresi gir.");
      return;
    }
    setLoading(true);
    try {
      let id = spaceId;
      if (!id) {
        const space = await createSpace(user.token, { type: ROLE_TO_TYPE[role] ?? "couple" });
        id = space.id;
      }
      await createSpaceInvite(user.token, id, trimmed);
      Alert.alert("Davet gönderildi", "Karşı taraf onayladığında alan aktif olur.", [
        { text: "Tamam", onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert("Hata", e instanceof Error ? e.message : "Davet gönderilemedi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SubpageScreen title="Davet gönder">
      <Text style={styles.sub}>Ortak alan karşılıklı onayla açılır. Neyi paylaşacağını sen seçersin.</Text>
      <Field label="E-posta">
        <Input
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="ornek@email.com"
          style={styles.input}
        />
      </Field>
      <Field label="Bu kişi senin için" help="Sadece alanın adını belirler, izinleri değiştirmez.">
        <PickGroup options={["Partner", "Arkadaş", "Aile"]} value={role} onChange={setRole} />
      </Field>
      <Glass style={styles.stat}>
        <Eyebrow style={styles.lbl}>Başlangıçta paylaşılacaklar</Eyebrow>
        <Row label="Ritim şeridi" value={shareRhythm} onChange={setShareRhythm} />
        <Row label="Vizyon cümlesi" value={shareVision} onChange={setShareVision} />
        <Row label="Ruh hâli" value={shareMood} onChange={setShareMood} />
        <Row label="Notlar ve günlük" value={shareNotes} onChange={setShareNotes} last />
      </Glass>
      <Button label="Daveti gönder" loading={loading} onPress={() => void handleSend()} />
      <Text style={styles.note}>İzinleri her zaman geri çekebilirsin.</Text>
    </SubpageScreen>
  );
}

function Row({
  label,
  value,
  onChange,
  last,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  last?: boolean;
}) {
  return (
    <View style={[styles.kv, last && styles.kvLast]}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: "rgba(11, 18, 32, 0.12)", true: theme.color.blue }}
        thumbColor="#ffffff"
        ios_backgroundColor="rgba(11, 18, 32, 0.08)"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sub: {
    fontFamily: theme.font.sans,
    fontSize: 14,
    color: theme.color.ink70,
    lineHeight: 21,
    marginBottom: 18,
  },
  input: {
    marginBottom: 0,
  },
  stat: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginVertical: 6,
    marginBottom: 14,
  },
  lbl: {
    marginBottom: 4,
  },
  kv: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(11,18,32,0.09)",
  },
  kvLast: {
    borderBottomWidth: 0,
  },
  kvLabel: {
    fontFamily: theme.font.sansSemibold,
    fontSize: 14,
    fontWeight: theme.font.weight.semibold,
    color: theme.color.ink,
  },
  note: {
    marginTop: 14,
    fontFamily: theme.font.sans,
    fontSize: 11.5,
    color: theme.color.ink40,
    textAlign: "center",
  },
});
