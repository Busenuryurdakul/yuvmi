import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { type LifeDomain } from "@yuvmi/shared";
import { Screen } from "@/components/ui/Screen";
import { PageHeader } from "@/components/ui/PageHeader";
import { Stepper } from "@/components/ui/Stepper";
import { Button } from "@/components/ui/Button";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { FutureSelfExpandableCard } from "@/components/future-self/FutureSelfExpandableCard";
import {
  GoalDeadlineField,
  parseDurationToTargetDate,
  resolveGoalTargetDate,
} from "@/components/goal/GoalDeadlineField";
import { useAuth } from "@/context/AuthContext";
import { useOnboarding } from "@/context/OnboardingContext";
import { promptPremiumUpsell } from "@/hooks/usePremiumUpsell";
import { createGoal, fetchCurrentGoal, fetchFutureSelf, updateGoal } from "@/lib/api/yuvmi";
import { ApiError } from "@/lib/api/client";
import type { FutureSelfResponse, GoalResponse } from "@/lib/api/types";
import { theme } from "@/theme";

/**
 * TODO(AI): Hedef chip'leri kurulum adım 1–2 verisine göre AI ile üretilecek.
 * @see docs/PRD-AI.md — "Onboarding adım 3 — AI hedef chip'leri"
 * Girdi: FutureSelf (title, description, domains, affirmation)
 * Fallback: buildSuggestions() — consent yok / API hata
 */

const GOAL_IDEAS: Partial<Record<LifeDomain, string[]>> = {
  personal_growth: ["Daha tutarlı sabah rutini", "Her gün 10 dk kendime ayırmak"],
  health: ["Haftada 3 kez hareket", "Düzenli uyku alışkanlığı"],
  career: ["Yeni bir beceri öğrenmek", "Portfolyomu güncellemek"],
  finance: ["Aylık birikim planı", "Gereksiz harcamaları azaltmak"],
  relationships: ["Haftada bir kaliteli zaman", "Daha açık iletişim kurmak"],
  learning: ["Günde 20 dk pratik", "Bir kursu bitirmek"],
  peace: ["Günlük 5 dk nefes molası", "Akşam ekransız 30 dk"],
  creativity: ["Haftada bir yaratıcı proje", "Her gün bir fikir notu"],
};

const GENERIC_IDEAS = [
  "Küçük ama tutarlı bir alışkanlık",
  "Haftalık ilerleme takibi",
  "Enerjimi koruyarak ilerlemek",
];

function buildSuggestions(domains: string[]): string[] {
  const out: string[] = [];
  for (const domain of domains) {
    const ideas = GOAL_IDEAS[domain as LifeDomain];
    if (ideas) out.push(...ideas);
  }
  if (out.length === 0) return GENERIC_IDEAS;
  return [...new Set(out)].slice(0, 6);
}

export default function OnboardingGoalScreen() {
  const { user } = useAuth();
  const { setGoalId } = useOnboarding();
  const [futureSelf, setFutureSelf] = useState<FutureSelfResponse | null>(null);
  const [existingGoal, setExistingGoal] = useState<GoalResponse | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadlineMode, setDeadlineMode] = useState<"date" | "duration">("date");
  const [targetDate, setTargetDate] = useState("");
  const [durationText, setDurationText] = useState("");
  const [deadlineSkipped, setDeadlineSkipped] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestions = useMemo(
    () => buildSuggestions(futureSelf?.domains ?? []),
    [futureSelf?.domains],
  );

  const loadFutureSelf = useCallback(async () => {
    if (!user?.token) {
      setInitializing(false);
      return;
    }
    setInitializing(true);
    try {
      const [fsResult, goalResult] = await Promise.allSettled([
        fetchFutureSelf(user.token),
        fetchCurrentGoal(user.token),
      ]);
      if (fsResult.status === "fulfilled") setFutureSelf(fsResult.value);
      else setFutureSelf(null);
      if (goalResult.status === "fulfilled") {
        const goal = goalResult.value;
        setExistingGoal(goal);
        setTitle((prev) => prev || goal.title);
        setDescription((prev) => prev || goal.description);
      } else {
        setExistingGoal(null);
      }
    } finally {
      setInitializing(false);
    }
  }, [user?.token]);

  useFocusEffect(
    useCallback(() => {
      void loadFutureSelf();
    }, [loadFutureSelf]),
  );

  async function handleContinue() {
    if (!user?.token || !title.trim()) {
      const message = "Hedef başlığı gerekli.";
      setError(message);
      Alert.alert("Eksik bilgi", message);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      if (!deadlineSkipped && deadlineMode === "duration" && !durationText.trim()) {
        const message = "Bir süre yaz — örn. 3 ay — veya esnek ilerlemeyi seç.";
        setError(message);
        Alert.alert("Hedef tarihi", message);
        return;
      }
      if (!deadlineSkipped && deadlineMode === "duration" && durationText.trim() && !parseDurationToTargetDate(durationText)) {
        const message = "Süreyi anlayamadım. Örn: 3 ay, 6 hafta veya 90 gün.";
        setError(message);
        Alert.alert("Süre", message);
        return;
      }
      if (!deadlineSkipped && deadlineMode === "date" && !targetDate.trim()) {
        const message = "Bir tarih seç veya süre yaz — ya da esnek ilerlemeyi işaretle.";
        setError(message);
        Alert.alert("Hedef tarihi", message);
        return;
      }

      const resolvedDate = resolveGoalTargetDate(
        deadlineSkipped,
        deadlineMode,
        targetDate.trim(),
        durationText.trim(),
      );
      const fs = futureSelf ?? (await fetchFutureSelf(user.token));
      const payload = {
        futureSelfId: fs.id,
        title: title.trim(),
        description: description.trim(),
        targetDate: resolvedDate,
      };

      let goal: GoalResponse;
      if (existingGoal) {
        goal = await updateGoal(user.token, payload);
      } else {
        try {
          goal = await createGoal(user.token, payload);
        } catch (err) {
          if (err instanceof ApiError && (err.code === 402 || err.code === 409)) {
            goal = await updateGoal(user.token, payload);
          } else {
            throw err;
          }
        }
      }
      setExistingGoal(goal);
      setGoalId(goal.id);
      router.replace("/(onboarding)/plan");
    } catch (err) {
      if (!promptPremiumUpsell(err, { feature: "Ek hedef oluşturma" })) {
        const message = err instanceof Error ? err.message : "Bir hata oluştu.";
        setError(message);
        Alert.alert("Kaydedilemedi", message);
      }
    } finally {
      setLoading(false);
    }
  }

  if (initializing) return <LoadingScreen />;

  return (
    <Screen>
      <PageHeader
        title="Hedefin"
        subtitle="Gelecekteki Ben'e giden somut bir adım seç — küçük başla, tutarlı kal."
      />
      <Stepper current={3} total={4} label="Kurulum" />

      {futureSelf ? (
        <FutureSelfExpandableCard profile={futureSelf} style={styles.contextCard} />
      ) : null}

      <Text style={styles.label}>Hedef başlığı</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={(v) => {
          setError(null);
          setTitle(v);
        }}
        placeholder="Örn. Daha disiplinli sabah rutini"
        placeholderTextColor={theme.color.text.tertiary}
      />

      {suggestions.length > 0 ? (
        <>
          <Text style={styles.hint}>Seçtiğin alanlara göre fikirler</Text>
          <View style={styles.chipRow}>
            {suggestions.map((idea) => (
              <Pressable
                key={idea}
                onPress={() => {
                  setError(null);
                  setTitle(idea);
                }}
                style={[styles.chip, title === idea && styles.chipActive]}
              >
                <Text style={[styles.chipText, title === idea && styles.chipTextActive]}>{idea}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      <Text style={styles.label}>Bu hedef sana ne ifade ediyor?</Text>
      <TextInput
        style={[styles.input, styles.textarea]}
        value={description}
        onChangeText={(v) => {
          setError(null);
          setDescription(v);
        }}
        multiline
        placeholder="Neden önemli? Başardığında nasıl hissedeceksin?"
        placeholderTextColor={theme.color.text.tertiary}
      />

      <GoalDeadlineField
        mode={deadlineMode}
        onModeChange={setDeadlineMode}
        targetDate={targetDate}
        onTargetDateChange={(v) => {
          setError(null);
          setTargetDate(v);
        }}
        durationText={durationText}
        onDurationTextChange={(v) => {
          setError(null);
          setDurationText(v);
        }}
        skipped={deadlineSkipped}
        onSkippedChange={(v) => {
          setError(null);
          setDeadlineSkipped(v);
        }}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label="Devam" loading={loading} onPress={() => void handleContinue()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  contextCard: { marginBottom: theme.space.lg },
  label: {
    fontSize: theme.font.size.sm,
    fontWeight: theme.font.weight.medium,
    color: theme.color.text.primary,
    marginBottom: theme.space.xs,
  },
  hint: {
    fontSize: theme.font.size.xs,
    color: theme.color.text.secondary,
    marginBottom: theme.space.sm,
    lineHeight: 18,
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
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginBottom: theme.space.lg,
  },
  chip: {
    backgroundColor: "rgba(255,255,255,0.4)",
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "rgba(11,18,32,0.12)",
  },
  chipActive: {
    backgroundColor: theme.color.blue,
    borderColor: theme.color.blue,
  },
  chipText: {
    fontSize: theme.font.size.sm,
    color: theme.color.text.primary,
  },
  chipTextActive: {
    color: "#fff",
    fontWeight: theme.font.weight.semibold,
  },
  error: {
    color: theme.color.danger,
    fontSize: theme.font.size.sm,
    marginBottom: theme.space.md,
    lineHeight: 20,
  },
});
