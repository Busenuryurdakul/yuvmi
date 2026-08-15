import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SubpageScreen } from "@/components/ui/SubpageScreen";
import { Eyebrow } from "@/components/ui/Glass";
import { theme } from "@/theme";

type Card = {
  title: string;
  tier: string;
  cls: "common" | "rare" | "myth" | "locked";
  desc: string;
  back?: string;
  progress?: string;
};

const CARDS: Card[] = [
  {
    title: "Zor Gün",
    tier: "nadir",
    cls: "rare",
    desc: "Zor bir günde minimumu yaptın",
    back: '23 kez · sonuncusu 27 Temmuz: "Zor bir gündü ama üç cümle de olsa yazdım."',
  },
  {
    title: "Geri Dönüş",
    tier: "efsane",
    cls: "myth",
    desc: "4+ gün aradan sonra geri döndün",
    back: "3 kez · sonuncusu 6 Ağustos. Yuvmi'de en zor kazanılan kart budur.",
  },
  {
    title: "Dalga",
    tier: "sık",
    cls: "common",
    desc: "17 istek dalgası izlendi ve geçti",
    back: "İlk dalga 12 Temmuz 21:40. Hiçbiri sayaç sıfırlamadı.",
  },
  {
    title: "Deneyci",
    tier: "nadir",
    cls: "rare",
    desc: "2 deney tamamlandı",
    back: "#01 öğle yürüyüşü plana girdi, #02 iki kahve elendi.",
  },
  { title: "Mühür", tier: "kilitli", cls: "locked", desc: "İlk mektubunu aç", progress: "0 / 1" },
  { title: "Bahçıvan", tier: "kilitli", cls: "locked", desc: "Bahçene 6 süs ekle", progress: "0 / 6" },
  { title: "Kâşif", tier: "kilitli", cls: "locked", desc: "10 odak dalışı tamamla", progress: "3 / 10" },
  { title: "Mevsim", tier: "kilitli", cls: "locked", desc: "Bir sezonu tamamla", progress: "42 / 90 gün" },
];

export default function CardsScreen() {
  const unlocked = CARDS.filter((c) => c.cls !== "locked").length;

  return (
    <SubpageScreen title="Kanıt kartları" right={`${unlocked} / ${CARDS.length}`}>
      <Text style={styles.sub}>
        Kartlar seriden değil, <Text style={styles.bold}>yaşanmış anlardan</Text> çıkar: zor günde
        atılan minimum, geri dönüş, atlatılan dalga. Bir kez kazanıldı mı geri alınmaz.
      </Text>

      <View style={styles.grid}>
        {CARDS.map((card) => (
          <CardItem key={card.title} card={card} />
        ))}
      </View>

      <Text style={styles.note}>Karta dokun — arkasında ne zaman ve neden kazandığın yazıyor.</Text>
    </SubpageScreen>
  );
}

function CardItem({ card }: { card: Card }) {
  const [flipped, setFlipped] = useState(false);
  const isLocked = card.cls === "locked";

  if (isLocked) {
    return (
      <View style={[styles.pcard, styles.locked]}>
        <Text style={styles.tierLocked}>kilitli</Text>
        <Text style={styles.lockedTitle}>🔒 {card.title}</Text>
        <Text style={styles.cardDesc}>{card.desc}</Text>
        <Text style={styles.progress}>{card.progress}</Text>
      </View>
    );
  }

  return (
    <Pressable
      style={[styles.pcard, card.cls === "rare" && styles.rare, card.cls === "myth" && styles.myth]}
      onPress={() => setFlipped((f) => !f)}
    >
      {flipped ? (
        <>
          <Text style={[styles.tier, card.cls === "myth" && styles.tierMyth]}>kartın arkası</Text>
          <Text style={styles.backText}>{card.back}</Text>
        </>
      ) : (
        <>
          <Text style={[styles.tier, card.cls === "myth" && styles.tierMyth]}>{card.tier}</Text>
          <Text style={styles.cardTitle}>{card.title}</Text>
          <Text style={styles.cardDesc}>{card.desc}</Text>
        </>
      )}
    </Pressable>
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
  bold: {
    fontFamily: theme.font.sansBold,
    fontWeight: theme.font.weight.bold,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },
  pcard: {
    width: "47.5%",
    borderRadius: 15,
    padding: 13,
    minHeight: 118,
    borderWidth: 1,
    borderColor: theme.color.edge,
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.8)",
    ...theme.shadow.glass,
  },
  rare: {
    backgroundColor: "rgba(123,163,247,0.22)",
  },
  myth: {
    backgroundColor: "rgba(255,241,196,0.7)",
    borderColor: "rgba(217,99,78,0.35)",
  },
  locked: {
    backgroundColor: "rgba(255,255,255,0.34)",
    borderStyle: "dashed",
    shadowOpacity: 0,
    elevation: 0,
  },
  tier: {
    fontFamily: theme.font.mono,
    fontSize: 8.5,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: theme.color.blueDeep,
  },
  tierMyth: {
    color: "#A33E2C",
  },
  tierLocked: {
    fontFamily: theme.font.mono,
    fontSize: 8.5,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: theme.color.ink40,
  },
  cardTitle: {
    fontFamily: theme.font.sansBold,
    fontWeight: theme.font.weight.bold,
    fontSize: 13.5,
    lineHeight: 17,
    marginTop: 6,
    color: theme.color.ink,
  },
  lockedTitle: {
    fontFamily: theme.font.sansBold,
    fontWeight: theme.font.weight.bold,
    fontSize: 13.5,
    lineHeight: 17,
    marginTop: 6,
    color: theme.color.ink40,
  },
  cardDesc: {
    marginTop: 6,
    fontFamily: theme.font.sans,
    fontSize: 11,
    color: theme.color.ink70,
    lineHeight: 15,
  },
  backText: {
    marginTop: 6,
    fontFamily: theme.font.sans,
    fontSize: 11.5,
    color: theme.color.ink70,
    lineHeight: 16,
  },
  progress: {
    marginTop: 4,
    fontFamily: theme.font.mono,
    fontSize: 10,
    color: theme.color.ink40,
  },
  note: {
    fontFamily: theme.font.sans,
    fontSize: 11.5,
    color: theme.color.ink40,
    lineHeight: 16,
    textAlign: "center",
    marginTop: 14,
  },
});
