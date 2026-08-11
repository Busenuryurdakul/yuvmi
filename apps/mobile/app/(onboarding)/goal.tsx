import { useState } from "react";
import { Alert, StyleSheet, TextInput } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { PageHeader } from "@/components/ui/PageHeader";
import { Stepper } from "@/components/ui/Stepper";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useOnboarding } from "@/context/OnboardingContext";
import { promptPremiumUpsell } from "@/hooks/usePremiumUpsell";
import { createGoal, fetchFutureSelf } from "@/lib/api/yuvmi";
import { theme } from "@/theme";

export default function OnboardingGoalScreen() {
  const { user } = useAuth();
  const { setGoalId } = useOnboarding();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    if (!user?.token || !title.trim()) {
      Alert.alert("Eksik bilgi", "Hedef başlığı gerekli.");
      return;
    }
    setLoading(true);
    try {
      const fs = await fetchFutureSelf(user.token);
      const goal = await createGoal(user.token, {
        futureSelfId: fs.id,
        title: title.trim(),
        description,
      });
      setGoalId(goal.id);
      router.push("/(onboarding)/plan");
    } catch (error) {
      if (!promptPremiumUpsell(error, { feature: "Ek hedef oluşturma" })) {
        Alert.alert("Kaydedilemedi", error instanceof Error ? error.message : "Bir hata oluştu.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <PageHeader title="Hedefin" subtitle="90 gün zorunlu değil — kendi tempon." />
      <Stepper current={3} total={4} />
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Örn. Daha disiplinli sabah rutini"
        placeholderTextColor={theme.color.text.tertiary}
      />
      <TextInput
        style={[styles.input, styles.textarea]}
        value={description}
        onChangeText={setDescription}
        multiline
        placeholder="Bu hedef sana ne ifade ediyor?"
        placeholderTextColor={theme.color.text.tertiary}
      />
      <Button label="Devam" loading={loading} onPress={() => void handleContinue()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  textarea: { minHeight: 120, textAlignVertical: "top" },
});
