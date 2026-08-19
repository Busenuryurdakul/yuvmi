import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { SubpageScreen } from "@/components/ui/SubpageScreen";
import { useMode } from "@/context/ModeContext";
import { addShopFind, loadShopInventory, shopItemKey, type ShopTab } from "@/lib/local";
import { spendPearls } from "@/lib/api/yuvmi";
import { alert } from "@/lib/alert";
import { theme } from "@/theme";

type ShopItem = { emoji: string; name: string; cost: number };

const SHOP: Record<string, ShopItem[]> = {
  garden: [
    { emoji: "🪸", name: "Kızıl mercan dalı", cost: 6 },
    { emoji: "🤿", name: "Eski dalgıç maskesi", cost: 10 },
    { emoji: "🎣", name: "Paslı olta", cost: 8 },
    { emoji: "🪔", name: "Derin deniz feneri", cost: 12 },
    { emoji: "🛟", name: "Can simidi", cost: 9 },
    { emoji: "🏴‍☠️", name: "Korsan bayrağı", cost: 14 },
    { emoji: "🧽", name: "Deniz süngeri", cost: 5 },
    { emoji: "👓", name: "Kayıp gözlük", cost: 7 },
  ],
  seal: [
    { emoji: "🦈", name: "Köpekbalığı mührü", cost: 9 },
    { emoji: "🦭", name: "Ayı balığı mührü", cost: 8 },
    { emoji: "🔱", name: "Trident mührü", cost: 11 },
    { emoji: "⚜️", name: "Amiral mührü", cost: 9 },
    { emoji: "🐚", name: "Deniz kabuğu mührü", cost: 6 },
    { emoji: "⚓️", name: "Çapa mührü", cost: 10 },
  ],
  sound: [
    { emoji: "🐋", name: "Balina şarkıları", cost: 10 },
    { emoji: "🌊", name: "Kıyı dalgaları", cost: 12 },
    { emoji: "🐬", name: "Yunus cıvıltıları", cost: 9 },
    { emoji: "🌬️", name: "Rüzgar fısıltısı", cost: 7 },
    { emoji: "🌙", name: "Gece med-cezri", cost: 8 },
    { emoji: "🕳️", name: "Derin uçurum yankısı", cost: 13 },
  ],
};

const TABS: { key: ShopTab; label: string }[] = [
  { key: "garden", label: "Mercan" },
  { key: "seal", label: "Mühür" },
  { key: "sound", label: "Ambiyans" },
];

export default function ShopScreen() {
  const { prefs, patchPrefs } = useMode();
  const tohum = prefs?.tohum ?? 48; // Treated as İnci balance
  const [tab, setTab] = useState<ShopTab>("garden");
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [buying, setBuying] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void loadShopInventory().then((items) => {
        setOwned(new Set(items.map((item) => shopItemKey(item.tab, item.name))));
      });
    }, []),
  );

  async function buy(item: ShopItem) {
    const key = shopItemKey(tab, item.name);
    if (owned.has(key) || buying) return;
    if (tohum < item.cost) {
      alert("Biraz daha İnci lazım", `${item.cost - tohum} İnci eksik. Aceleye gerek yok.`);
      return;
    }

    // The spend has to go through the server: the balance lives in the backend
    // ledger, and the Atölye screen refetches it on focus. A purely local
    // deduction looked like it worked and then silently reappeared on the way
    // back — the balance snapped straight back to where it started.
    setBuying(key);
    try {
      const res = await spendPearls(item.name, item.cost);
      await patchPrefs({ tohum: res.balance });
      if (!res.spent) {
        alert("Biraz daha İnci lazım", `${item.name} için yeterli İnci yok. Aceleye gerek yok.`);
        return;
      }
    } catch {
      alert("Satın alınamadı", "Bağlantı kurulamadı. Biraz sonra tekrar dene.");
      return;
    } finally {
      setBuying(null);
    }

    await addShopFind({
      tab,
      name: item.name,
      emoji: item.emoji,
      boughtAt: new Date().toISOString(),
    });
    setOwned((prev) => new Set(prev).add(key));

    if (tab === "garden") {
      alert(`${item.name} bahçede`, "Mercan Bahçesi’ndeki boş parsele düştü. Planına etkisi yok — süs.", [
        { text: "Bahçeye git", onPress: () => router.push("/atolye/garden") },
        { text: "Tamam", style: "cancel" },
      ]);
      return;
    }
    if (tab === "seal") {
      alert(`${item.name} alındı`, "Mektup yazarken mühür olarak seçebilirsin.", [
        { text: "Mektup kutusu", onPress: () => router.push("/vision/letter") },
        { text: "Tamam", style: "cancel" },
      ]);
      return;
    }
    alert(`${item.name} alındı`, "Odak dalışında bu ambiyansı seçebilirsin.", [
      { text: "Dalışa git", onPress: () => router.push("/atolye/focus") },
      { text: "Tamam", style: "cancel" },
    ]);
  }

  const items = SHOP[tab] ?? [];

  return (
    <SubpageScreen title="Kıyıya Vuranlar (Dükkân)" right={`🫧 ${tohum}`}>
      <Text style={styles.sub}>
        Mercanlar bahçeye, mühürler mektuba, ambiyans dalışa gider. Hepsi süs — plana etkisi yok.
      </Text>

      <View style={styles.tabs}>
        {TABS.map((t) => (
          <Pressable
            key={t.key}
            style={[styles.pk, tab === t.key && styles.pkOn]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.pkText, tab === t.key && styles.pkTextOn]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.grid}>
        {items.map((item) => {
          const key = `${tab}:${item.name}`;
          const has = owned.has(key);
          const pending = buying === key;
          return (
            <Pressable
              key={key}
              style={[styles.sitem, (has || pending) && styles.sitemOwned]}
              onPress={() => void buy(item)}
              disabled={has || buying !== null}
            >
              <Text style={styles.ic}>{item.emoji}</Text>
              <Text style={styles.sitemTitle}>{item.name}</Text>
              <Text style={styles.sitemCost}>
                {has ? "alındı ✓" : pending ? "alınıyor…" : `🫧 ${item.cost}`}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.note}>Harcadığın İnciler 🫧 zamanla yeniden birikir. Ceza, süre sınırı veya kayıp yoktur.</Text>
    </SubpageScreen>
  );
}

const styles = StyleSheet.create({
  sub: {
    fontFamily: theme.font.sans,
    fontSize: 13,
    color: theme.color.ink70,
    lineHeight: 19,
    marginBottom: 14,
  },
  tabs: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 12,
  },
  pk: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.color.ink15,
    backgroundColor: "rgba(255,255,255,0.4)",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  pkOn: {
    backgroundColor: theme.color.blue,
    borderColor: theme.color.blue,
  },
  pkText: {
    fontFamily: theme.font.sansSemibold,
    fontSize: 12.5,
    color: theme.color.ink70,
    fontWeight: theme.font.weight.semibold,
  },
  pkTextOn: {
    color: "#fff",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sitem: {
    width: "48.5%",
    backgroundColor: "rgba(255,255,255,0.55)",
    borderWidth: 1,
    borderColor: theme.color.edge,
    borderRadius: 16,
    padding: 13,
    alignItems: "center",
    ...theme.shadow.glass,
  },
  sitemOwned: {
    opacity: 0.5,
  },
  ic: {
    fontSize: 26,
    marginBottom: 6,
  },
  sitemTitle: {
    fontFamily: theme.font.sansBold,
    fontWeight: theme.font.weight.bold,
    fontSize: 13,
    color: theme.color.ink,
    textAlign: "center",
  },
  sitemCost: {
    marginTop: 4,
    fontFamily: theme.font.mono,
    fontSize: 11,
    color: theme.color.blueDeep,
  },
  note: {
    marginTop: 14,
    fontFamily: theme.font.sans,
    fontSize: 11.5,
    color: theme.color.ink40,
    lineHeight: 16,
  },
});
