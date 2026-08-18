import { useEffect, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import Constants from "expo-constants";
import { Screen } from "@/components/ui/Screen";
import { PageHeader } from "@/components/ui/PageHeader";
import { Eyebrow, Glass } from "@/components/ui/Glass";
import { useAuth } from "@/context/AuthContext";
import { useMode } from "@/context/ModeContext";
import { useSubscription } from "@/hooks/useSubscription";
import { Switch } from "@/components/ui/Switch";
import {
  exportUserData,
  fetchActiveGoal,
  fetchActivePlan,
  fetchConsents,
  fetchMe,
  fetchMyAssets,
  fetchPlans,
  updateConsent,
} from "@/lib/api/yuvmi";
import type { GoalResponse, PlanResponse } from "@/lib/api/types";
import type { UserMode } from "@/lib/local";
import { alert } from "@/lib/alert";
import { hostedPrivacyUrl, hostedSupportUrl, openExternal } from "@/lib/links";
import { theme } from "@/theme";

/**
 * Both rows prefer a hosted page when one is configured and fall back to the
 * in-app screen otherwise, so the link resolves in every build — including the
 * one App Review installs before any page is published.
 */
function openPrivacy() {
  const hosted = hostedPrivacyUrl();
  if (hosted) {
    void openExternal(hosted);
    return;
  }
  router.push("/legal/privacy");
}

function openSupport() {
  const hosted = hostedSupportUrl();
  if (hosted) {
    void openExternal(hosted);
    return;
  }
  router.push("/legal/support");
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

/** Henüz bağlanmamış ayarların yanına konur — bkz. teknik denetim raporu, madde D1. */
function ComingSoonBadge() {
  return (
    <View style={styles.soonBadge}>
      <Text style={styles.soonBadgeText}>Yakında</Text>
    </View>
  );
}

function Kv({
  label,
  value,
  right,
  last,
  onPress,
}: {
  label: string;
  value?: string;
  right?: ReactNode;
  last?: boolean;
  onPress?: () => void;
}) {
  const inner = (
    <View style={[styles.kv, last && styles.kvLast]}>
      <Text style={styles.kvLabel}>{label}</Text>
      {right ?? <Text style={styles.kvValue}>{value}</Text>}
    </View>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}>
      {inner}
    </Pressable>
  ) : (
    inner
  );
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { mode, hard, setMode } = useMode();
  const { isPremium, loading: subLoading } = useSubscription();
  const [goal, setGoal] = useState<GoalResponse | null>(null);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [returns, setReturns] = useState(0);
  const [days, setDays] = useState(1);
  const [assetCount, setAssetCount] = useState(0);
  const [trainingConsent, setTrainingConsent] = useState(false);
  const [consentBusy, setConsentBusy] = useState(false);

  useEffect(() => {
    if (!user?.token) return;
    let mounted = true;
    void Promise.allSettled([
      fetchActiveGoal(),
      fetchActivePlan(),
      fetchPlans(),
      fetchMe(),
      fetchMyAssets(),
      fetchConsents(),
    ]).then(([g, p, pl, me, assets, consents]) => {
      if (!mounted) return;
      setTrainingConsent(
        consents.status === "fulfilled" &&
          consents.value.some((c) => c.scope === "ai_training_data" && c.granted),
      );
      setGoal(g.status === "fulfilled" ? g.value : null);
      setPlan(p.status === "fulfilled" ? p.value : null);
      setReturns(pl.status === "fulfilled" ? pl.value.filter((x) => x.status === "superseded").length : 0);
      if (me.status === "fulfilled") {
        const created = new Date(me.value.createdAt).getTime();
        setDays(Math.max(1, Math.ceil((Date.now() - created) / 86400000)));
      }
      setAssetCount(assets.status === "fulfilled" ? assets.value.length : 0);
    });
    return () => {
      mounted = false;
    };
  }, [user?.token]);

  function confirmMode(next: UserMode) {
    if (next === mode) return;
    const title = next === "hard" ? "Disiplin moduna geçilsin mi?" : "Nazik moda dönülsün mü?";
    const body =
      next === "hard"
        ? "Seri tutulur ve kaçırılan gün açıkça görünür. Minimum hâl seriyi sürdürür; ruh hâlin puan düşürmez. Verin aynı kalır."
        : "Seri gösterimi kapanır; yerine dolu gün ve geri dönüş sayısı gelir. Kaçırılan günler kayıt olarak durur, ama ceza gibi görünmez.";
    alert(title, body, [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Geç",
        onPress: () => void setMode(next),
      },
    ]);
  }

  async function handleExport() {
    if (!user?.token) return;
    try {
      const data = await exportUserData();
      alert("Dışa aktarma hazır", data.filename);
    } catch (e) {
      alert("Hata", e instanceof Error ? e.message : "Dışa aktarılamadı.");
    }
  }

  /**
   * Optimistic so the switch answers the tap immediately, and reverted on
   * failure so it never shows a permission the server did not record — the one
   * place in the app where a stale toggle would misstate what is allowed.
   */
  async function toggleTraining(next: boolean) {
    if (consentBusy) return;
    setConsentBusy(true);
    setTrainingConsent(next);
    try {
      await updateConsent("ai_training_data", next);
    } catch {
      setTrainingConsent(!next);
      alert("Kaydedilemedi", "İzin tercihin güncellenemedi. Bağlantını kontrol edip tekrar dene.");
    } finally {
      setConsentBusy(false);
    }
  }

  function handleSignOut() {
    alert("Çıkış yap", "Oturumunu kapatmak istediğine emin misin?", [
      { text: "Vazgeç", style: "cancel" },
      { text: "Çıkış yap", style: "destructive", onPress: () => void signOut() },
    ]);
  }

  if (!user) return null;

  const planLabel = subLoading ? "Yükleniyor…" : isPremium ? "Premium" : "Ücretsiz";
  const version = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <Screen tabBar>
      <PageHeader eyebrow="Hesap" eyebrowRight={planLabel} title="Profil" subtitle="Hesabını ve tercihlerini buradan yönet." />

      <Glass style={styles.identity}>
        <View style={styles.av}>
          <Text style={styles.avText}>{initials(user.displayName)}</Text>
        </View>
        <View>
          <Text style={styles.name}>{user.displayName}</Text>
          <Text style={styles.email}>{user.email}</Text>
        </View>
      </Glass>

      <Glass style={styles.stat}>
        <Eyebrow style={styles.lbl}>Kullanım modu</Eyebrow>
        <View style={styles.modes}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Nazik mod"
            accessibilityState={{ selected: !hard }}
            onPress={() => confirmMode("soft")}
            style={[styles.mode, !hard && styles.modeOn]}
          >
            <Text style={styles.modeTitle}>Nazik</Text>
            <Text style={styles.modeSub}>Seri yok, suçluluk yok. Geri dönüş başarı sayılır.</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Disiplin modu"
            accessibilityState={{ selected: hard }}
            onPress={() => confirmMode("hard")}
            style={[styles.mode, hard && styles.modeOn]}
          >
            <Text style={styles.modeTitle}>Disiplin</Text>
            <Text style={styles.modeSub}>Seri tutulur, kaçırılan gün açıkça görünür.</Text>
          </Pressable>
        </View>
        <Text style={styles.hint}>
          İstediğin zaman değiştirebilirsin — verin aynı kalır. Ruh hâlin hiçbir modda puan düşürmez. Disiplin
          modunda da kırmızı alarm veya suçlayıcı bildirim yoktur.
        </Text>
      </Glass>

      <Glass style={styles.stat}>
        <Eyebrow style={styles.lbl}>Zor zamanlar</Eyebrow>
        <Kv label="🚨 Hayatta kalma modu" last right={<ComingSoonBadge />} />
        <Text style={styles.hint}>
          Yakında: hastalık, yas veya burnout dönemlerinde planını duraklatabileceksin.
        </Text>
      </Glass>

      <Glass style={styles.stat}>
        <Eyebrow style={styles.lbl}>Benim Yuvmi&apos;m</Eyebrow>
        <Kv label="Hedef" value={goal?.title ?? "—"} />
        <Kv label="Yuvmi'deki günün" value={`${days}. gün`} />
        {!hard ? <Kv label="Geri dönüş" value={`${returns} kez`} /> : null}
        <Kv label="Plan sürümü" value={plan ? `v${plan.version}` : "—"} last />
      </Glass>

      <Glass style={styles.stat}>
        <Eyebrow style={styles.lbl}>Hatırlatmalar</Eyebrow>
        <Kv label="Sabah hatırlatması" right={<ComingSoonBadge />} />
        <Kv label="Akşam kapanışı" right={<ComingSoonBadge />} />
        <Kv label="Sessiz hafta" last right={<ComingSoonBadge />} />
        <Text style={styles.hint}>
          Yakında: hatırlatma saatlerini ve sessiz hafta ayarını buradan yönetebileceksin.
        </Text>
      </Glass>

      <Glass style={styles.stat}>
        <Eyebrow style={styles.lbl}>Yapay zekâ</Eyebrow>
        <Kv
          label="Önerileri geliştirmeye katkıda bulun"
          last
          right={
            <Switch
              value={trainingConsent}
              disabled={consentBusy}
              onChange={(next) => void toggleTraining(next)}
            />
          }
        />
        <Text style={styles.hint}>
          Açarsan yapay zekânın sana sunduğu öneriler ve senin bu önerilere verdiğin karar
          (kabul, düzenleme, ret) saklanır ve Yuvmi&apos;yi geliştirmek için kullanılır.
          Kapattığında şimdiye kadar toplananlar da silinir. Öneri üretimi bu ayardan
          bağımsız çalışır.
        </Text>
      </Glass>

      <Glass style={styles.stat}>
        <Eyebrow style={styles.lbl}>Görünüm ve gizlilik</Eyebrow>
        <Kv label="Karanlık mod" right={<ComingSoonBadge />} />
        <Kv label="Uygulama kilidi" last right={<ComingSoonBadge />} />
      </Glass>

      <Glass style={styles.stat}>
        <Eyebrow style={styles.lbl}>Veriler</Eyebrow>
        <Kv label="Verilerimi dışa aktar" value="JSON / ZIP" onPress={() => void handleExport()} />
        <Kv label="Arşiv" value={`${assetCount} öğe`} onPress={() => router.push("/archive")} />
        <Kv
          label="Premium & abonelik"
          value={isPremium ? "Yıllık" : "Ücretsiz"}
          last
          onPress={() => router.push("/premium")}
        />
      </Glass>

      <Glass style={styles.stat}>
        <Eyebrow style={styles.lbl}>Destek</Eyebrow>
        <Kv label="Yardım ve geri bildirim" value="›" onPress={openSupport} />
        <Kv label="Gizlilik politikası" value="›" onPress={openPrivacy} />
        <Kv label="Sürüm" value={`${version} · v8`} last />
      </Glass>

      <Glass style={styles.signout}>
        <Pressable accessibilityRole="button" accessibilityLabel="Çıkış yap" onPress={handleSignOut} style={styles.center}>
          <Text style={styles.kvLabel}>Çıkış yap</Text>
        </Pressable>
      </Glass>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Hesabı sil"
        onPress={() => router.push("/settings/delete-account")}
      >
        <Text style={styles.danger}>Hesabı sil</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: {
    paddingVertical: 15,
    paddingHorizontal: 16,
    marginBottom: 9,
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
  },
  av: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.color.blue,
    alignItems: "center",
    justifyContent: "center",
    ...theme.shadow.blue,
  },
  avText: {
    color: "#fff",
    fontFamily: theme.font.sansBold,
    fontSize: 18,
    fontWeight: theme.font.weight.bold,
  },
  name: {
    fontFamily: theme.font.sansBold,
    fontSize: 17,
    fontWeight: theme.font.weight.bold,
    color: theme.color.ink,
  },
  email: {
    fontFamily: theme.font.sans,
    fontSize: 12.5,
    color: theme.color.ink70,
    marginTop: 2,
  },
  stat: {
    paddingHorizontal: 16,
    paddingVertical: 15,
    marginBottom: 9,
  },
  lbl: { marginBottom: 8 },
  modes: { gap: 8 },
  mode: {
    borderWidth: 1,
    borderColor: theme.color.ink15,
    backgroundColor: "rgba(255,255,255,0.45)",
    borderRadius: 14,
    padding: 12,
  },
  modeOn: {
    borderColor: theme.color.blue,
    backgroundColor: "rgba(37,99,235,0.12)",
  },
  modeTitle: {
    fontFamily: theme.font.sansBold,
    fontWeight: theme.font.weight.bold,
    fontSize: 15,
    color: theme.color.ink,
  },
  modeSub: {
    marginTop: 4,
    fontFamily: theme.font.sans,
    fontSize: 12,
    color: theme.color.ink70,
    lineHeight: 17,
  },
  kv: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(11,18,32,0.09)",
    gap: 12,
  },
  kvLast: { borderBottomWidth: 0 },
  kvLabel: {
    fontFamily: theme.font.sansSemibold,
    fontSize: 14,
    fontWeight: theme.font.weight.semibold,
    color: theme.color.ink,
    flex: 1,
  },
  kvValue: {
    fontFamily: theme.font.mono,
    fontSize: 12.5,
    color: theme.color.ink70,
  },
  hint: {
    marginTop: 10,
    fontFamily: theme.font.sans,
    fontSize: 11.5,
    color: theme.color.ink70,
    lineHeight: 16,
  },
  soonBadge: {
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: "rgba(11,18,32,0.06)",
    borderWidth: 1,
    borderColor: theme.color.ink15,
  },
  soonBadgeText: {
    fontFamily: theme.font.mono,
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: theme.color.ink40,
  },
  signout: { paddingVertical: 6, paddingHorizontal: 16 },
  center: { paddingVertical: 12, alignItems: "center" },
  danger: {
    color: theme.color.danger,
    textAlign: "center",
    paddingVertical: 14,
    fontFamily: theme.font.sansSemibold,
    fontSize: 14,
    fontWeight: theme.font.weight.semibold,
  },
});
