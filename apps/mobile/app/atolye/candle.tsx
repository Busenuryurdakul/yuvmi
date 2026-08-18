import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, TextInput, View } from "react-native";
import { SubpageScreen } from "@/components/ui/SubpageScreen";
import { Glass, Eyebrow } from "@/components/ui/Glass";
import { Button } from "@/components/ui/Button";
import { theme } from "@/theme";

const CANDLE_SECS = 45;

export default function CandleScreen() {
  const [intent, setIntent] = useState("");
  const [phase, setPhase] = useState<"idle" | "lit" | "done">("idle");
  const [left, setLeft] = useState(CANDLE_SECS);
  const [shelf, setShelf] = useState<string[]>(["Sabırlı olacağım"]);
  const [currentIntent, setCurrentIntent] = useState("");
  const [flicker] = useState(() => new Animated.Value(1));
  const [glow] = useState(() => new Animated.Value(0));
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  function startFlicker() {
    Animated.loop(
      Animated.sequence([
        Animated.timing(flicker, {
          toValue: 1.12,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(flicker, {
          toValue: 0.95,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
    Animated.timing(glow, {
      toValue: 1,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }

  function stopFlicker() {
    flicker.stopAnimation();
    flicker.setValue(1);
    Animated.timing(glow, {
      toValue: 0,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }

  function light() {
    const text = intent.trim();
    if (!text) return;
    setCurrentIntent(text);
    setPhase("lit");
    setLeft(CANDLE_SECS);
    startFlicker();

    timer.current = setInterval(() => {
      setLeft((prev) => {
        if (prev <= 1) {
          if (timer.current) clearInterval(timer.current);
          timer.current = null;
          stopFlicker();
          setPhase("done");
          setShelf((s) => [...s, text]);
          // No pearl bump here: `tohum` is only a local cache of the server's
          // ledger, so incrementing it showed a pearl that vanished on the
          // next balance sync. Pearls come from the award endpoints.
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function reset() {
    setPhase("idle");
    setIntent("");
    setCurrentIntent("");
    setLeft(CANDLE_SECS);
  }

  const glowColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(255,170,60,0)", "rgba(255,170,60,0.5)"],
  });

  return (
    <SubpageScreen title="Niyet mumu">
      <Text style={styles.sub}>Bir niyet yaz, mumu yak. Yandığı sürece ekranda sadece o var.</Text>

      <Glass style={styles.center}>
        <Animated.View
          style={[
            styles.flameWrap,
            {
              transform: [{ scale: flicker }],
              shadowColor: "#FFAA3C",
              shadowOpacity: glow,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 0 },
            },
          ]}
        >
          <Animated.View style={[styles.glowCircle, { backgroundColor: glowColor }]} />
          <Text style={[styles.flame, phase === "idle" && styles.flameDim]}>
            {phase === "lit" ? "🔥" : "🕯"}
          </Text>
        </Animated.View>

        <Text style={styles.intentDisplay}>
          {phase === "idle" ? "—" : `"${currentIntent}"`}
        </Text>

        <Text style={styles.timer}>
          {phase === "done" ? "mum söndü" : `${left} sn`}
        </Text>
      </Glass>

      {phase === "idle" ? (
        <>
          <Glass style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={intent}
              onChangeText={setIntent}
              placeholder="Örn. Bugün acele etmiyorum"
              placeholderTextColor={theme.color.ink40}
            />
          </Glass>
          {/* Disabled rather than a silent no-op: `light()` returns early on an
              empty niyet, so the button used to look simply broken. */}
          <Button label="Mumu yak" onPress={light} disabled={!intent.trim()} />
        </>
      ) : null}

      {phase === "done" ? (
        <Button label="Yeni mum yak" variant="secondary" onPress={reset} style={{ marginTop: 12 }} />
      ) : null}

      <Glass style={styles.shelfWrap}>
        <Eyebrow>Yanan niyetlerin</Eyebrow>
        <View style={styles.shelfRow}>
          {shelf.map((s, i) => (
            <View key={i} style={styles.pill}>
              <Text style={styles.pillText}>🕯 {s}</Text>
            </View>
          ))}
        </View>
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
  center: {
    padding: 20,
    alignItems: "center",
    marginBottom: 12,
  },
  flameWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: 90,
    height: 90,
  },
  glowCircle: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  flame: {
    fontSize: 64,
  },
  flameDim: {
    opacity: 0.25,
  },
  intentDisplay: {
    fontFamily: theme.font.sansBold,
    fontWeight: theme.font.weight.bold,
    fontSize: 17,
    lineHeight: 24,
    color: theme.color.ink,
    textAlign: "center",
    marginTop: 10,
  },
  timer: {
    fontFamily: theme.font.mono,
    fontSize: 12,
    color: theme.color.blueDeep,
    marginTop: 4,
    letterSpacing: 0.8,
  },
  inputWrap: {
    padding: 4,
    marginBottom: 12,
  },
  input: {
    fontFamily: theme.font.sans,
    fontSize: 14,
    color: theme.color.ink,
    padding: 11,
  },
  shelfWrap: {
    padding: 14,
    marginTop: 14,
  },
  shelfRow: {
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
    letterSpacing: 0.5,
  },
});
