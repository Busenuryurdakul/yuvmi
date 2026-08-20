import { useState } from "react";
import { Animated, Easing, StyleSheet, Text, TextInput } from "react-native";
import { SubpageScreen } from "@/components/ui/SubpageScreen";
import { Glass } from "@/components/ui/Glass";
import { Button } from "@/components/ui/Button";
import { theme } from "@/theme";

export default function ReleaseScreen() {
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<"write" | "burning" | "done">("write");
  const [opacity] = useState(() => new Animated.Value(1));
  const [translateY] = useState(() => new Animated.Value(0));
  const [scale] = useState(() => new Animated.Value(1));

  function burn() {
    if (!text.trim()) return;
    setPhase("burning");

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 2200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -26,
        duration: 2200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.94,
        duration: 2200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setPhase("done");
      setText("");
    });
  }

  function reset() {
    setPhase("write");
    opacity.setValue(1);
    translateY.setValue(0);
    scale.setValue(1);
  }

  return (
    <SubpageScreen title="Bırakma töreni">
      <Text style={styles.sub}>Yaz, yak, git. Bu metin hiçbir yere kaydedilmez — Yuvmi de görmez.</Text>

      <Glass style={styles.stat}>
        {phase === "done" ? (
          <>
            <Text style={styles.doneIcon}>💨</Text>
            <Text style={styles.doneLabel}>✓ Gitti. Hiçbir kayıt tutulmadı.</Text>
            <Button label="Yeniden yaz" variant="secondary" onPress={reset} style={{ marginTop: 16 }} />
          </>
        ) : (
          <>
            <Animated.View
              style={[
                styles.burnWrap,
                {
                  opacity,
                  transform: [{ translateY }, { scale }],
                },
              ]}
            >
              <TextInput
                style={styles.input}
                value={text}
                onChangeText={setText}
                placeholder="Artık taşımak istemediğim şey..."
                placeholderTextColor={theme.color.ink40}
                multiline
                editable={phase === "write"}
              />
            </Animated.View>
            {phase === "write" ? (
              <Button label="Yak 🔥" onPress={burn} style={{ marginTop: 10 }} />
            ) : null}
          </>
        )}
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
  stat: {
    padding: 18,
    alignItems: "center",
  },
  burnWrap: {
    width: "100%",
  },
  input: {
    width: "100%",
    minHeight: 120,
    borderWidth: 1,
    borderColor: theme.color.ink15,
    backgroundColor: "rgba(255,255,255,0.55)",
    borderRadius: 12,
    padding: 11,
    fontFamily: theme.font.sans,
    fontSize: 14,
    color: theme.color.ink,
    textAlignVertical: "top",
  },
  doneIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  doneLabel: {
    fontFamily: theme.font.mono,
    fontSize: 12,
    color: theme.color.blueDeep,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});
