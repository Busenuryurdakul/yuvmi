import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/theme";

/** Sheet üç işi görüyor: baloncuk, motto, Ben sayfasındaki ad. */
export type SelfEditTarget =
  | { kind: "bubble"; id: string; question: string; answer: string }
  | { kind: "motto"; motto: string }
  | { kind: "name"; name: string };

type SelfEditSheetProps = {
  target: SelfEditTarget | null;
  onClose: () => void;
  onSaveBubble: (id: string, question: string, answer: string) => void;
  onDeleteBubble: (id: string) => void;
  onSaveMotto: (motto: string) => void;
  onSaveName: (name: string) => void;
};

/**
 * Form alanlarını hedeften türetmek için efekt kullanmıyoruz: `SheetForm`
 * hedefin kimliğiyle key'lendiği için hedef değiştiğinde React bileşeni
 * yeniden monte ediyor ve `useState` doğru başlangıç değeriyle kuruluyor.
 */
export function SelfEditSheet({
  target,
  onClose,
  onSaveBubble,
  onDeleteBubble,
  onSaveMotto,
  onSaveName,
}: SelfEditSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    /* animationType="none" — OffTrackSheet'teki notun aynısı: react-native-web'de
       "fade" modal kapanış animasyonu tetiklenmeyip monte ama tepkisiz kalabiliyor. */
    <Modal transparent visible={target !== null} animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Kapat">
        <View />
      </Pressable>
      <BlurView
        intensity={56}
        tint="light"
        experimentalBlurMethod="dimezisBlurView"
        style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 14 }]}
      >
        {target ? (
          <SheetForm
            key={target.kind === "bubble" ? `bubble:${target.id}` : target.kind}
            target={target}
            onClose={onClose}
            onSaveBubble={onSaveBubble}
            onDeleteBubble={onDeleteBubble}
            onSaveMotto={onSaveMotto}
            onSaveName={onSaveName}
          />
        ) : null}
      </BlurView>
    </Modal>
  );
}

type SheetFormProps = {
  target: SelfEditTarget;
  onClose: () => void;
  onSaveBubble: (id: string, question: string, answer: string) => void;
  onDeleteBubble: (id: string) => void;
  onSaveMotto: (motto: string) => void;
  onSaveName: (name: string) => void;
};

function SheetForm({ target, onClose, onSaveBubble, onDeleteBubble, onSaveMotto, onSaveName }: SheetFormProps) {
  const isMotto = target.kind === "motto";
  const isName = target.kind === "name";
  const [question, setQuestion] = useState(target.kind === "bubble" ? target.question : "");
  const [answer, setAnswer] = useState(
    target.kind === "bubble" ? target.answer : target.kind === "motto" ? target.motto : target.name,
  );

  function handleSave() {
    if (target.kind === "motto") {
      onSaveMotto(answer.trim());
      return;
    }
    if (target.kind === "name") {
      onSaveName(answer.trim());
      return;
    }
    const q = question.trim();
    if (!q) return;
    onSaveBubble(target.id, q, answer.trim());
  }

  const title = isName ? "Adın" : isMotto ? "Hayat mottom" : "Baloncuğu doldur";
  const sub = isName
    ? "Bu sayfada görünen ad. Hesap adından bağımsız."
    : isMotto
      ? "Seni taşıyan cümle. Boş bırakabilirsin."
      : "Soruyu da cevabı da sen yazıyorsun. Zorunlu değil.";

  return (
    <>
      <View style={styles.grab} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.sub}>{sub}</Text>

      {!isMotto && !isName ? (
        <>
          <Text style={styles.label}>Soru</Text>
          <TextInput
            style={styles.input}
            value={question}
            onChangeText={setQuestion}
            placeholder="Örn. Rol modelin?"
            placeholderTextColor={theme.color.ink40}
            maxLength={40}
          />
        </>
      ) : null}

      <Text style={styles.label}>{isName ? "Ad" : isMotto ? "Motto" : "Cevap"}</Text>
      <TextInput
        style={[styles.input, isMotto && styles.inputTall]}
        value={answer}
        onChangeText={setAnswer}
        placeholder={isName ? "Ayşe" : isMotto ? "Sen korkma…" : "Boş bırakabilirsin"}
        placeholderTextColor={theme.color.ink40}
        multiline={isMotto}
        autoCapitalize="words"
        maxLength={isMotto ? 120 : isName ? 24 : 60}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Kaydet"
        onPress={handleSave}
        style={styles.save}
      >
        <Text style={styles.saveText}>Kaydet</Text>
      </Pressable>

      {target.kind === "bubble" ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Baloncuğu sil"
          onPress={() => onDeleteBubble(target.id)}
          style={styles.delete}
        >
          <Text style={styles.deleteText}>Baloncuğu sil</Text>
        </Pressable>
      ) : null}

      <Pressable accessibilityRole="button" onPress={onClose} style={styles.close}>
        <Text style={styles.closeText}>Kapat</Text>
      </Pressable>
    </>
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
    fontSize: 13.5,
    color: theme.color.ink70,
    marginBottom: 14,
  },
  label: {
    fontFamily: theme.font.mono,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: theme.color.ink40,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.color.ink15,
    backgroundColor: "rgba(255,255,255,0.55)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontFamily: theme.font.sans,
    fontSize: 14,
    color: theme.color.ink,
    marginBottom: 12,
  },
  inputTall: {
    minHeight: 72,
    textAlignVertical: "top",
  },
  save: {
    backgroundColor: theme.color.blue,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 2,
  },
  saveText: {
    fontFamily: theme.font.sansSemibold,
    fontWeight: theme.font.weight.semibold,
    fontSize: 14,
    color: "#fff",
  },
  delete: {
    paddingVertical: 11,
    alignItems: "center",
    marginTop: 4,
  },
  deleteText: {
    fontFamily: theme.font.sansSemibold,
    fontWeight: theme.font.weight.semibold,
    fontSize: 12.5,
    color: theme.color.danger,
  },
  close: {
    paddingVertical: 10,
    alignItems: "center",
  },
  closeText: {
    fontFamily: theme.font.mono,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: theme.color.ink40,
  },
});
