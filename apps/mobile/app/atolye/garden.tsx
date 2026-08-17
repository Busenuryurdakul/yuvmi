import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { SubpageScreen } from "@/components/ui/SubpageScreen";
import { Glass, Eyebrow } from "@/components/ui/Glass";
import { useMode } from "@/context/ModeContext";
import { alert } from "@/lib/alert";
import { theme } from "@/theme";

type Plant = { emoji: string; name: string; pct: number; status: string; sleep?: boolean };

const INITIAL_PLANTS: Plant[] = [
  { emoji: "🪸", name: "mercan polibi", pct: 79, status: "olgun · %79" },
  { emoji: "🪼", name: "denizanası", pct: 43, status: "fide · %43" },
  { emoji: "🦐", name: "karides kolonisi", pct: 64, status: "gelişiyor · %64" },
  { emoji: "🐡", name: "balon balığı", pct: 0, status: "uykuda · denemede", sleep: true },
];

const TOTAL_PLOTS = 12;

export default function GardenScreen() {
  const { prefs, patchPrefs } = useMode();
  const tohum = prefs?.tohum ?? 48; // İnci balance
  const [plants, setPlants] = useState(INITIAL_PLANTS);
  const [watered, setWatered] = useState(false);

  const growCount = plants.filter((p) => !p.sleep).length;
  const sleepCount = plants.filter((p) => p.sleep).length;

  function water() {
    if (watered) return;
    setPlants((prev) =>
      prev.map((p) =>
        p.sleep ? { ...p, sleep: false, status: "fide · uykudan uyandı" } : p,
      ),
    );
    setWatered(true);
    void patchPrefs({ tohum: tohum + 1 });
    alert("+1 İnci 🫧", "Gel-git akıntısı polipleri ve mercanları canlandırdı.");
  }

  return (
    <SubpageScreen title="Mercan Bahçesi" right={`🫧 ${tohum}`}>
      <Text style={styles.sub}>
        Her niyetinin bir polipi var. Yaptıkça büyür, yapmadığın günlerde{" "}
        <Text style={styles.bold}>çekilir (uykuya geçer)</Text> — hiçbir mercan ölmez, hiçbir şey sıfırlanmaz.
      </Text>

      <Glass style={styles.card}>
        <Eyebrow>Mercan Bahçesi · Ağustos</Eyebrow>
        <View style={styles.garden}>
          {Array.from({ length: TOTAL_PLOTS }).map((_, i) => {
            const plant = plants[i];
            if (plant) {
              return (
                <Pressable
                  key={i}
                  style={[styles.plot, plant.sleep && styles.plotSleep]}
                  onPress={() =>
                    alert(
                      plant.name,
                      plant.sleep
                        ? `${plant.name} uykuda — tek bir minimum onu uyandırır.`
                        : `${plant.name} büyüyor.`,
                    )
                  }
                >
                  <Text style={styles.plantEmoji}>{plant.emoji}</Text>
                  <Text style={styles.plotLabel}>{plant.name}</Text>
                </Pressable>
              );
            }
            return (
              <Pressable
                key={i}
                style={styles.plotEmpty}
                onPress={() => router.push("/atolye/shop")}
              >
                <Text style={styles.plotPlus}>+</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.gardenSay}>
          {growCount} mercan büyüyor{sleepCount > 0 ? `, ${sleepCount} tanesi uykuda` : ""}.
          {sleepCount > 0 ? " Uyuyan mercan tek bir minimumla uyanır." : ""}
        </Text>
        <View style={styles.btnRow}>
          <Pressable style={styles.bsmY} onPress={water}>
            <Text style={styles.bsmYText}>{watered ? "✓ Akıntı Başlatıldı" : "Gel-git akıntısı yap"}</Text>
          </Pressable>
          <Pressable style={styles.bsmN} onPress={() => router.push("/atolye/shop")}>
            <Text style={styles.bsmNText}>Dükkân</Text>
          </Pressable>
        </View>
      </Glass>

      <Glass style={styles.card}>
        <Eyebrow>Mercanların</Eyebrow>
        {plants.map((p, i) => (
          <View key={i} style={styles.kv}>
            <Text style={styles.kvLabel}>
              {p.emoji} {p.name.charAt(0).toUpperCase() + p.name.slice(1)}
            </Text>
            <Text style={styles.kvValue}>{p.status}</Text>
          </View>
        ))}
        <Text style={styles.hint}>
          Mercan bahçesi bir puan tablosu değil — planına hiçbir etkisi yok. Sadece emeğinin şekli.
        </Text>
      </Glass>
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
  bold: {
    fontFamily: theme.font.sansBold,
    fontWeight: theme.font.weight.bold,
  },
  card: {
    padding: 14,
    marginBottom: 9,
  },
  garden: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 10,
  },
  plot: {
    width: "22.5%",
    aspectRatio: 1,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: theme.color.edge,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  plotSleep: {
    opacity: 0.55,
  },
  plantEmoji: {
    fontSize: 24,
  },
  plotLabel: {
    position: "absolute",
    bottom: 4,
    left: 0,
    right: 0,
    textAlign: "center",
    fontFamily: theme.font.mono,
    fontSize: 7.5,
    letterSpacing: 0.3,
    color: theme.color.ink40,
  },
  plotEmpty: {
    width: "22.5%",
    aspectRatio: 1,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: theme.color.ink15,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.32)",
  },
  plotPlus: {
    fontSize: 15,
    color: theme.color.ink40,
  },
  gardenSay: {
    marginTop: 11,
    fontFamily: theme.font.sans,
    fontSize: 12,
    color: theme.color.ink70,
    lineHeight: 18,
  },
  btnRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  bsmY: {
    flex: 1,
    backgroundColor: theme.color.blue,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  bsmYText: {
    color: "#fff",
    fontFamily: theme.font.sansSemibold,
    fontWeight: theme.font.weight.semibold,
    fontSize: 12.5,
  },
  bsmN: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.5)",
    borderWidth: 1,
    borderColor: theme.color.ink15,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  bsmNText: {
    color: theme.color.ink70,
    fontFamily: theme.font.sansSemibold,
    fontWeight: theme.font.weight.semibold,
    fontSize: 12.5,
  },
  kv: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(11,18,32,0.09)",
  },
  kvLabel: {
    fontFamily: theme.font.sansSemibold,
    fontWeight: theme.font.weight.semibold,
    fontSize: 14,
    color: theme.color.ink,
  },
  kvValue: {
    fontFamily: theme.font.mono,
    fontSize: 12.5,
    color: theme.color.ink40,
  },
  hint: {
    marginTop: 10,
    fontFamily: theme.font.sans,
    fontSize: 11.5,
    color: theme.color.ink40,
    lineHeight: 16,
  },
});
