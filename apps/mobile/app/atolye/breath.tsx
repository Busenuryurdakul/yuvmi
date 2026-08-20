import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { SubpageScreen } from "@/components/ui/SubpageScreen";
import { Glass } from "@/components/ui/Glass";
import { Button } from "@/components/ui/Button";
import { useMode } from "@/context/ModeContext";
import { theme } from "@/theme";

const PHASES = ["Nefes al", "Tut", "Ver"] as const;

export default function BreathScreen() {
  const { prefs, patchPrefs } = useMode();
  const [phase, setPhase] = useState(0);
  const [count, setCount] = useState(4);
  const [running, setRunning] = useState(false);
  const [cycles, setCycles] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (ref.current) clearInterval(ref.current);
    };
  }, []);

  function start() {
    setRunning(true);
    setPhase(0);
    setCount(4);
    setCycles(0);
    if (ref.current) clearInterval(ref.current);
    ref.current = setInterval(() => {
      setCount((c) => {
        if (c > 1) return c - 1;
        setPhase((p) => {
          const next = (p + 1) % 3;
          if (next === 0) {
            setCycles((n) => {
              const done = n + 1;
              if (done >= 3) {
                if (ref.current) clearInterval(ref.current);
                setRunning(false);
                void patchPrefs({ tohum: (prefs?.tohum ?? 48) + 1 });
              }
              return done;
            });
          }
          return next;
        });
        return 4;
      });
    }, 1000);
  }

  function stop() {
    if (ref.current) clearInterval(ref.current);
    setRunning(false);
  }

  return (
    <SubpageScreen title="Nefes molası">
      <Glass style={styles.stat}>
        <Text style={styles.label}>4-4-4</Text>
        <Text style={styles.phase}>{PHASES[phase]}</Text>
        <Text style={styles.count}>{count}</Text>
        <Text style={styles.body}>{running ? `${cycles}/3 tur` : "3 tur = +1 tohum. Yarıda bırakırsan sorun yok."}</Text>
        {running ? <Button label="Dur" variant="secondary" onPress={stop} style={{ marginTop: 16 }} /> : <Button label="Başla" onPress={start} style={{ marginTop: 16 }} />}
      </Glass>
    </SubpageScreen>
  );
}

const styles = StyleSheet.create({
  stat: { padding: 20, alignItems: "center" },
  label: { fontFamily: theme.font.mono, fontSize: 12, color: theme.color.ink40, letterSpacing: 1 },
  phase: {
    marginTop: 10,
    fontFamily: theme.font.sansBold,
    fontWeight: theme.font.weight.bold,
    fontSize: 22,
    color: theme.color.ink,
  },
  count: {
    marginTop: 8,
    fontFamily: theme.font.sansExtra,
    fontWeight: theme.font.weight.extra,
    fontSize: 56,
    color: theme.color.blue,
  },
  body: { marginTop: 10, fontFamily: theme.font.sans, fontSize: 12.5, color: theme.color.ink70, textAlign: "center" },
});
