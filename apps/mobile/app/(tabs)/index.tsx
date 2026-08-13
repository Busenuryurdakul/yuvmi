import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
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
import { IntentionCard, type IntentionState } from "@/components/today/IntentionCard";
import { OffTrackSheet } from "@/components/today/OffTrackSheet";
import { RhythmStrip, type RhythmTick } from "@/components/today/RhythmStrip";
import { SegmentBar } from "@/components/today/SegmentBar";
import { MoodGrid } from "@/components/today/MoodGrid";
import { BarRow, BigStat, StatBlock } from "@/components/today/StatBlock";
import { useAuth } from "@/context/AuthContext";
import { useTodayDashboard } from "@/hooks/useTodayDashboard";
import { completeTask, skipTask, upsertCheckin } from "@/lib/api/yuvmi";
import { longDate, toDateKey } from "@/lib/formatDate";
import {
  loadIntentionLog,
  loadMoodHistory,
  moodFromCheckin,
  moodFromScore,
  saveIntentionPick,
  saveMoodDay,
  type MoodLevel,
} from "@/lib/local";
import { theme } from "@/theme";

const MOODS = [
  { label: "Ağır", value: 1 },
  { label: "İdare eder", value: 2 },
  { label: "İyi", value: 4 },
  { label: "Enerjik", value: 5 },
] as const;

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

function AffirmationLead({ text }: { text: string }) {
  const needle = "bir adım";
  const lower = text.toLocaleLowerCase("tr");
  const i = lower.indexOf(needle);
  if (i < 0) return <Text style={styles.lead}>{text}</Text>;
  return (
    <Text style={styles.lead}>
      {text.slice(0, i)}
      <Text style={styles.leadEm}>{text.slice(i, i + needle.length)}</Text>
      {text.slice(i + needle.length)}
    </Text>
  );
}

function shortLabel(title: string) {
  return title.length > 16 ? `${title.slice(0, 14)}…` : title;
}

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pagerRef = useRef<ScrollView>(null);
  const { user } = useAuth();
  const { checkin, task, history, plan, futureSelf, plans, loading, error, refresh, setCheckin, setTask } =
    useTodayDashboard();

  const [seg, setSeg] = useState(1);
  const [picks, setPicks] = useState<Record<string, IntentionState>>({});
  const [offTrack, setOffTrack] = useState(false);
  const [savingMood, setSavingMood] = useState(false);
  const [note, setNote] = useState("");
  const [moodDays, setMoodDays] = useState<MoodLevel[]>(Array(30).fill(0));
  const [stepRates, setStepRates] = useState<Record<string, number>>({});
  const didInitPager = useRef(false);

  useFocusEffect(
    useCallback(() => {
      void refresh();
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

  const intentions = useMemo(() => {
    if (plan?.steps.length) return plan.steps;
    if (task) {
      return [{ id: task.id, dayOffset: 0, title: task.title, description: task.description, sortOrder: 0 }];
    }
    return [];
  }, [plan, task]);

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
  const returns = plans.filter((p) => p.status === "superseded").length;
  const affirmation = futureSelf?.affirmations[0] || "Her gün kendim için bir adım atıyorum.";

  const moodCounts = useMemo(() => {
    const c = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const m of moodDays) {
      if (m === 1) c[1] += 1;
      if (m === 2) c[2] += 1;
      if (m === 3) c[3] += 1;
      if (m === 4) c[4] += 1;
    }
    return c;
  }, [moodDays]);
  const moodTotal = Math.max(1, moodCounts[1] + moodCounts[2] + moodCounts[3] + moodCounts[4]);

  const go = (i: number) => {
    const next = Math.max(0, Math.min(2, i));
    setSeg(next);
    pagerRef.current?.scrollTo({ x: next * width, animated: true });
  };

  const onPagerScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== seg) setSeg(i);
  };

  async function handlePick(stepId: string, title: string, next?: IntentionState) {
    setPicks((prev) => {
      const copy = { ...prev };
      if (!next) delete copy[stepId];
      else copy[stepId] = next;
      return copy;
    });
    await saveIntentionPick(stepId, toDateKey(new Date()), next);
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
        reflection: note || (already ? (checkin?.reflection ?? "") : label === "Ağır" ? "Ağır bir gün." : note),
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

  if (loading && !task && !plan && !checkin) return <LoadingScreen />;

  const moodOn = checkin ? MOODS.find((m) => m.value === checkin.mood)?.label : undefined;
  const paneBottom = 120 + insets.bottom;
  const refreshControl = (
    <RefreshControl refreshing={loading} onRefresh={() => void refresh()} tintColor={theme.color.blue} />
  );

  return (
    <View style={styles.root}>
      <AmbientBackground />
      <View style={[styles.head, { paddingTop: insets.top + 12 }]}>
        <View style={styles.toprow}>
          <Eyebrow>{longDate()}</Eyebrow>
          <Eyebrow>{plan ? `Plan v${plan.version}` : "Bugün"}</Eyebrow>
        </View>
        <SegmentBar index={seg} onChange={go} />
      </View>

      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onPagerScroll}
        onLayout={() => {
          if (didInitPager.current) return;
          didInitPager.current = true;
          pagerRef.current?.scrollTo({ x: width, animated: false });
        }}
        style={styles.pager}
      >
        <ScrollView
          style={{ width }}
          contentContainerStyle={[styles.pane, { paddingBottom: paneBottom }]}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
        >
          <StatBlock label="Ritim · son 14 gün">
            <RhythmStrip ticks={ticks} />
          </StatBlock>
          <View style={styles.duo}>
            <StatBlock label="Dolu gün" style={styles.duoItem}>
              <BigStat value={fullDays} suffix="/14" />
            </StatBlock>
            <StatBlock label="Geri dönüş" style={styles.duoItem}>
              <BigStat value={returns} suffix="kez" />
            </StatBlock>
          </View>
          <StatBlock label="Niyet bazında">
            {intentions.length === 0 ? (
              <Text style={styles.body}>Henüz niyet yok.</Text>
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
          </StatBlock>
          <StatBlock label="Ruh hâli · son 30 gün">
            <MoodGrid days={moodDays} />
            <Text style={[styles.body, styles.insight]}>
              İyi hissettiğin günlerde adımlarını tamamlama oranın belirgin şekilde yükseliyor.
            </Text>
          </StatBlock>
          <Button label="Haftalık değerlendirmeyi aç" onPress={() => router.push("/weekly-review")} />
        </ScrollView>

        <ScrollView
          style={{ width }}
          contentContainerStyle={[styles.pane, { paddingBottom: paneBottom }]}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
        >
          <Glass style={styles.hero}>
            <AffirmationLead text={affirmation.endsWith(".") ? affirmation : `${affirmation}.`} />
          </Glass>
          <Eyebrow style={styles.sechead}>Bugünün niyetleri · {intentions.length}</Eyebrow>
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
              <IntentionCard
                key={step.id}
                title={step.title}
                anchor={step.description || undefined}
                protected={Boolean(linked && yesterdayMissed && task?.status === "pending")}
                protectHint="Dün olmadı. Küçük hâli yeter — en küçük adım da sayılır."
                value={fromTask}
                onChange={(v) => void handlePick(step.id, step.title, v)}
              />
            );
          })}
          <Pressable onPress={() => router.push("/intention/new" as Href)} style={styles.add}>
            <Text style={styles.addText}>+ Niyet ekle</Text>
          </Pressable>
          <Pressable onPress={() => setOffTrack(true)} style={styles.offtrack}>
            <Text style={styles.offtrackText}>Yoldan çıktım — planı gözden geçir</Text>
          </Pressable>
        </ScrollView>

        <ScrollView
          style={{ width }}
          contentContainerStyle={[styles.pane, { paddingBottom: paneBottom }]}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
        >
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
            {moodOn === "Ağır" ? (
              <Text style={styles.reassure}>
                Not aldım. Ağır bir gün planına zarar vermez — ritmin olduğu yerde duruyor.
              </Text>
            ) : null}
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
            <MoodGrid days={moodDays} />
            <View style={styles.legend}>
              <Eyebrow style={styles.legItem}>■ Ağır</Eyebrow>
              <Text style={[styles.legItem, { color: theme.color.blueLight }]}>■ İyi</Text>
              <Text style={[styles.legItem, { color: theme.color.blueDeep }]}>■ Enerjik</Text>
            </View>
          </StatBlock>
          <StatBlock label="Bu ay">
            <BarRow label="Enerjik" ratio={moodCounts[4] / moodTotal} value={String(moodCounts[4])} />
            <BarRow label="İyi" ratio={moodCounts[3] / moodTotal} value={String(moodCounts[3])} />
            <BarRow label="İdare eder" ratio={moodCounts[2] / moodTotal} value={String(moodCounts[2])} />
            <BarRow label="Ağır" ratio={moodCounts[1] / moodTotal} value={String(moodCounts[1])} />
          </StatBlock>
          <Pressable onPress={() => go(0)} style={styles.toStats}>
            <Text style={styles.toStatsText}>↑ İstatistiklerin tamamına git</Text>
          </Pressable>
        </ScrollView>
      </ScrollView>

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
  root: {
    flex: 1,
    backgroundColor: theme.color.mist,
  },
  head: {
    paddingHorizontal: 18,
    zIndex: 2,
  },
  toprow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  pager: {
    flex: 1,
    zIndex: 1,
  },
  pane: {
    paddingHorizontal: 18,
    paddingTop: 2,
  },
  duo: {
    flexDirection: "row",
    gap: 9,
  },
  duoItem: {
    flex: 1,
    marginBottom: 9,
  },
  body: {
    fontFamily: theme.font.sans,
    fontSize: 12.5,
    color: theme.color.ink70,
    lineHeight: 19,
  },
  insight: {
    marginTop: 11,
  },
  hero: {
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  lead: {
    fontFamily: theme.font.sansExtra,
    fontSize: 22,
    lineHeight: 27,
    fontWeight: theme.font.weight.extra,
    letterSpacing: -0.4,
    color: theme.color.ink,
    maxWidth: 280,
  },
  leadEm: {
    color: theme.color.blue,
  },
  sechead: {
    marginBottom: 9,
  },
  error: {
    color: theme.color.danger,
    fontFamily: theme.font.sans,
    fontSize: 13,
    marginBottom: 8,
  },
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
  offtrackText: {
    fontFamily: theme.font.sans,
    fontSize: 12.5,
    color: theme.color.ink40,
  },
  moods: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  mo: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.color.ink15,
    backgroundColor: "rgba(255,255,255,0.4)",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  moOn: {
    backgroundColor: theme.color.ink,
    borderColor: theme.color.ink,
  },
  moLabel: {
    fontFamily: theme.font.mono,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: theme.color.ink70,
    textAlign: "center",
  },
  moLabelOn: {
    color: "#fff",
  },
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
  legend: {
    flexDirection: "row",
    gap: 12,
    marginTop: 11,
    flexWrap: "wrap",
  },
  legItem: {
    fontFamily: theme.font.mono,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: theme.color.ink40,
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
});
