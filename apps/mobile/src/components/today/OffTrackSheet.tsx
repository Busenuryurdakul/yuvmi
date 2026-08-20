import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/theme";

type OffTrackSheetProps = {
  visible: boolean;
  onClose: () => void;
  onPick: (id: "heavy" | "timing" | "drop" | "goal") => void;
};

const OPTIONS: Array<{ id: "heavy" | "timing" | "drop" | "goal"; title: string; sub: string }> = [
  { id: "heavy", title: "Fazla geliyor", sub: "Adımları küçült, sıklığı düşür" },
  { id: "timing", title: "Zamanı tutmuyor", sub: "Bağlandığı anı değiştir" },
  { id: "drop", title: "Artık istemiyorum", sub: "Bu niyeti plandan çıkar" },
  { id: "goal", title: "Hedefim değişti", sub: "Yolculuğu baştan kur — v2" },
];

export function OffTrackSheet({ visible, onClose, onPick }: OffTrackSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    /* animationType="none" — see the note in app/(tabs)/atolye.tsx: a "fade"
       modal on react-native-web can get stuck mounted-but-inert when the
       fade-out never fires `animationend`. */
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <View />
      </Pressable>
      <BlurView
        intensity={56}
        tint="light"
        experimentalBlurMethod="dimezisBlurView"
        style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 14 }]}
      >
        <View style={styles.grab} />
        <Text style={styles.title}>Ne değişti?</Text>
        <Text style={styles.sub}>Plan sana uymuyorsa plan değişir. Sen değil.</Text>
        {OPTIONS.map((opt) => (
          <Pressable key={opt.id} onPress={() => onPick(opt.id)} style={styles.opt}>
            <Text style={styles.optTitle}>{opt.title}</Text>
            <Text style={styles.optSub}>{opt.sub}</Text>
          </Pressable>
        ))}
        <Pressable onPress={onClose} style={styles.close}>
          <Text style={styles.closeText}>Kapat</Text>
        </Pressable>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(11,18,32,0.4)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 22,
    paddingHorizontal: 19,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.82)",
    borderTopWidth: 1,
    borderColor: theme.color.edge,
  },
  grab: {
    width: 38,
    height: 4,
    borderRadius: 3,
    backgroundColor: "rgba(11,18,32,0.18)",
    alignSelf: "center",
    marginBottom: 15,
  },
  title: {
    fontFamily: theme.font.sansExtra,
    fontSize: 21,
    fontWeight: theme.font.weight.extra,
    letterSpacing: -0.4,
    color: theme.color.ink,
    marginBottom: 5,
  },
  sub: {
    fontFamily: theme.font.sans,
    fontSize: 14,
    color: theme.color.ink70,
    marginBottom: 15,
  },
  opt: {
    width: "100%",
    backgroundColor: "rgba(37,99,235,0.09)",
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 15,
    marginBottom: 8,
  },
  optTitle: {
    fontFamily: theme.font.sansBold,
    fontSize: 15,
    fontWeight: theme.font.weight.bold,
    color: theme.color.ink,
    marginBottom: 2,
  },
  optSub: {
    fontFamily: theme.font.sans,
    fontSize: 12.5,
    color: theme.color.ink70,
  },
  close: {
    paddingVertical: 11,
    alignItems: "center",
    marginTop: 3,
  },
  closeText: {
    fontFamily: theme.font.mono,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: theme.color.ink40,
  },
});
