import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { SubpageScreen } from "@/components/ui/SubpageScreen";
import { Glass, Eyebrow } from "@/components/ui/Glass";
import { Button } from "@/components/ui/Button";
import { useMode } from "@/context/ModeContext";
import { theme } from "@/theme";

const FINDS = [
  ["🐚", "Deniz kabuğu"],
  ["🪸", "Mercan"],
  ["🗝", "Paslı anahtar"],
  ["🐠", "Meraklı balık"],
  ["💎", "Küçük kristal"],
  ["🧭", "Eski pusula"],
];

const DURATIONS = [10, 15, 25, 45];
const NIYETS = ["Sabah günlüğü", "Kurs bölümü", "15 dk hareket"];

const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export default function FocusDiveScreen() {
  const { prefs, patchPrefs } = useMode();
  const tohum = prefs?.tohum ?? 48;
  const [duration, setDuration] = useState(25);
  const [niyet, setNiyet] = useState(1);
  const [left, setLeft] = useState<number | null>(null);
  const [phase, setPhase] = useState<"idle" | "diving" | "done">("idle");
  const [finds, setFinds] = useState<string[]>([]);
  const [lastFind, setLastFind] = useState("");
  const diverPos = useRef(new Animated.Value(6)).current;
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (ref.current) clearInterval(ref.current);
      diverPos.stopAnimation();
    };
  }, [diverPos]);

  function start() {
    setPhase("diving");
    setLastFind("");
    const total = duration * 60;
    setLeft(total);
    diverPos.setValue(6);

    Animated.timing(diverPos, {
      toValue: 84,
      duration: total * 1000,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();

    ref.current = setInterval(() => {
      setLeft((prev) => {
        if (prev == null) return prev;
        if (prev <= 1) {
          if (ref.current) clearInterval(ref.current);
          ref.current = null;
          const f = FINDS[Math.floor(Math.random() * FINDS.length)];
          const findText = `${f[0]} ${f[1]}`;
          setLastFind(findText);
          setFinds((p) => [...p, findText]);
          setPhase("done");
          void patchPrefs({ tohum: tohum + 3 });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function surface() {
    if (ref.current) clearInterval(ref.current);
    ref.current = null;
    diverPos.stopAnimation();
    diverPos.setValue(6);
    setPhase("idle");
    setLeft(null);
  }

  function resetTimer() {
    if (ref.current) clearInterval(ref.current);
    ref.current = null;
    diverPos.stopAnimation();
    diverPos.setValue(6);
    setLeft(null);
    setPhase("idle");
    setLastFind("");
  }

  const diverY = diverPos.interpolate({
    inputRange: [0, 100],
    outputRange: [6, 150],
  });

  return (
    <SubpageScreen
      title="Odak dalışı"
      right={
        <Pressable style={styles.balance} onPress={() => router.push("/atolye/shop")}>
          <Text style={styles.balanceText}>🫧 {tohum}</Text>
        </Pressable>
      }
    >
      <Text style={styles.sub}>
        Süre boyunca derine inersin. Yarıda bırakırsan{" "}
        <Text style={styles.bold}>hiçbir şey ölmez</Text> — sadece yüzeye çıkarsın.
        Tamamlarsan +3 İnci 🫧 ve dipten bir buluntu.
      </Text>

      <Glass style={styles.card}>
        <Eyebrow>Hangi niyet için</Eyebrow>
        <View style={styles.pick}>
          {NIYETS.map((n, i) => (
            <Pressable
              key={n}
              style={[styles.pk, niyet === i && styles.pkOn]}
              onPress={() => setNiyet(i)}
            >
              <Text style={[styles.pkText, niyet === i && styles.pkTextOn]}>{n}</Text>
            </Pressable>
          ))}
        </View>
      </Glass>

      <Glass style={styles.card}>
        <Eyebrow style={{ textAlign: "left" }}>Süre</Eyebrow>
        <View style={styles.pick}>
          {DURATIONS.map((d) => (
            <Pressable
              key={d}
              style={[
                styles.pk,
                duration === d && styles.pkOn,
                phase !== "idle" && styles.pkDisabled,
              ]}
              disabled={phase !== "idle"}
              onPress={() => {
                if (phase === "idle") setDuration(d);
              }}
            >
              <Text style={[styles.pkText, duration === d && styles.pkTextOn]}>{d} dk</Text>
            </Pressable>
          ))}

          {/* Custom Duration Stepper */}
          <View style={[styles.stepper, phase !== "idle" && styles.stepperDisabled]}>
            <Pressable
              style={styles.stepBtn}
              disabled={phase !== "idle"}
              onPress={() => {
                if (phase === "idle") setDuration((prev) => Math.max(1, prev - 1));
              }}
            >
              <Text style={styles.stepBtnText}>-</Text>
            </Pressable>
            <Text style={styles.stepValue}>{duration} dk</Text>
            <Pressable
              style={styles.stepBtn}
              disabled={phase !== "idle"}
              onPress={() => {
                if (phase === "idle") setDuration((prev) => Math.min(180, prev + 1));
              }}
            >
              <Text style={styles.stepBtnText}>+</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.dive}>
          <View style={styles.diveGrad}>
            <View style={[styles.dline, { top: "33%" }]} />
            <Text style={[styles.dtag, { top: "31%" }]}>10 m · ısınma</Text>
            <View style={[styles.dline, { top: "66%" }]} />
            <Text style={[styles.dtag, { top: "64%" }]}>30 m · akış</Text>
            <Text style={[styles.dtag, { top: "92%" }]}>60 m · dip</Text>
            <Animated.Text style={[styles.diver, { transform: [{ translateY: diverY }] }]}>🤿</Animated.Text>
          </View>
        </View>

        <Text style={styles.timer}>{left == null ? fmt(duration * 60) : fmt(left)}</Text>

        {phase === "done" && lastFind ? (
          <Text style={styles.findText}>Dipten buluntu: {lastFind}</Text>
        ) : null}

        <View style={styles.btnRow}>
          {phase === "idle" || phase === "done" ? (
            <Button label="Başlat" onPress={start} />
          ) : (
            <Button label="Yüzeye çık" variant="secondary" onPress={surface} />
          )}
          {phase === "diving" || phase === "done" ? (
            <Button label="Sıfırla" variant="secondary" onPress={resetTimer} style={{ marginTop: 8 }} />
          ) : null}
        </View>
      </Glass>

      {phase === "done" ? (
        <Glass style={styles.card}>
          <Eyebrow>Sayaç bitti · işaretleyelim mi?</Eyebrow>
          <Text style={styles.markText}>
            "{NIYETS[niyet]}" için {duration} dakika kesintisiz çalıştın.
          </Text>
          <View style={styles.markRow}>
            <Pressable style={styles.markBtn}>
              <Text style={styles.markBtnText}>Yaptım</Text>
            </Pressable>
            <Pressable style={styles.markBtnSec}>
              <Text style={styles.markBtnSecText}>Minimum hâliyle</Text>
            </Pressable>
          </View>
        </Glass>
      ) : null}

      <Glass style={styles.card}>
        <Eyebrow>Dipten çıkardıkların</Eyebrow>
        <View style={styles.pills}>
          {finds.map((f, i) => (
            <View key={i} style={styles.pill}>
              <Text style={styles.pillText}>{f}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.hint}>
          Buluntular vizyon panona sticker olarak eklenebilir. Tamamen süs.
        </Text>
      </Glass>

      <Text style={styles.note}>İşaretlemek zorunlu değil — süre tutmak tek başına da işine yarar.</Text>
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
  pick: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  pk: {
    borderWidth: 1,
    borderColor: theme.color.ink15,
    backgroundColor: "rgba(255,255,255,0.5)",
    borderRadius: 11,
    paddingVertical: 9,
    paddingHorizontal: 13,
  },
  pkOn: {
    backgroundColor: theme.color.blue,
    borderColor: theme.color.blue,
  },
  pkText: {
    fontFamily: theme.font.sans,
    fontSize: 12.5,
    color: theme.color.ink70,
  },
  pkTextOn: {
    color: "#fff",
  },
  dive: {
    height: 196,
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: theme.color.edge,
  },
  diveGrad: {
    flex: 1,
    backgroundColor: "#7BA3F7",
    position: "relative",
  },
  dline: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  dtag: {
    position: "absolute",
    right: 8,
    fontFamily: theme.font.mono,
    fontSize: 8.5,
    color: "rgba(255,255,255,0.8)",
    letterSpacing: 0.7,
  },
  diver: {
    position: "absolute",
    top: 0,
    left: "46%",
    fontSize: 24,
  },
  timer: {
    fontFamily: theme.font.sansExtra,
    fontWeight: theme.font.weight.extra,
    fontSize: 46,
    letterSpacing: -1,
    color: theme.color.ink,
    textAlign: "center",
    marginTop: 16,
    marginBottom: 6,
  },
  findText: {
    fontFamily: theme.font.sansSemibold,
    fontSize: 16,
    color: theme.color.blueDeep,
    textAlign: "center",
    marginBottom: 10,
  },
  btnRow: {
    marginTop: 8,
  },
  markText: {
    fontFamily: theme.font.sans,
    fontSize: 13,
    color: theme.color.ink70,
    lineHeight: 19,
    marginTop: 6,
    marginBottom: 10,
  },
  markRow: {
    flexDirection: "row",
    gap: 7,
  },
  markBtn: {
    flex: 1,
    backgroundColor: theme.color.blue,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  markBtnText: {
    color: "#fff",
    fontFamily: theme.font.sansSemibold,
    fontWeight: theme.font.weight.semibold,
    fontSize: 12.5,
  },
  markBtnSec: {
    flex: 1,
    backgroundColor: "rgba(11,18,32,0.06)",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  markBtnSecText: {
    color: theme.color.ink70,
    fontFamily: theme.font.sansSemibold,
    fontWeight: theme.font.weight.semibold,
    fontSize: 12.5,
  },
  pills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  pill: {
    backgroundColor: "rgba(37,99,235,0.1)",
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 11,
  },
  pillText: {
    fontFamily: theme.font.mono,
    fontSize: 10.5,
    color: theme.color.blueDeep,
  },
  hint: {
    marginTop: 9,
    fontFamily: theme.font.sans,
    fontSize: 11.5,
    color: theme.color.ink40,
    lineHeight: 16,
  },
  note: {
    fontFamily: theme.font.sans,
    fontSize: 11.5,
    color: theme.color.ink40,
    lineHeight: 16,
    textAlign: "center",
    marginTop: 14,
  },
  balance: {
    backgroundColor: "rgba(37,99,235,0.12)",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  balanceText: {
    fontFamily: theme.font.sansSemibold,
    fontWeight: theme.font.weight.semibold,
    fontSize: 12.5,
    color: theme.color.blueDeep,
  },
  pkDisabled: {
    opacity: 0.5,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(11, 18, 32, 0.04)",
    borderRadius: 11,
    paddingHorizontal: 6,
    gap: 8,
  },
  stepperDisabled: {
    opacity: 0.5,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(11, 18, 32, 0.06)",
  },
  stepBtnText: {
    fontFamily: theme.font.sansBold,
    fontSize: 14,
    color: theme.color.ink,
  },
  stepValue: {
    fontFamily: theme.font.sansSemibold,
    fontSize: 12.5,
    color: theme.color.ink,
    minWidth: 40,
    textAlign: "center",
  },
});
