import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useFocusEffect, type Href } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { Eyebrow, Glass } from "@/components/ui/Glass";
import { TapRow } from "@/components/ui/TapRow";
import { SegmentBar } from "@/components/today/SegmentBar";
import { SwipeableCard } from "@/components/today/SwipeableCard";
import { useAuth } from "@/context/AuthContext";
import { useMode } from "@/context/ModeContext";
import {
  fetchActiveGoal,
  fetchActivePlan,
  fetchFutureSelf,
  fetchPlans,
  fetchTodayAlignment,
  recordWaveSurvived,
  revisePlan,
} from "@/lib/api/yuvmi";
import type { AlignmentResponse, FutureSelfResponse, GoalResponse, PlanResponse } from "@/lib/api/types";
import { loadWaves, saveWaves, type WaveItem } from "@/lib/local";
import { shortStamp } from "@/lib/formatDate";
import { alert } from "@/lib/alert";
import { theme } from "@/theme";

const JSEGS = ["Plan", "Plan sağlığı", "Geçmiş"] as const;

const PLAN_STATUS_LABEL: Record<string, string> = {
  active: "Aktif",
  superseded: "Yerini yenisi aldı",
  draft: "Taslak",
};

function healthCopy(alignment: AlignmentResponse | null) {
  if (!alignment) {
    return { title: "Ritim kuruluyor", body: "Günlük adımlar birikince planın nabzı burada görünecek.", forecast: "Forecast 14 kayıtta oluşur." };
  }
  if (alignment.overallScore >= 75) {
    return { title: "Ritim yerinde", body: alignment.summaryExplanation, forecast: "Bu tempo sürdürülebilir görünüyor." };
  }
  if (alignment.overallScore >= 45) {
    return { title: "Biraz yoğun", body: alignment.summaryExplanation, forecast: "Akşam adımları hafifletilebilir." };
  }
  return { title: "Hafifletilebilir", body: alignment.summaryExplanation, forecast: "Minimum hâllere çekmek ritmi korur." };
}

export default function JourneyScreen() {
  const { user } = useAuth();
  const { prefs, patchPrefs } = useMode();
  const [seg, setSeg] = useState(0);
  const [goal, setGoal] = useState<GoalResponse | null>(null);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [plans, setPlans] = useState<PlanResponse[]>([]);
  const [alignment, setAlignment] = useState<AlignmentResponse | null>(null);
  const [futureSelf, setFutureSelf] = useState<FutureSelfResponse | null>(null);
  const [waves, setWaves] = useState<WaveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [bubbleOpen, setBubbleOpen] = useState(false);
  const [adaptiveDone, setAdaptiveDone] = useState(false);
  const [newWave, setNewWave] = useState("");

  useFocusEffect(
    useCallback(() => {
      if (!user?.token) return;
      void Promise.allSettled([
        fetchActiveGoal(),
        fetchActivePlan(),
        fetchPlans(),
        fetchTodayAlignment(),
        fetchFutureSelf(),
        loadWaves(),
      ]).then(([g, p, pl, a, fs, w]) => {
        setGoal(g.status === "fulfilled" ? g.value : null);
        setPlan(p.status === "fulfilled" ? p.value : null);
        setPlans(pl.status === "fulfilled" ? pl.value : []);
        setAlignment(a.status === "fulfilled" ? a.value : null);
        setFutureSelf(fs.status === "fulfilled" ? fs.value : null);
        setWaves(w.status === "fulfilled" ? w.value : []);
        setLoading(false);
      });
    }, [user?.token]),
  );

  if (loading) return <LoadingScreen />;

  const steps = plan?.steps ?? [];
  const health = healthCopy(alignment);
  const quote = futureSelf?.description || futureSelf?.title || "Vizyon cümlen burada görünecek.";

  async function bumpWave(id: string) {
    const next = waves.map((w) => (w.id === id ? { ...w, count: w.count + 1 } : w));
    setWaves(next);
    await saveWaves(next);

    if (!user?.token) {
      alert("Dalga atlatıldı 🌊", "Sayaç sıfırlanmaz, sadece artar.");
      return;
    }
    try {
      const award = await recordWaveSurvived();
      await patchPrefs({ tohum: award.balance });
      const bumped = next.find((w) => w.id === id);
      const milestone = bumped && bumped.count > 0 && bumped.count % 5 === 0;
      if (award.awarded) {
        alert(
          milestone ? `🌊 ${bumped!.count}. dalga! 🫧` : "Dalga atlatıldı 🌊",
          milestone
            ? `${bumped!.name} için ${bumped!.count} dalgayı geride bıraktın — +1 İnci kazandın.`
            : "+1 İnci kazandın. Sayaç sıfırlanmaz, sadece artar.",
        );
      } else {
        alert("Dalga atlatıldı 🌊", "Bugünkü İnci sınırına ulaştın ama sayaç yine de arttı.");
      }
    } catch {
      alert("Dalga atlatıldı 🌊", "Sayaç sıfırlanmaz, sadece artar.");
    }
  }

  async function addWave() {
    const name = newWave.trim();
    if (!name) return;
    const next = [...waves, { id: `w${Date.now()}`, name, count: 0 }];
    setWaves(next);
    setNewWave("");
    await saveWaves(next);
  }

  async function handleDeleteStep(stepId: string) {
    if (!user?.token || !plan) return;
    try {
      const updatedSteps = plan.steps
        .filter((s) => s.id !== stepId)
        .map((s, i) => ({
          dayOffset: s.dayOffset,
          title: s.title,
          description: s.description,
          sortOrder: i,
        }));
      const revised = await revisePlan({ basePlanId: plan.id, steps: updatedSteps, activate: true });
      setPlan(revised);
    } catch (e) {
      alert("Hata", "Adım silinemedi.");
    }
  }

  return (
    <Screen tabBar>
      <PageHeader
        eyebrow={goal?.title ?? "Yolculuk"}
        eyebrowRight={plan ? `Plan v${plan.version}` : "Plan yok"}
        title="Yolculuk"
        subtitle="Vizyonun günlük hâli. Hayatın değiştikçe plan da değişir."
      />

      <SegmentBar index={seg} onChange={setSeg} labels={JSEGS} style={{ marginTop: -4, marginBottom: 8 }} />

      {seg === 0 ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={bubbleOpen ? "Vizyon cümlesini küçült" : "Vizyon cümlesini büyüt"}
            onPress={() => setBubbleOpen((v) => !v)}
          >
            <Glass style={[styles.bubble, bubbleOpen && styles.bubbleExp]}>
              <Text style={[styles.quote, bubbleOpen && styles.quoteExp]}>“{quote}”</Text>
              <Text style={styles.hint}>{bubbleOpen ? "Küçültmek için dokun" : "Büyütmek için dokun"}</Text>
            </Glass>
          </Pressable>


          {!adaptiveDone ? (
            <Glass style={styles.banner}>
              <Text style={styles.bannerTitle}>🤖 Adaptif plan önerisi</Text>
              <Text style={styles.body}>
                Akşam adımların daha sık aksıyor. Sabah çapasına taşımayı deneyelim mi? Plan v{(plan?.version ?? 1) + 1} olur,
                geçmişin korunur.
              </Text>
              <View style={styles.brow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Adımları sabaha taşı"
                  style={styles.bsmY}
                  onPress={() => {
                    setAdaptiveDone(true);
                    alert("Not alındı", "Gerçek sürümde plan v2 üretilir — geçmiş korunur.");
                  }}
                >
                  <Text style={styles.bsmYText}>Sabaha taşı</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Böyle kalsın, değiştirme"
                  style={styles.bsmN}
                  onPress={() => setAdaptiveDone(true)}
                >
                  <Text style={styles.bsmNText}>Böyle kalsın</Text>
                </Pressable>
              </View>
            </Glass>
          ) : null}

          {!goal ? (
            <EmptyState title="Aktif hedef yok" description="Onboarding'de bir hedef oluştur veya yeni hedef ekle." />
          ) : null}

          <Eyebrow style={styles.sec}>Bugünün planı · {steps.length} adım</Eyebrow>
          {steps.map((step, index) => (
            <SwipeableCard key={step.id} label={step.title} onSwipe={() => void handleDeleteStep(step.id)}>
              <TapRow
                title={`${String(index + 1).padStart(2, "0")} · ${step.title}`}
                subtitle={step.description || undefined}
                arrow="›"
                onPress={() => router.push(`/intention/new?stepId=${step.id}` as Href)}
              />
            </SwipeableCard>
          ))}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Niyet ekle"
            onPress={() => router.push("/intention/new" as Href)}
            style={styles.add}
          >
            <Text style={styles.addText}>+ Niyet ekle</Text>
          </Pressable>

          <Glass style={styles.stat}>
            <View style={styles.waveHeadRow}>
              <Eyebrow style={styles.lbl}>🌊 Dalgalar</Eyebrow>
              <Text style={styles.wavePearlHint}>Her atlatış +1 🫧</Text>
            </View>
            {waves.map((w) => (
              <View key={w.id} style={styles.waveRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.waveName}>{w.name}</Text>
                  <Text style={styles.waveCount}>{w.count} dalga atlatıldı</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${w.name} için dalga atlatıldı işaretle`}
                  style={styles.urgeMini}
                  onPress={() => void bumpWave(w.id)}
                >
                  <Text style={styles.urgeMiniText}>🫧 Atlat</Text>
                </Pressable>
              </View>
            ))}
            <View style={styles.addWave}>
              <TextInput
                style={styles.waveInput}
                value={newWave}
                onChangeText={setNewWave}
                placeholder="Bırakmak istediğin ne?"
                placeholderTextColor={theme.color.ink70}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Dalga ekle"
                onPress={() => void addWave()}
                style={styles.bsmY}
              >
                <Text style={styles.bsmYText}>Ekle</Text>
              </Pressable>
            </View>
            <Text style={styles.hint}>Gün saymıyoruz — atlattığın dalgaları sayıyoruz. Kayarsan hiçbir şey sıfırlanmaz.</Text>
          </Glass>

        </>
      ) : null}

      {seg === 1 ? (
        <>
          <Glass style={styles.stat}>
            <Eyebrow style={styles.lbl}>Plan sağlığı</Eyebrow>
            <Text style={styles.healthBig}>{health.title}</Text>
            <Text style={styles.body}>{health.body}</Text>
            <Text style={[styles.body, styles.forecast]}>{health.forecast}</Text>
          </Glass>
          <TapRow
            title="Haftalık değerlendirme"
            subtitle="Bu haftanın ritmi, örüntüler ve plan önerisi"
            onPress={() => router.push("/weekly-review")}
          />
        </>
      ) : null}

      {seg === 2 ? (
        <>
          <Glass style={styles.stat}>
            <Eyebrow style={styles.lbl}>Plan evrimi</Eyebrow>
            {(plans.length ? plans : plan ? [plan] : []).slice(0, 5).map((p) => (
              <View key={p.id} style={styles.tlitem}>
                <Text style={styles.tlv}>v{p.version}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.waveName}>{goal?.title ?? "Plan"}</Text>
                  <Text style={styles.hint}>{shortStamp(p.createdAt)} · {PLAN_STATUS_LABEL[p.status] ?? p.status}</Text>
                </View>
              </View>
            ))}
            <Text style={styles.hint}>
              {plans.length > 5
                ? `+${plans.length - 5} eski sürüm daha — silinmez, sadece geçmişte kalır.`
                : "Eski planlar silinmez — hayatındaki değişim versiyonlanır."}
            </Text>
          </Glass>
          <TapRow
            title="Plan geçmişi"
            subtitle={plan ? `v${plan.version} · ${shortStamp(plan.createdAt)}'te kuruldu` : "Henüz plan yok"}
            onPress={() => router.push("/plan-history" as Href)}
          />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  bubble: { paddingVertical: 22, paddingHorizontal: 19, marginBottom: 11 },
  bubbleExp: { paddingVertical: 34, paddingHorizontal: 22 },
  quote: {
    fontFamily: theme.font.sansBold,
    fontSize: 17,
    fontWeight: theme.font.weight.bold,
    fontStyle: "italic",
    lineHeight: 24,
    color: theme.color.ink,
  },
  quoteExp: { fontSize: 24, lineHeight: 31 },
  hint: { marginTop: 10, fontFamily: theme.font.sans, fontSize: 11.5, color: theme.color.ink40, lineHeight: 16 },
  banner: { padding: 14, marginBottom: 10 },
  bannerTitle: {
    fontFamily: theme.font.sansBold,
    fontWeight: theme.font.weight.bold,
    fontSize: 14,
    color: theme.color.ink,
    marginBottom: 4,
  },
  body: { fontFamily: theme.font.sans, fontSize: 12.5, color: theme.color.ink70, lineHeight: 18 },
  forecast: { marginTop: 8, color: theme.color.blueDeep, fontFamily: theme.font.sansSemibold, fontWeight: theme.font.weight.semibold },
  brow: { flexDirection: "row", gap: 8, marginTop: 10 },
  bsmY: { backgroundColor: theme.color.blue, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 },
  bsmYText: { color: "#fff", fontFamily: theme.font.sansSemibold, fontWeight: theme.font.weight.semibold, fontSize: 12.5 },
  bsmN: {
    backgroundColor: "rgba(255,255,255,0.5)",
    borderWidth: 1,
    borderColor: theme.color.ink15,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  bsmNText: { color: theme.color.ink70, fontFamily: theme.font.sansSemibold, fontWeight: theme.font.weight.semibold, fontSize: 12.5 },
  sec: { marginBottom: 9, marginTop: 4 },
  add: {
    marginTop: 4,
    marginBottom: 12,
    backgroundColor: "rgba(255,255,255,0.4)",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: theme.color.blueLight,
    borderRadius: 14,
    padding: 13,
    alignItems: "center",
  },
  addText: {
    fontFamily: theme.font.sansSemibold,
    fontSize: 13.5,
    fontWeight: theme.font.weight.semibold,
    color: theme.color.blueDeep,
  },
  stat: { padding: 14, marginBottom: 10 },
  lbl: { marginBottom: 8 },
  waveHeadRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  wavePearlHint: {
    fontFamily: theme.font.mono,
    fontSize: 10.5,
    color: theme.color.blueDeep,
    marginBottom: 8,
  },
  waveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(11,18,32,0.09)",
  },
  waveName: { fontFamily: theme.font.sansBold, fontWeight: theme.font.weight.bold, fontSize: 14, color: theme.color.ink },
  waveCount: { marginTop: 2, fontFamily: theme.font.mono, fontSize: 11, color: theme.color.blueDeep },
  urgeMini: {
    backgroundColor: "rgba(37,99,235,0.12)",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  urgeMiniText: { fontFamily: theme.font.sansSemibold, fontWeight: theme.font.weight.semibold, fontSize: 11, color: theme.color.blueDeep },
  addWave: { flexDirection: "row", gap: 8, marginTop: 10, alignItems: "center" },
  waveInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.color.ink15,
    backgroundColor: "rgba(255,255,255,0.55)",
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 10,
    fontFamily: theme.font.sans,
    fontSize: 13,
    color: theme.color.ink,
  },
  tree: { fontFamily: theme.font.mono, fontSize: 11, color: theme.color.ink70, lineHeight: 18 },
  treeB: { color: theme.color.ink, fontFamily: theme.font.sansBold, fontWeight: theme.font.weight.bold },
  healthBig: {
    fontFamily: theme.font.sansExtra,
    fontWeight: theme.font.weight.extra,
    fontSize: 19,
    letterSpacing: -0.3,
    color: theme.color.ink,
    marginVertical: 6,
  },
  tlitem: { flexDirection: "row", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(11,18,32,0.09)" },
  tlv: { fontFamily: theme.font.mono, fontSize: 11, color: theme.color.ink40, width: 48 },
  visionTitle: {
    fontFamily: theme.font.sansSemibold,
    fontSize: 13.5,
    color: theme.color.ink,
    marginBottom: 8,
  },
  visionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginVertical: 4,
  },
  visionDomain: {
    backgroundColor: "rgba(37,99,235,0.12)",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  visionDomainText: {
    fontFamily: theme.font.sansSemibold,
    fontSize: 12,
    color: theme.color.blueDeep,
  },
});
