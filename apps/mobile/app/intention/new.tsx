import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SubpageScreen } from "@/components/ui/SubpageScreen";
import { Field } from "@/components/ui/Field";
import { PickGroup } from "@/components/ui/PickGroup";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { fetchActivePlan, revisePlan } from "@/lib/api/yuvmi";
import type { PlanResponse } from "@/lib/api/types";
import { LIFE_DOMAINS } from "@yuvmi/shared";
import { theme } from "@/theme";

const FREQS = ["Her gün", "Hafta içi", "Haftada 3", "Haftada 1"];
const DOMAINS = Object.values(LIFE_DOMAINS).map((d) => d.label.tr);

function parseDesc(description: string) {
  const parts = description.split(" · ").map((s) => s.trim());
  const minPart = parts.find((p) => p.toLocaleLowerCase("tr").includes("en küçük"));
  const freq = parts.find((p) => FREQS.some((f) => p.toLocaleLowerCase("tr").includes(f.toLocaleLowerCase("tr"))));
  const anchor = parts.find((p) => p !== minPart && p !== freq) ?? parts[0] ?? "";
  const min = minPart ? minPart.replace(/en küçük hâli:\s*/i, "") : "";
  return { anchor, freq: freq ?? "Her gün", min };
}

export default function NewIntentionScreen() {
  const { stepId } = useLocalSearchParams<{ stepId?: string }>();
  const { user } = useAuth();
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [title, setTitle] = useState("");
  const [anchor, setAnchor] = useState("");
  const [min, setMin] = useState("");
  const [freq, setFreq] = useState("Her gün");
  const [domain, setDomain] = useState(DOMAINS[0] ?? "Kariyer");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.token) return;
    void fetchActivePlan(user.token).then((p) => {
      setPlan(p);
      if (stepId) {
        const step = p.steps.find((s) => s.id === stepId);
        if (step) {
          setTitle(step.title);
          const parsed = parseDesc(step.description);
          setAnchor(parsed.anchor);
          setMin(parsed.min);
          setFreq(parsed.freq);
        }
      }
    }).catch(() => setPlan(null));
  }, [user?.token, stepId]);

  async function save() {
    if (!user?.token) return;
    if (!title.trim()) {
      Alert.alert("Eksik", "Ne yapacağını yaz.");
      return;
    }
    const description = [anchor.trim(), freq, min.trim() ? `en küçük hâli: ${min.trim()}` : ""]
      .filter(Boolean)
      .join(" · ");
    setSaving(true);
    try {
      if (plan) {
        const steps = plan.steps.map((s, i) => ({
          dayOffset: s.dayOffset,
          title: s.id === stepId ? title.trim() : s.title,
          description: s.id === stepId ? description : s.description,
          sortOrder: i,
        }));
        if (!stepId) {
          steps.push({
            dayOffset: steps.length,
            title: title.trim(),
            description,
            sortOrder: steps.length,
          });
        }
        await revisePlan(user.token, { basePlanId: plan.id, steps, activate: true });
      }
      router.back();
    } catch (e) {
      Alert.alert("Kaydedilemedi", e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SubpageScreen title={stepId ? "Niyeti düzenle" : "Niyet ekle"}>
      <Text style={styles.sub}>Şablon seçmiyorsun — kendi cümleni kuruyorsun.</Text>
      <Field label="Ne yapacaksın" help="Şimdiki zamanda, kendi ağzından yaz.">
        <Input
          value={title}
          onChangeText={setTitle}
          placeholder="Sabah 10 dakika günlüğe yazıyorum"
          style={styles.input}
        />
      </Field>
      <Field label="Neye bağlı" help="Saate değil, zaten yaptığın bir ana bağla.">
        <Input
          value={anchor}
          onChangeText={setAnchor}
          placeholder="Kahveyi koyduktan sonra"
          style={styles.input}
        />
      </Field>
      <Field label="En küçük hâli" help="Kötü bir günde bile yapabileceğin en ufak versiyon.">
        <Input value={min} onChangeText={setMin} placeholder="Üç cümle yazmak" style={styles.input} />
      </Field>
      <Field label="Sıklık">
        <PickGroup options={FREQS} value={freq} onChange={setFreq} />
      </Field>
      <Field label="Hangi yaşam alanı">
        <PickGroup options={DOMAINS} value={domain} onChange={setDomain} />
      </Field>
      <Button label="Niyeti kaydet" loading={saving} onPress={() => void save()} />
      <Text style={styles.note}>Niyetler istediğin zaman değişir. Plan v2 olur, geçmişin silinmez.</Text>
    </SubpageScreen>
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
  note: {
    marginTop: 14,
    fontFamily: theme.font.sans,
    fontSize: 11.5,
    color: theme.color.ink40,
    textAlign: "center",
    lineHeight: 18,
  },
});
