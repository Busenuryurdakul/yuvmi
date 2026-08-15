import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { SubpageScreen } from "@/components/ui/SubpageScreen";
import { Eyebrow } from "@/components/ui/Glass";
import { useMode } from "@/context/ModeContext";
import { theme } from "@/theme";

type ShopItem = { emoji: string; name: string; cost: number };

const SHOP: Record<string, ShopItem[]> = {
  garden: [
    { emoji: "🪸", name: "Kızıl mercan", cost: 6 },
    { emoji: "🏺", name: "Paslı amfora", cost: 12 },
    { emoji: "🪼", name: "Fosforlu denizanası", cost: 8 },
    { emoji: "⚓️", name: "Paslı çapa", cost: 10 },
    { emoji: "🦪", name: "İncili istiridye", cost: 14 },
    { emoji: "🦀", name: "Mavi yengeç", cost: 5 },
  ],
  seal: [
    { emoji: "🦀", name: "Yengeç mührü", cost: 8 },
    { emoji: "🪸", name: "Mercan mührü", cost: 6 },
    { emoji: "⚓️", name: "Çapa mührü", cost: 10 },
    { emoji: "🐚", name: "Deniz kabuğu mührü", cost: 9 },
  ],
  sound: [
    { emoji: "🐋", name: "Balina şarkıları", cost: 10 },
    { emoji: "🌊", name: "Kıyı dalgaları", cost: 12 },
    { emoji: "⛈️", name: "Sahil fırtınası", cost: 12 },
  ],
};

const TABS = [
  { key: "garden", label: "Mercan" },
  { key: "seal", label: "Mühür" },
  { key: "sound", label: "Ambiyans" },
];

export default function ShopScreen() {
  const { prefs, patchPrefs } = useMode();
  const tohum = prefs?.tohum ?? 48; // Treated as İnci balance
  const [tab, setTab] = useState("garden");
  const [owned, setOwned] = useState<Set<string>>(new Set());

  async function buy(item: ShopItem) {
    const key = `${tab}:${item.name}`;
    if (owned.has(key)) return;
    if (tohum < item.cost) {
      Alert.alert("Biraz daha İnci lazım 🫧", `${item.cost - tohum} İnci eksik. Aceleye gerek yok.`);
      return;
    }
    await patchPrefs({ tohum: tohum - item.cost });
    setOwned((prev) => new Set(prev).add(key));

    const messages: Record<string, string> = {
      garden: `${item.name} mercan bahçene eklendi.`,
      seal: `${item.name} mektup kutuna eklendi.`,
      sound: `${item.name} ambiyansı açıldı — dalışta kullanabilirsin.`,
    };
    Alert.alert(`✓ ${item.name}`, messages[tab]);
  }

  const items = SHOP[tab] ?? [];

  return (
    <SubpageScreen title="Kıyıya Vuranlar (Dükkân)" right={`🫧 ${tohum}`}>
      <Text style={styles.sub}>Buradaki her şey tamamen kozmetiktir. Odaklanma sürecini hızlandıracak kestirme yollar veya gerçek parayla satılan ögeler bulunmaz. Kendi ritminde keşfet! 🫧</Text>

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
          return (
            <Pressable
              key={key}
              style={[styles.sitem, has && styles.sitemOwned]}
              onPress={() => void buy(item)}
              disabled={has}
            >
              <Text style={styles.ic}>{item.emoji}</Text>
              <Text style={styles.sitemTitle}>{item.name}</Text>
              <Text style={styles.sitemCost}>{has ? "alındı ✓" : `🫧 ${item.cost}`}</Text>
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
