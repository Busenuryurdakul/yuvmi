import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import type { LifeDomain } from "@yuvmi/shared";
import { Screen } from "@/components/ui/Screen";
import { PageHeader } from "@/components/ui/PageHeader";
import { Stepper } from "@/components/ui/Stepper";
import { Button } from "@/components/ui/Button";
import { DomainChipGrid } from "@/components/future-self/DomainChipGrid";
import { useAuth } from "@/context/AuthContext";
import { createFutureSelf } from "@/lib/api/yuvmi";
import { theme } from "@/theme";

export default function OnboardingFutureSelfScreen() {
  const { user } = useAuth();
  const [title, setTitle] = useState("Gelecekteki Ben");
  const [description, setDescription] = useState("");
  const [domains, setDomains] = useState<LifeDomain[]>(["personal_growth"]);
  const [affirmation, setAffirmation] = useState("");
  const [loading, setLoading] = useState(false);

  function toggleDomain(domain: LifeDomain) {
    setDomains((prev) =>
      prev.includes(domain) ? prev.filter((d) => d !== domain) : [...prev, domain],
    );
  }

  async function handleContinue() {
    if (!user?.token || domains.length === 0) {
      Alert.alert("Eksik bilgi", "En az bir yaşam alanı seç.");
      return;
    }
    setLoading(true);
    try {
      await createFutureSelf(user.token, {
        title,
        description,
        domains,
        affirmations: affirmation ? [affirmation] : [],
        visionItems: domains.slice(0, 2).map((domain, i) => ({
          domain,
          title: `${title} — ${domain}`,
          sortOrder: i,
        })),
      });
      router.push("/(onboarding)/future-self-review");
    } catch (error) {
      Alert.alert("Kaydedilemedi", error instanceof Error ? error.message : "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <PageHeader title="Gelecekteki Ben" subtitle="Hayalindeki halini tanımla." />
      <Stepper current={1} total={4} label="Onboarding" />
      <Text style={styles.label}>Başlık</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} />
      <Text style={styles.label}>Gelecekteki halin nasıl biri?</Text>
      <TextInput
        style={[styles.input, styles.textarea]}
        value={description}
        onChangeText={setDescription}
        multiline
        placeholder="Kendini nasıl hissetmek istiyorsun?"
        placeholderTextColor={theme.color.text.tertiary}
      />
      <Text style={styles.label}>Hangi alanlarda büyümek istiyorsun?</Text>
      <DomainChipGrid selected={domains} onToggle={toggleDomain} />
      <Text style={[styles.label, { marginTop: theme.space.lg }]}>Bir olumlama (opsiyonel)</Text>
      <TextInput style={styles.input} value={affirmation} onChangeText={setAffirmation} />
      <Button label="Devam" loading={loading} onPress={() => void handleContinue()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: theme.font.size.sm,
    fontWeight: theme.font.weight.medium,
    color: theme.color.text.primary,
    marginBottom: theme.space.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.color.line.firm,
    borderRadius: theme.radius.md,
    padding: theme.space.md,
    fontSize: theme.font.size.md,
    color: theme.color.text.primary,
    backgroundColor: theme.color.surface.raised,
    marginBottom: theme.space.lg,
  },
  textarea: { minHeight: 96, textAlignVertical: "top" },
});
