import { useCallback, useRef, useState } from "react";
import {
  Pressable,
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
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { AmbientBackground, Eyebrow, Glass } from "@/components/ui/Glass";
import { TapRow } from "@/components/ui/TapRow";
import { SegmentBar } from "@/components/today/SegmentBar";
import { BenTab } from "@/components/journey/BenTab";
import { useAuth } from "@/context/AuthContext";
import { useMode } from "@/context/ModeContext";
import {
  fetchActiveGoal,
  fetchActivePlan,
  fetchFutureSelf,
  fetchPlans,
  fetchTodayAlignment,
  recordWaveSurvived,
} from "@/lib/api/yuvmi";
import type { AlignmentResponse, FutureSelfResponse, GoalResponse, PlanResponse } from "@/lib/api/types";
import {
  loadSelfProfile,
  loadWaves,
  saveWaves,
  type SelfProfile,
  type WaveItem,
} from "@/lib/local";
import { shortStamp } from "@/lib/formatDate";
import { alert } from "@/lib/alert";
import { theme } from "@/theme";

/** Geçmiş · Ben · Gelecek — soldan sağa bir zaman ekseni, ortası kullanıcının kendisi. */
const JSEGS = ["Geçmiş", "Ben", "Gelecek"] as const;

/** Uygulama Yolculuk'ta açılıyor (app/index.tsx) ve ortadaki Ben sekmesinde başlıyor. */
const SEG_BEN = 1;

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
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pagerRef = useRef<ScrollView>(null);
  const didInitPager = useRef(false);
  const { user } = useAuth();
  const { patchPrefs } = useMode();
  const [seg, setSeg] = useState(SEG_BEN);
  const [goal, setGoal] = useState<GoalResponse | null>(null);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [plans, setPlans] = useState<PlanResponse[]>([]);
  const [alignment, setAlignment] = useState<AlignmentResponse | null>(null);
  const [futureSelf, setFutureSelf] = useState<FutureSelfResponse | null>(null);
  const [waves, setWaves] = useState<WaveItem[]>([]);
  const [self, setSelf] = useState<SelfProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [bubbleOpen, setBubbleOpen] = useState(false);
  const [adaptiveDone, setAdaptiveDone] = useState(false);
  const [newWave, setNewWave] = useState("");

  useFocusEffect(
    useCallback(() => {
      if (!user?.token) {
        setLoading(false);
        return;
      }
      void Promise.allSettled([
        fetchActiveGoal(),
        fetchActivePlan(),
        fetchPlans(),
        fetchTodayAlignment(),
        fetchFutureSelf(),
        loadWaves(),
        loadSelfProfile(),
      ]).then(([g, p, pl, a, fs, w, sp]) => {
        setGoal(g.status === "fulfilled" ? g.value : null);
        setPlan(p.status === "fulfilled" ? p.value : null);
        setPlans(pl.status === "fulfilled" ? pl.value : []);
        setAlignment(a.status === "fulfilled" ? a.value : null);
        setFutureSelf(fs.status === "fulfilled" ? fs.value : null);
        setWaves(w.status === "fulfilled" ? w.value : []);
        setSelf(sp.status === "fulfilled" ? sp.value : { motto: "", bubbles: [] });
        setLoading(false);
      });
    }, [user?.token]),
  );

  const go = (i: number) => {
    const next = Math.max(0, Math.min(JSEGS.length - 1, i));
    setSeg(next);
    pagerRef.current?.scrollTo({ x: next * width, animated: true });
  };

  const onPagerScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / Math.max(width, 1));
    if (i !== seg && i >= 0 && i < JSEGS.length) setSeg(i);
  };

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

  if (loading) return <LoadingScreen />;

  const health = healthCopy(alignment);
  const quote = futureSelf?.description || futureSelf?.title || "Vizyon cümlen burada görünecek.";
  const paneBottom = 120 + insets.bottom;

  return (
    <View style={styles.root}>
      <AmbientBackground />
      <View style={[styles.head, { paddingTop: insets.top + 12 }]}>
        <PageHeader
          eyebrow={goal?.title ?? "Yolculuk"}
          eyebrowRight={plan ? `Plan v${plan.version}` : "Plan yok"}
          title="Yolculuk"
          subtitle="Nereden geldin, kimsin, nereye gidiyorsun."
        />
        <SegmentBar index={seg} onChange={go} labels={JSEGS} style={{ marginTop: -4, marginBottom: 8 }} />
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
          pagerRef.current?.scrollTo({ x: SEG_BEN * width, animated: false });
        }}
        style={styles.pager}
      >
        <ScrollView
          style={{ width }}
          contentContainerStyle={[styles.pane, { paddingBottom: paneBottom }]}
          showsVerticalScrollIndicator={false}
        >
          <Glass style={styles.stat}>
            <Eyebrow style={styles.lbl}>Plan sağlığı</Eyebrow>
            <Text style={styles.healthBig}>{health.title}</Text>
            <Text style={styles.body}>{health.body}</Text>
            <Text style={[styles.body, styles.forecast]}>{health.forecast}</Text>
          </Glass>

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
                    alert("Not alındı", "Gerçek sürümde yeni plan üretilir — geçmiş korunur.");
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
          <TapRow
            title="Haftalık değerlendirme"
            subtitle="Bu haftanın ritmi, örüntüler ve plan önerisi"
            onPress={() => router.push("/weekly-review")}
          />

          {/* Dalgalar geçici olarak burada duruyor. "Bırakmak istediklerim" için
              ayrı bir tasarım bekleniyor; o gelince blok olduğu gibi taşınacak.
              Buraya park edilmesinin tek sebebi Plan sekmesi kalkarken
              kullanıcının sayaçlarına erişimini kaybetmemesi. */}
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
        </ScrollView>

        <ScrollView
          style={{ width }}
          contentContainerStyle={[styles.pane, { paddingBottom: paneBottom }]}
          showsVerticalScrollIndicator={false}
        >
          {self ? <BenTab displayName={user?.displayName ?? ""} profile={self} onChange={setSelf} /> : null}
        </ScrollView>

        <ScrollView
          style={{ width }}
          contentContainerStyle={[styles.pane, { paddingBottom: paneBottom }]}
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={bubbleOpen ? "Vizyon cümlesini küçült" : "Vizyon cümlesini büyüt"}
            onPress={() => setBubbleOpen((v) => !v)}
          >
            <Glass style={[styles.bubble, bubbleOpen && styles.bubbleExp]}>
              <Eyebrow style={styles.lbl}>Gelecekteki ben</Eyebrow>
              <Text style={[styles.quote, bubbleOpen && styles.quoteExp]}>“{quote}”</Text>
              <Text style={styles.hint}>{bubbleOpen ? "Küçültmek için dokun" : "Büyütmek için dokun"}</Text>
            </Glass>
          </Pressable>

          <Eyebrow style={styles.sec}>Canlandır</Eyebrow>
          <TapRow
            title="🖼️ Vizyon panosu"
            subtitle="Gelecekteki benliğini yansıtan pano duvarı"
            onPress={() => router.push("/vision/board" as Href)}
          />
          <TapRow
            title="💬 Olumlamalar"
            subtitle="Kendine söylediklerin"
            onPress={() => router.push("/vision/affirmations" as Href)}
          />
          <TapRow
            title="✉️ Mektup kutusu"
            subtitle="Yaz, mühürle, gelecekteki bir tarihte aç"
            onPress={() => router.push("/vision/letter" as Href)}
          />
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.mist },
  head: { paddingHorizontal: 18, zIndex: 2 },
  pager: { flex: 1, zIndex: 1 },
  pane: { paddingHorizontal: 18, paddingTop: 2 },
  bubble: { paddingVertical: 22, paddingHorizontal: 19, marginBottom: 11 },
  bubbleExp: { paddingVertical: 34, paddingHorizontal: 22 },
  quote: {
    fontFamily: theme.font.sans,
    fontSize: 17,
    fontWeight: theme.font.weight.regular,
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
});
