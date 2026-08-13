import { useEffect, useState, type ReactNode } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import Constants from "expo-constants";
import { Screen } from "@/components/ui/Screen";
import { PageHeader } from "@/components/ui/PageHeader";
import { Eyebrow, Glass } from "@/components/ui/Glass";
import { Switch } from "@/components/ui/Switch";
import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { exportUserData, fetchActiveGoal, fetchActivePlan, fetchMe, fetchMyAssets, fetchPlans } from "@/lib/api/yuvmi";
import type { GoalResponse, PlanResponse } from "@/lib/api/types";
import { loadPrefs, savePrefs, type AppPrefs } from "@/lib/local";
import { theme } from "@/theme";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
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
  return onPress ? <Pressable onPress={onPress}>{inner}</Pressable> : inner;
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { isPremium, loading: subLoading } = useSubscription();
  const [goal, setGoal] = useState<GoalResponse | null>(null);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [returns, setReturns] = useState(0);
  const [days, setDays] = useState(1);
  const [assetCount, setAssetCount] = useState(0);
  const [prefs, setPrefs] = useState<AppPrefs | null>(null);

  useEffect(() => {
    if (!user?.token) return;
    void loadPrefs().then(setPrefs);
    Promise.allSettled([
      fetchActiveGoal(user.token),
      fetchActivePlan(user.token),
      fetchPlans(user.token),
      fetchMe(user.token),
      fetchMyAssets(user.token),
    ]).then(([g, p, pl, me, assets]) => {
      setGoal(g.status === "fulfilled" ? g.value : null);
      setPlan(p.status === "fulfilled" ? p.value : null);
      setReturns(pl.status === "fulfilled" ? pl.value.filter((x) => x.status === "superseded").length : 0);
      if (me.status === "fulfilled") {
        const created = new Date(me.value.createdAt).getTime();
        setDays(Math.max(1, Math.ceil((Date.now() - created) / 86400000)));
      }
      setAssetCount(assets.status === "fulfilled" ? assets.value.length : 0);
    });
  }, [user?.token]);

  function patchPrefs(next: Partial<AppPrefs>) {
    if (!prefs) return;
    const merged = { ...prefs, ...next };
    setPrefs(merged);
    void savePrefs(merged);
  }

  async function handleExport() {
    if (!user?.token) return;
    try {
      const data = await exportUserData(user.token);
      Alert.alert("Dışa aktarma hazır", data.filename);
    } catch (e) {
      Alert.alert("Hata", e instanceof Error ? e.message : "Dışa aktarılamadı.");
    }
  }

  function handleSignOut() {
    Alert.alert("Çıkış yap", "Oturumunu kapatmak istediğine emin misin?", [
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
        <Eyebrow style={styles.lbl}>Benim Yuvmi'm</Eyebrow>
        <Kv label="Hedef" value={goal?.title ?? "—"} />
        <Kv label="Yuvmi'deki günün" value={`${days}. gün`} />
        <Kv label="Geri dönüş" value={`${returns} kez`} />
        <Kv label="Plan sürümü" value={plan ? `v${plan.version}` : "—"} last />
      </Glass>

      <Glass style={styles.stat}>
        <Eyebrow style={styles.lbl}>Hatırlatmalar</Eyebrow>
        <Kv label="Sabah hatırlatması" value={prefs?.morningReminder ?? "08:00"} />
        <Kv label="Akşam kapanışı" value={prefs?.eveningReminder ?? "21:30"} />
        <Kv
          label="Sessiz hafta"
          last
          right={<Switch value={Boolean(prefs?.quietWeek)} onChange={(v) => patchPrefs({ quietWeek: v })} />}
        />
        <Text style={styles.hint}>Sessiz hafta açıkken bildirim gelmez, ritmin de bozulmuş sayılmaz.</Text>
      </Glass>

      <Glass style={styles.stat}>
        <Eyebrow style={styles.lbl}>Görünüm ve gizlilik</Eyebrow>
        <Kv
          label="Karanlık mod"
          right={<Switch value={Boolean(prefs?.darkMode)} onChange={(v) => patchPrefs({ darkMode: v })} />}
        />
        <Kv
          label="Uygulama kilidi"
          right={<Switch value={prefs ? prefs.appLock : true} onChange={(v) => patchPrefs({ appLock: v })} />}
        />
        <Kv label="Ana ekran widget'ı" value="açık" />
        <Kv label="Dil" value="Türkçe" last />
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
        <Kv
          label="Yardım ve geri bildirim"
          value="›"
          onPress={() => Alert.alert("Yardım", "Geri bildirimin için teşekkürler — yakında burada olacak.")}
        />
        <Kv
          label="Gizlilik politikası"
          value="›"
          onPress={() => Alert.alert("Gizlilik", "Verilerin varsayılan olarak özeldir.")}
        />
        <Kv label="Sürüm" value={version} last />
      </Glass>

      <Glass style={styles.signout}>
        <Pressable onPress={handleSignOut} style={styles.center}>
          <Text style={styles.kvLabel}>Çıkış yap</Text>
        </Pressable>
      </Glass>
      <Pressable onPress={() => router.push("/settings/delete-account")}>
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
    color: theme.color.ink40,
    marginTop: 2,
  },
  stat: {
    paddingHorizontal: 16,
    paddingVertical: 15,
    marginBottom: 9,
  },
  lbl: {
    marginBottom: 4,
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
  kvLast: {
    borderBottomWidth: 0,
  },
  kvLabel: {
    fontFamily: theme.font.sansSemibold,
    fontSize: 14,
    fontWeight: theme.font.weight.semibold,
    color: theme.color.ink,
  },
  kvValue: {
    fontFamily: theme.font.mono,
    fontSize: 12.5,
    letterSpacing: 0,
    textTransform: "none",
    color: theme.color.ink40,
  },
  hint: {
    marginTop: 10,
    fontFamily: theme.font.sans,
    fontSize: 11.5,
    color: theme.color.ink40,
    lineHeight: 16,
  },
  signout: {
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  center: {
    paddingVertical: 12,
    alignItems: "center",
  },
  danger: {
    color: theme.color.danger,
    textAlign: "center",
    paddingVertical: 14,
    fontFamily: theme.font.sansSemibold,
    fontSize: 14,
    fontWeight: theme.font.weight.semibold,
  },
});
