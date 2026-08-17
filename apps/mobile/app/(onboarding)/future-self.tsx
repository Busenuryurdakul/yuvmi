import { useCallback, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { LIFE_DOMAINS, type LifeDomain } from "@yuvmi/shared";
import { Screen } from "@/components/ui/Screen";
import { PageHeader } from "@/components/ui/PageHeader";
import { Stepper } from "@/components/ui/Stepper";
import { alert } from "@/lib/alert";
import { Button } from "@/components/ui/Button";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { DomainChipGrid } from "@/components/future-self/DomainChipGrid";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api/client";
import { createFutureSelf, fetchFutureSelf, updateFutureSelf } from "@/lib/api/yuvmi";
import { theme } from "@/theme";

export default function OnboardingFutureSelfScreen() {
  const { user } = useAuth();
  const [title, setTitle] = useState("Gelecekteki Ben");
  const [description, setDescription] = useState("");
  const [domains, setDomains] = useState<string[]>(["personal_growth"]);
  const [affirmation, setAffirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [hasExistingProfile, setHasExistingProfile] = useState(false);
  const [profileApproved, setProfileApproved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!user?.token) {
      setInitializing(false);
      return;
    }
    setInitializing(true);
    setError(null);
    try {
      const profile = await fetchFutureSelf();
      setHasExistingProfile(true);
      setProfileApproved(profile.status === "approved");
      setTitle(profile.title || "Gelecekteki Ben");
      setDescription(profile.description || "");
      setDomains(profile.domains.length > 0 ? profile.domains : ["personal_growth"]);
      setAffirmation(profile.affirmations?.[0] ?? "");
    } catch {
      setHasExistingProfile(false);
      setProfileApproved(false);
    } finally {
      setInitializing(false);
    }
  }, [user?.token]);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile]),
  );

  function toggleDomain(domain: string) {
    setError(null);
    setDomains((prev) =>
      prev.includes(domain) ? prev.filter((d) => d !== domain) : [...prev, domain],
    );
  }

  function addCustom(label: string) {
    setError(null);
    setDomains((prev) => (prev.includes(label) ? prev : [...prev, label]));
  }

  function buildPayload() {
    return {
      title,
      description,
      domains,
      affirmations: affirmation ? [affirmation] : [],
      visionItems: domains.slice(0, 2).map((domain, i) => ({
        domain,
        title: `${title} — ${LIFE_DOMAINS[domain as LifeDomain]?.label.tr ?? domain}`,
        sortOrder: i,
      })),
    };
  }

  async function saveProfile() {
    if (profileApproved) return;
    const payload = buildPayload();
    if (hasExistingProfile) {
      await updateFutureSelf(payload);
      return;
    }
    try {
      await createFutureSelf(payload);
      setHasExistingProfile(true);
    } catch (err) {
      if (err instanceof ApiError && err.code === 409) {
        await updateFutureSelf(payload);
        setHasExistingProfile(true);
        return;
      }
      if (err instanceof ApiError && err.code === 403) {
        setProfileApproved(true);
        return;
      }
      throw err;
    }
  }

  async function handleContinue() {
    if (!user?.token || domains.length === 0) {
      const message = "En az bir yaşam alanı seç.";
      setError(message);
      alert("Eksik bilgi", message);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      if (profileApproved) {
        router.replace("/(onboarding)/goal");
        return;
      }
      await saveProfile();
      router.replace("/(onboarding)/future-self-review");
    } catch (err) {
      if (err instanceof ApiError && err.code === 403) {
        router.replace("/(onboarding)/goal");
        return;
      }
      const message = err instanceof Error ? err.message : "Bir hata oluştu.";
      setError(message);
      alert("Kaydedilemedi", message);
    } finally {
      setLoading(false);
    }
  }

  if (initializing) return <LoadingScreen />;

  return (
    <Screen>
      <PageHeader title="Gelecekteki Ben" subtitle="Hayalindeki halini tanımla." />
      <Stepper current={1} total={4} label="Kurulum" compact />
      {profileApproved ? (
        <Text style={styles.approvedNote}>
          Profilin onaylandı — düzenleme bu adımda kapalı. Devam ile hedef adımına geçebilirsin.
        </Text>
      ) : null}
      <Text style={styles.label}>Başlık</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={(v) => {
          setError(null);
          setTitle(v);
        }}
      />
      <Text style={styles.label}>Gelecekteki halin nasıl biri?</Text>
      <TextInput
        style={[styles.input, styles.textarea]}
        value={description}
        onChangeText={(v) => {
          setError(null);
          setDescription(v);
        }}
        multiline
        placeholder="Kendini nasıl hissetmek istiyorsun?"
        placeholderTextColor={theme.color.text.tertiary}
      />
      <Text style={styles.label}>Hangi alanlarda büyümek istiyorsun?</Text>
      <DomainChipGrid selected={domains} onToggle={toggleDomain} onAddCustom={addCustom} />
      <Text style={[styles.label, { marginTop: theme.space.lg }]}>Bir olumlama (opsiyonel)</Text>
      <TextInput
        style={styles.input}
        value={affirmation}
        onChangeText={(v) => {
          setError(null);
          setAffirmation(v);
        }}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        label={profileApproved ? "Hedefe devam et" : "Devam"}
        loading={loading}
        onPress={() => void handleContinue()}
      />
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
  approvedNote: {
    fontSize: theme.font.size.sm,
    color: theme.color.text.secondary,
    backgroundColor: theme.color.surface.sunken,
    padding: theme.space.md,
    borderRadius: theme.radius.md,
    marginBottom: theme.space.lg,
    lineHeight: 20,
  },
  error: {
    color: theme.color.danger,
    fontSize: theme.font.size.sm,
    marginBottom: theme.space.md,
    lineHeight: 20,
  },
});
