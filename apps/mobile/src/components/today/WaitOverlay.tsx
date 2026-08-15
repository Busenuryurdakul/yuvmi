import { useEffect, useRef } from "react";
import { Animated, Easing, Modal, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { theme } from "@/theme";

type WaitOverlayProps = {
  seconds: number | null;
  onComplete: () => void;
};

function format(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function WaitOverlay({ seconds, onComplete }: WaitOverlayProps) {
  const visible = seconds != null;
  const scale = useRef(new Animated.Value(0.08)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const shrinking = useRef(false);

  useEffect(() => {
    if (!visible) {
      shrinking.current = false;
      scale.setValue(0.08);
      opacity.setValue(0);
      return;
    }
    if (shrinking.current) return;
    scale.setValue(0.08);
    opacity.setValue(1);
    Animated.timing(scale, {
      toValue: 1,
      duration: 160,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, opacity, scale]);

  useEffect(() => {
    if (seconds !== 0 || shrinking.current) return;
    shrinking.current = true;
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 0.06,
        duration: 760,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 760,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) onComplete();
    });
  }, [seconds, onComplete, opacity, scale]);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={() => {}}>
      {visible ? <StatusBar style="light" /> : null}
      <View style={styles.clip} pointerEvents="auto">
        <Animated.View style={[styles.fill, { opacity, transform: [{ scale }] }]}>
          <Text style={styles.kicker}>Bekle</Text>
          <Text style={styles.timer}>{seconds == null ? "" : format(seconds)}</Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  clip: {
    flex: 1,
    backgroundColor: "transparent",
  },
  fill: {
    ...StyleSheet.absoluteFill,
    backgroundColor: theme.color.blueDeep,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 36,
  },
  kicker: {
    fontFamily: theme.font.mono,
    fontSize: 12,
    letterSpacing: 1.4,
    color: "rgba(255,255,255,0.62)",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  timer: {
    fontFamily: theme.font.sansExtra,
    fontWeight: theme.font.weight.extra,
    fontSize: 64,
    letterSpacing: -2,
    color: "#fff",
  },
});
