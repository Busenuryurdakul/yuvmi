import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { router, useFocusEffect, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AmbientBackground, Eyebrow, Glass } from "@/components/ui/Glass";
import { Button } from "@/components/ui/Button";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { AccordionStat } from "@/components/today/AccordionStat";
import { IntentionCard, type IntentionState } from "@/components/today/IntentionCard";
import { OffTrackSheet } from "@/components/today/OffTrackSheet";
import { WaitOverlay } from "@/components/today/WaitOverlay";
import { RhythmStrip, type RhythmTick } from "@/components/today/RhythmStrip";
import { SegmentBar } from "@/components/today/SegmentBar";
import { MoodGrid } from "@/components/today/MoodGrid";
import { BarRow, BigStat, StatBlock } from "@/components/today/StatBlock";
import { useAuth } from "@/context/AuthContext";
import { useMode } from "@/context/ModeContext";
import { useTodayDashboard } from "@/hooks/useTodayDashboard";
import { completeTask, skipTask, upsertCheckin, revisePlan } from "@/lib/api/yuvmi";
import { SwipeableCard } from "@/components/today/SwipeableCard";
import { longDate, toDateKey } from "@/lib/formatDate";
import {
  loadDailyCard,
  loadDeck,
  loadIntentionLog,
  loadMoodHistory,
  loadRituals,
  loadWaves,
  moodFromCheckin,
  moodFromScore,
  saveDailyCard,
  saveIntentionPick,
  saveMoodDay,
  saveWaves,
  type EnergyLevel,
  type MoodLevel,
  type RitualDraft,
} from "@/lib/local";
import { isCannedPlanStep } from "@yuvmi/shared";
import { theme } from "@/theme";

const MOODS = [
  { label: "Yorgun", value: 1 },
  { label: "İdare", value: 2 },
  { label: "İyi", value: 4 },
  { label: "Canlı", value: 5 },
] as const;

const MOOD_NOTES: Record<(typeof MOODS)[number]["label"], string> = {
  Yorgun: "Not aldım. Yorgun bir gün planına zarar vermez — ruh hâli hiçbir modda puan düşürmez.",
  İdare: "Not aldım. İdare bir gün de tam gündür — ruh hâli hiçbir modda puan düşürmez.",
  İyi: "Not aldım. İyi hissetmen planı şişirmez — ruh hâli hiçbir modda puan düşürmez.",
  Canlı: "Not aldım. Enerjin yüksekse bonus adımlar açık; ruh hâli yine puan düşürmez.",
};

const EN_HINTS: Record<EnergyLevel, string> = {
  lo: "Bugün sadece minimumlar yeter — bırakmak yok, küçültmek var.",
  mid: "Hedefler normal hâlleriyle görünüyor.",
  hi: "Enerjin yüksek — bonus hedefler açıldı.",
};

const EN_LABELS: Record<EnergyLevel, string> = {
  lo: "🔋 Düşük",
  mid: "Normal",
  hi: "⚡ Yüksek",
};

function scoreToTick(score: number): RhythmTick {
  if (score >= 70) return "full";
  if (score >= 35) return "small";
  return "none";
}

function buildRhythm(history: { date: string; overallScore: number }[], todayTick: RhythmTick): RhythmTick[] {
  const byDate: Record<string, number> = {};
  for (const snap of history) byDate[toDateKey(snap.date)] = snap.overallScore;
  const ticks: RhythmTick[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    if (i === 0) {
      ticks.push(todayTick);
      continue;
    }
    const score = byDate[toDateKey(d)];
    ticks.push(score == null ? "none" : scoreToTick(score));
  }
  return ticks;
}

function shortLabel(title: string) {
  return title.length > 16 ? `${title.slice(0, 14)}…` : title;
}

function energyTarget(title: string, energy: EnergyLevel): string {
  const t = title.toLocaleLowerCase("tr");
  if (t.includes("günlük") || t.includes("yaz")) {
    if (energy === "lo") return "Minimum: üç cümle";
    if (energy === "hi") return "Bonus: 10 dk + haftalık niyetini gözden geçir";
    return "Normal: 10 dakika";
  }
  if (t.includes("kurs") || t.includes("bölüm") || t.includes("video")) {
    if (energy === "lo") return "Minimum: 10 dk video";
    if (energy === "hi") return "Bonus: 1 bölüm + öğrendiğini projede dene";
    return "Normal: 1 bölüm";
  }
  if (t.includes("hareket") || t.includes("yürü") || t.includes("spor")) {
    if (energy === "lo") return "Minimum: 5 dk yürüyüş";
    if (energy === "hi") return "Bonus: 20 dk + merdiven";
    return "Normal: 15 dakika";
  }
  if (energy === "lo") return "Minimum: en küçük hâl";
  if (energy === "hi") return "Bonus: tam hâl + bir adım daha";
  return "Normal: planındaki hâl";
}

function streakFromTicks(ticks: RhythmTick[]): number {
  let n = 0;
  for (let i = ticks.length - 1; i >= 0; i--) {
    if (ticks[i] === "full" || ticks[i] === "small") n += 1;
    else if (ticks[i] === "pending") continue;
    else break;
  }
  return n;
}

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pagerRef = useRef<ScrollView>(null);
  const { user } = useAuth();
  const { hard, prefs, patchPrefs } = useMode();
  const energy = prefs?.energy ?? "mid";
  const { checkin, task, history, plan, plans, loading, error, refresh, setCheckin, setTask } =
    useTodayDashboard();

  const [seg, setSeg] = useState(0);
  const [picks, setPicks] = useState<Record<string, IntentionState>>({});
  const [offTrack, setOffTrack] = useState(false);
  const [savingMood, setSavingMood] = useState(false);
  const [note, setNote] = useState("");
  const [moodDays, setMoodDays] = useState<MoodLevel[]>(Array(30).fill(0));
  const [stepRates, setStepRates] = useState<Record<string, number>>({});
  const [rituals, setRituals] = useState<RitualDraft[]>([]);
  const [drawText, setDrawText] = useState("Desteni karıştır ve bir kart çek");
  const [drawnToday, setDrawnToday] = useState(false);
  const [ctxHidden, setCtxHidden] = useState(false);
  const [ctxLight, setCtxLight] = useState(false);
  const [voicePhase, setVoicePhase] = useState<"idle" | "listen" | "prop" | "done">("idle");
  const [urgeLeft, setUrgeLeft] = useState<number | null>(null);
  const urgeRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      void loadRituals().then(setRituals);
      void (async () => {
        const card = await loadDailyCard();
        const today = toDateKey(new Date());
        if (card?.date === today) {
          setDrawText(card.text);
          setDrawnToday(true);
        } else {
          const deck = await loadDeck();
          if (!deck.length) {
            setDrawText("Desten boş — Kart eklemek için buraya tıkla 🃏");
          } else {
            setDrawText("Desteni karıştır ve bir kart çek");
          }
          setDrawnToday(false);
        }
      })();
    }, [refresh]),
  );

  useEffect(() => {
    if (checkin?.reflection) setNote(checkin.reflection);
  }, [checkin?.reflection]);

  useEffect(() => {
    void (async () => {
      const stored = await loadMoodHistory();
      const days: MoodLevel[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = toDateKey(d);
        if (stored[key]) {
          days.push(stored[key]);
          continue;
        }
        const snap = history.find((h) => toDateKey(h.date) === key);
        days.push(snap ? moodFromScore(snap.overallScore) : 0);
      }
      if (checkin) days[29] = moodFromCheckin(checkin.mood);
      setMoodDays(days);
    })();
  }, [history, checkin]);

  useEffect(() => {
    void (async () => {
      const log = await loadIntentionLog();
      const rates: Record<string, number> = {};
      for (const step of plan?.steps ?? []) {
        let done = 0;
        for (let i = 0; i < 14; i++) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const pick = log[step.id]?.[toDateKey(d)];
          if (pick === "full" || pick === "small") done += 1;
        }
        rates[step.id] = done / 14;
      }
      setStepRates(rates);
    })();
  }, [plan]);

  useEffect(() => {
    return () => {
      if (urgeRef.current) clearInterval(urgeRef.current);
    };
  }, []);

  const intentions = useMemo(
    () => (plan?.steps ?? []).filter((s) => !isCannedPlanStep(s)),
    [plan],
  );

  const yesterdayMissed = useMemo(() => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const snap = history.find((h) => toDateKey(h.date) === toDateKey(y));
    return !snap || snap.overallScore < 40;
  }, [history]);

  const todayTick = useMemo<RhythmTick>(() => {
    const vals = Object.values(picks);
    if (vals.includes("full") || task?.status === "completed") return "full";
    if (vals.includes("small")) return "small";
    if (vals.includes("none") || task?.status === "skipped") return "none";
    return "pending";
  }, [picks, task]);

  const ticks = useMemo(() => buildRhythm(history, todayTick), [history, todayTick]);
  const fullDays = ticks.filter((t) => t === "full" || t === "small").length;
  const missDays = ticks.filter((t) => t === "none").length;
  const streak = streakFromTicks(ticks);
  const returns = plans.filter((p) => p.status === "superseded").length;
  const go = (i: number) => {
    const next = Math.max(0, Math.min(2, i));
    setSeg(next);
    pagerRef.current?.scrollTo({ x: next * width, animated: true });
  };

  const onPagerScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== seg) setSeg(i);
  };

  async function handleDeleteIntention(stepId: string) {
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
      await revisePlan(user.token, { basePlanId: plan.id, steps: updatedSteps, activate: true });
      void refresh();
    } catch (e) {
      Alert.alert("Hata", "Niyet silinemedi.");
    }
  }

  async function handleAddMoodForDay(date: Date, level: MoodLevel) {
    if (!user?.token) return;
    const dateKey = toDateKey(date);
    await saveMoodDay(dateKey, level);
    const isToday = dateKey === toDateKey(new Date());
    if (isToday) {
      const value = level === 1 ? 1 : level === 2 ? 2 : level === 3 ? 4 : level === 4 ? 5 : 3;
      await handleMood(value, MOODS.find((m) => m.value === value)?.label ?? "İyi");
    } else {
      void refresh();
    }
  }

  async function setEnergy(lvl: EnergyLevel) {
    await patchPrefs({ energy: lvl });
    if (lvl === "lo") setCtxLight(true);
  }

  async function handlePick(stepId: string, title: string, next?: IntentionState) {
    setPicks((prev) => {
      const copy = { ...prev };
      if (!next) delete copy[stepId];
      else copy[stepId] = next;
      return copy;
    });
    await saveIntentionPick(stepId, toDateKey(new Date()), next);
    if (next === "full" || next === "small") {
      const add = next === "full" ? 2 : 1;
      await patchPrefs({ tohum: (prefs?.tohum ?? 48) + add });
    }
    if (!user?.token || !task) return;
    const linked = task.title === title || intentions.length === 1;
    if (!linked || !next) return;
    try {
      const updated =
        next === "none" ? await skipTask(user.token, task.id, "bugün olmadı") : await completeTask(user.token, task.id);
      setTask(updated);
    } catch {
      /* keep local */
    }
  }

  async function handleMood(value: number, label: string) {
    if (!user?.token || savingMood) return;
    const already = checkin?.mood === value;
    const nextMood = already ? 3 : value;
    setSavingMood(true);
    try {
      const updated = await upsertCheckin(user.token, {
        mood: nextMood,
        energy: checkin?.energy ?? nextMood,
        gratitude: checkin?.gratitude ?? [],
        reflection: note || (already ? (checkin?.reflection ?? "") : label === "Yorgun" ? "Yorgun bir gün." : note),
      });
      setCheckin(updated);
      const level = already ? 0 : moodFromCheckin(value);
      await saveMoodDay(toDateKey(new Date()), level);
      setMoodDays((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = level;
        return copy;
      });
    } catch {
      /* ignore */
    } finally {
      setSavingMood(false);
    }
  }

  async function saveNote() {
    if (!user?.token) return;
    try {
      const updated = await upsertCheckin(user.token, {
        mood: checkin?.mood ?? 3,
        energy: checkin?.energy ?? 3,
        gratitude: checkin?.gratitude ?? [],
        reflection: note,
      });
      setCheckin(updated);
    } catch {
      /* ignore */
    }
  }

  async function drawCard() {
    const today = toDateKey(new Date());
    const existing = await loadDailyCard();
    if (existing?.date === today) {
      setDrawText(existing.text);
      setDrawnToday(true);
      return;
    }
    const deck = await loadDeck();
    if (!deck.length) {
      router.push("/atolye/deck" as any);
      return;
    }
    const pick = deck[Math.floor(Math.random() * deck.length)];
    setDrawText(pick.text);
    setDrawnToday(true);
    await saveDailyCard({ date: today, text: pick.text });
  }

  function startUrge() {
    if (urgeLeft != null) return;
    if (urgeRef.current) clearInterval(urgeRef.current);
    setUrgeLeft(180);
    urgeRef.current = setInterval(() => {
      setUrgeLeft((prev) => {
        if (prev == null) return prev;
        if (prev <= 1) {
          if (urgeRef.current) clearInterval(urgeRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  const finishUrge = useCallback(async () => {
    if (urgeRef.current) clearInterval(urgeRef.current);
    setUrgeLeft(null);
    const waves = await loadWaves();
    if (waves[0]) {
      waves[0] = { ...waves[0], count: waves[0].count + 1 };
      await saveWaves(waves);
    }
  }, []);

  function runVoice() {
    setVoicePhase("listen");
    setTimeout(() => setVoicePhase("prop"), 1600);
  }

  async function applyVoice() {
    for (const step of intentions.slice(0, 2)) {
      await handlePick(step.id, step.title, "full");
    }
    if (intentions[2]) await handlePick(intentions[2].id, intentions[2].title, "none");
    await handleMood(1, "Yorgun");
    setVoicePhase("done");
  }

  if (loading && !task && !plan && !checkin) return <LoadingScreen />;

  const moodOn = checkin ? MOODS.find((m) => m.value === checkin.mood)?.label : undefined;
  const paneBottom = 120 + insets.bottom;
  const refreshControl = (
    <RefreshControl refreshing={loading} onRefresh={() => void refresh()} tintColor={theme.color.blue} />
  );
  const protectSoft = "Dün olmadı. Minimum hâli yeter — en küçük adım da sayılır.";
  const protectHard = "Dün yapılmadı. Seri kırıldı — bugün geri al.";

  return (
    <View style={styles.root}>
      <AmbientBackground />
      <View style={[styles.head, { paddingTop: insets.top + 12 }]}>
        <View style={styles.toprow}>
          <Eyebrow>{longDate()}</Eyebrow>
          <Eyebrow>{hard ? "Disiplin modu" : "Nazik mod"}</Eyebrow>
        </View>
        <SegmentBar index={seg} onChange={go} />
      </View>

      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onPagerScroll}
        scrollEnabled={seg !== 1}
        style={styles.pager}
      >
        {/* İstatistik */}
        <ScrollView
          style={{ width }}
          contentContainerStyle={[styles.pane, { paddingBottom: paneBottom }]}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
        >
          <AccordionStat label="Ritim · son 14 gün" defaultOpen>
            <RhythmStrip ticks={ticks} />
            <Text style={[styles.body, { marginTop: 9 }]}>
              {fullDays >= 8 ? "Son 14 günde ritmini korudun." : "Ritim kuruluyor — minimum da dolu gün sayılır."}
            </Text>
          </AccordionStat>

          <View style={styles.duo}>
            {hard ? (
              <>
                <StatBlock label="Seri" style={styles.duoItem}>
                  <BigStat value={streak} suffix="gün" />
                </StatBlock>
                <StatBlock label="Hücum" style={styles.duoItem}>
                  <BigStat value={plans.length + 1} suffix="sürüm" />
                </StatBlock>
              </>
            ) : (
              <>
                <StatBlock label="Dolu günler" style={styles.duoItem}>
                  <BigStat value={fullDays} suffix="gün" />
                </StatBlock>
                <StatBlock label="Geri dönüş" style={styles.duoItem}>
                  <BigStat value={returns} suffix="kez" />
                </StatBlock>
              </>
            )}
          </View>

          <AccordionStat label="Niyet performansı · son 14 gün">
            {intentions.length === 0 ? (
              <Text style={styles.body}>Henüz niyet performansı verisi yok.</Text>
            ) : (
              intentions.map((step) => (
                <BarRow
                  key={step.id}
                  label={shortLabel(step.title)}
                  ratio={stepRates[step.id] ?? 0}
                  value={`${Math.round((stepRates[step.id] ?? 0) * 100)}%`}
                />
              ))
            )}
          </AccordionStat>

          <AccordionStat label="Ruh hâli · son 30 gün">
            <MoodGrid days={moodDays} onAddMoodForDay={handleAddMoodForDay} />
            <Text style={[styles.body, { marginTop: 11 }]}>
              İyi hissettiğin günlerde adımlarını tamamlama oranın belirgin şekilde yükseliyor.
            </Text>
          </AccordionStat>

          <Button label="Haftalık değerlendirmeyi aç" onPress={() => router.push("/weekly-review")} />
        </ScrollView>

        {/* Plan */}
        <ScrollView
          style={{ width }}
          contentContainerStyle={[styles.pane, { paddingBottom: paneBottom }]}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
        >
          {/* Card draw widget */}
          <Pressable onPress={drawCard} style={[styles.drawcard, { marginBottom: 12 }]}>
            <Text style={styles.drawText}>
              {drawnToday ? `🃏 Günün Kartı: ${drawText}` : `🃏 ${drawText}`}
            </Text>
          </Pressable>

          {intentions.length === 0 ? (
            <Glass style={styles.planEmpty}>
              <Text style={styles.planEmptyTitle}>Bugün için adım yok</Text>
              <Text style={styles.planEmptyBody}>
                Planın senin cümlelerinle başlar. Liste boş kalsın — hazır kart çıkarmıyoruz.
              </Text>
              <Button
                label="İlk niyetini yaz"
                onPress={() => router.push("/intention/new" as Href)}
                style={{ marginTop: 14 }}
              />
              <Pressable onPress={() => router.push("/(tabs)/yuvmi" as Href)} style={[styles.ghost, { marginTop: 8, marginBottom: 0 }]}>
                <Text style={styles.ghostText}>Yuvmi’yle planla</Text>
              </Pressable>
            </Glass>
          ) : (
            <>
              {intentions.length >= 4 ? (
                <Glass style={styles.banner}>
                  {ctxLight ? (
                    <>
                      <Text style={styles.bannerTitle}>✓ Bugün hafifletilmiş gün</Text>
                      <Text style={styles.body}>
                        {plan?.title ? `${plan.title} — ` : ""}sadece minimumlar görünüyor. Ritmin bozulmuş sayılmaz.
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.bannerTitle}>
                        {`📅 ${plan?.title ?? "Planın"} · bugün ${intentions.length} adım`}
                      </Text>
                      <Text style={styles.body}>
                        Planında bugün birden fazla adım var. Hafifletirsen sadece minimumlar kalır; ritmin bozulmuş
                        sayılmaz.
                      </Text>
                      {!ctxHidden ? (
                        <View style={styles.brow}>
                          <Pressable
                            style={styles.bsmY}
                            onPress={() => {
                              void setEnergy("lo");
                              setCtxLight(true);
                            }}
                          >
                            <Text style={styles.bsmYText}>Hafiflet</Text>
                          </Pressable>
                          <Pressable style={styles.bsmN} onPress={() => setCtxHidden(true)}>
                            <Text style={styles.bsmNText}>Böyle iyi</Text>
                          </Pressable>
                        </View>
                      ) : null}
                    </>
                  )}
                </Glass>
              ) : null}

              <StatBlock label="Bugün enerjin nasıl?">
                <View style={styles.pick}>
                  {(["lo", "mid", "hi"] as EnergyLevel[]).map((lvl) => (
                    <Pressable
                      key={lvl}
                      onPress={() => void setEnergy(lvl)}
                      style={[styles.pk, energy === lvl && styles.pkOn]}
                    >
                      <Text style={[styles.pkText, energy === lvl && styles.pkTextOn]}>{EN_LABELS[lvl]}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={[styles.body, { marginTop: 9 }]}>{EN_HINTS[energy]}</Text>
              </StatBlock>

              <Pressable onPress={() => router.push("/(tabs)/yuvmi" as Href)} style={styles.ghost}>
                <Text style={styles.ghostText}>Yuvmi’yle planla</Text>
              </Pressable>

              <Eyebrow style={styles.sechead}>Bugünün planı · {intentions.length} adım</Eyebrow>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              {intentions.map((step) => {
                const linked = task && (task.title === step.title || intentions.length === 1);
                const fromTask: IntentionState | undefined = linked
                  ? task.status === "completed"
                    ? (picks[step.id] ?? "full")
                    : task.status === "skipped"
                      ? "none"
                      : picks[step.id]
                  : picks[step.id];
                return (
                  <SwipeableCard key={step.id} onSwipe={() => void handleDeleteIntention(step.id)}>
                    <IntentionCard
                      title={step.title}
                      anchor={step.description || undefined}
                      target={energyTarget(step.title, energy)}
                      protected={Boolean(linked && yesterdayMissed && task?.status === "pending")}
                      protectHint={hard ? protectHard : protectSoft}
                      lowEnergy={energy === "lo"}
                      value={fromTask}
                      onChange={(v) => void handlePick(step.id, step.title, v)}
                    />
                  </SwipeableCard>
                );
              })}
              <Pressable onPress={() => router.push("/intention/new" as Href)} style={styles.add}>
                <Text style={styles.addText}>+ Niyet ekle</Text>
              </Pressable>
              <Pressable onPress={startUrge} style={styles.urge}>
                <Text style={styles.urgeText}>Geçmesini bekle</Text>
              </Pressable>
              <Pressable onPress={() => setOffTrack(true)} style={styles.offtrack}>
                <Text style={styles.offtrackText}>Yoldan çıktım — planı gözden geçir</Text>
              </Pressable>
            </>
          )}
        </ScrollView>

        {/* Hâl */}
        <ScrollView
          style={{ width }}
          contentContainerStyle={[styles.pane, { paddingBottom: paneBottom }]}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
        >
          <StatBlock label="Günü sesle kapat">
            <Text style={styles.body}>Kutucuklarla uğraşma. 20 saniye anlat, Yuvmi işaretlesin.</Text>
            {voicePhase === "idle" ? (
              <Button label="🗣️ Konuş — Yuvmi dinlesin" onPress={runVoice} style={{ marginTop: 10 }} />
            ) : null}
            {voicePhase === "listen" ? <Text style={styles.listen}>● Dinliyorum...</Text> : null}
            {voicePhase === "prop" ? (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.vq}>
                  "Bugün sabah günlüğü yazdım ama akşam çok yorgundum. Yalnızca biraz yürüdüm. Biraz stresli bir gündü."
                </Text>
                <Text style={styles.body}>✓ İlk niyetler → Yaptım{"\n"}− Son niyet → Bugün olmadı{"\n"}◐ Ruh hâli → Yorgun</Text>
                <Button label="Onayla ve işle" onPress={() => void applyVoice()} style={{ marginTop: 10 }} />
                <Pressable onPress={() => setVoicePhase("idle")} style={{ marginTop: 8 }}>
                  <Text style={styles.offtrackText}>Vazgeç</Text>
                </Pressable>
              </View>
            ) : null}
            {voicePhase === "done" ? (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.doneVoice}>✓ İşlendi — niyetler ve ruh hâli güncellendi</Text>
                <Pressable onPress={() => go(1)} style={styles.ghost}>
                  <Text style={styles.ghostText}>Niyetlerini gör</Text>
                </Pressable>
              </View>
            ) : null}
          </StatBlock>

          <StatBlock label="Bugün nasılsın?">
            <View style={styles.moods}>
              {MOODS.map((m) => {
                const on = moodOn === m.label;
                return (
                  <Pressable key={m.label} onPress={() => void handleMood(m.value, m.label)} style={[styles.mo, on && styles.moOn]}>
                    <Text style={[styles.moLabel, on && styles.moLabelOn]}>{m.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            {moodOn ? <Text style={styles.reassure}>{MOOD_NOTES[moodOn]}</Text> : null}
          </StatBlock>

          <StatBlock label="Bir not bırak">
            <TextInput
              style={styles.textarea}
              value={note}
              onChangeText={setNote}
              onBlur={() => void saveNote()}
              multiline
              placeholder="Bugün seni ne etkiledi?"
              placeholderTextColor={theme.color.ink40}
            />
          </StatBlock>

          <StatBlock label="Duygu geçmişin · son 30 gün">
            <MoodGrid days={moodDays} onAddMoodForDay={handleAddMoodForDay} />
          </StatBlock>

          <Pressable onPress={() => go(0)} style={styles.toStats}>
            <Text style={styles.toStatsText}>İstatistiklerine git →</Text>
          </Pressable>
        </ScrollView>
      </ScrollView>

      <WaitOverlay seconds={urgeLeft} onComplete={() => void finishUrge()} />
      <OffTrackSheet
        visible={offTrack}
        onClose={() => setOffTrack(false)}
        onPick={(id) => {
          setOffTrack(false);
          if (id === "goal") router.push("/(tabs)/journey");
          else router.push("/weekly-review");
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.mist },
  head: { paddingHorizontal: 18, zIndex: 2 },
  toprow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  pager: { flex: 1, zIndex: 1 },
  pane: { paddingHorizontal: 18, paddingTop: 2 },
  duo: { flexDirection: "row", gap: 14 },
  duoItem: { flex: 1, marginBottom: 9 },
  body: { fontFamily: theme.font.sans, fontSize: 12.5, color: theme.color.ink70, lineHeight: 19 },
  planEmpty: { paddingVertical: 28, paddingHorizontal: 20, marginTop: 8 },
  planEmptyTitle: {
    fontFamily: theme.font.sansBold,
    fontWeight: theme.font.weight.bold,
    fontSize: 20,
    letterSpacing: -0.4,
    color: theme.color.ink,
    marginBottom: 8,
  },
  planEmptyBody: {
    fontFamily: theme.font.sans,
    fontSize: 14,
    lineHeight: 22,
    color: theme.color.ink70,
  },
  sechead: { marginBottom: 9, marginTop: 8 },
  error: { color: theme.color.danger, fontFamily: theme.font.sans, fontSize: 13, marginBottom: 8 },
  add: {
    marginTop: 4,
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
  offtrack: {
    marginTop: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: theme.color.ink15,
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
  },
  offtrackText: { fontFamily: theme.font.sans, fontSize: 12.5, color: theme.color.ink40, textAlign: "center" },
  moods: { flexDirection: "row", gap: 6, marginTop: 4 },
  mo: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.color.ink15,
    backgroundColor: "rgba(255,255,255,0.4)",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  moOn: { backgroundColor: theme.color.blue, borderColor: theme.color.blue },
  moLabel: {
    fontFamily: theme.font.mono,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: theme.color.ink70,
    textAlign: "center",
  },
  moLabelOn: { color: "#fff" },
  reassure: {
    marginTop: 11,
    paddingLeft: 11,
    borderLeftWidth: 2,
    borderLeftColor: theme.color.blueLight,
    fontFamily: theme.font.sans,
    fontSize: 12.5,
    lineHeight: 19,
    color: theme.color.blueDeep,
  },
  textarea: {
    minHeight: 84,
    borderWidth: 1,
    borderColor: theme.color.ink15,
    backgroundColor: "rgba(255,255,255,0.55)",
    borderRadius: 12,
    padding: 11,
    fontFamily: theme.font.sans,
    fontSize: 14,
    color: theme.color.ink,
    textAlignVertical: "top",
  },
  toStats: {
    marginTop: 14,
    backgroundColor: "rgba(255,255,255,0.45)",
    borderWidth: 1,
    borderColor: theme.color.edge,
    borderRadius: 14,
    padding: 13,
    alignItems: "center",
  },
  toStatsText: {
    fontFamily: theme.font.sansSemibold,
    fontSize: 13,
    fontWeight: theme.font.weight.semibold,
    color: theme.color.blueDeep,
  },
  drawcard: {
    minHeight: 72,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.55)",
    borderWidth: 1,
    borderColor: theme.color.edge,
    padding: 14,
    justifyContent: "center",
  },
  drawText: {
    fontFamily: theme.font.sans,
    fontSize: 16,
    color: theme.color.ink,
    lineHeight: 24,
  },
  brow: { flexDirection: "row", gap: 8, marginTop: 10 },
  bsmY: {
    flex: 1,
    backgroundColor: theme.color.blue,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  bsmYText: { color: "#fff", fontFamily: theme.font.sansSemibold, fontWeight: theme.font.weight.semibold, fontSize: 13 },
  bsmYOff: { backgroundColor: "rgba(37,99,235,0.38)" },
  bsmN: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.5)",
    borderWidth: 1,
    borderColor: theme.color.ink15,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  bsmNText: { color: theme.color.ink70, fontFamily: theme.font.sansSemibold, fontWeight: theme.font.weight.semibold, fontSize: 13 },
  banner: { padding: 14, marginBottom: 10 },
  bannerTitle: {
    fontFamily: theme.font.sansBold,
    fontWeight: theme.font.weight.bold,
    fontSize: 14,
    color: theme.color.ink,
    marginBottom: 4,
  },
  pick: { flexDirection: "row", gap: 6 },
  pk: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.color.ink15,
    backgroundColor: "rgba(255,255,255,0.4)",
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
  },
  pkOn: { backgroundColor: theme.color.blue, borderColor: theme.color.blue },
  pkText: { fontFamily: theme.font.sansSemibold, fontSize: 12, color: theme.color.ink70, fontWeight: theme.font.weight.semibold },
  pkTextOn: { color: "#fff" },
  ghost: {
    marginBottom: 9,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: theme.color.blueLight,
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    backgroundColor: "rgba(37,99,235,0.06)",
  },
  ghostText: {
    fontFamily: theme.font.sansSemibold,
    fontWeight: theme.font.weight.semibold,
    fontSize: 13,
    color: theme.color.blueDeep,
  },
  urge: {
    marginTop: 10,
    backgroundColor: "rgba(37,99,235,0.1)",
    borderRadius: 14,
    padding: 13,
    alignItems: "center",
  },
  urgeText: {
    fontFamily: theme.font.sansSemibold,
    fontWeight: theme.font.weight.semibold,
    fontSize: 13.5,
    color: theme.color.blueDeep,
  },
  listen: { marginTop: 12, fontFamily: theme.font.mono, fontSize: 12, color: theme.color.danger },
  vq: {
    fontFamily: theme.font.sans,
    fontSize: 13,
    fontStyle: "italic",
    color: theme.color.ink70,
    lineHeight: 20,
    marginBottom: 10,
  },
  doneVoice: { fontFamily: theme.font.mono, fontSize: 12, color: theme.color.blueDeep, marginBottom: 8 },
});
