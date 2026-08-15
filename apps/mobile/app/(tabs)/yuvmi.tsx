import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/Screen";
import { PageHeader } from "@/components/ui/PageHeader";
import { Glass } from "@/components/ui/Glass";
import { useAuth } from "@/context/AuthContext";
import { theme } from "@/theme";

type Msg = { role: "ai" | "user"; text: string };

const CHIPS = [
  "Planımı gözden geçir",
  "Bugünü küçült",
  "Neden olmuyor?",
  "6 ay önceki ben",
  "Kursu ne zaman bitiririm?",
  "Haftamı özetle",
  "Hedefimi böl",
] as const;

const REPLIES: Record<string, string> = {
  "Planımı gözden geçir":
    "Son 14 güne bakınca sabah adımların daha istikrarlı. Akşam adımını kahveden sonraya taşımayı deneyebiliriz — plan v2 olur, geçmişin korunur.",
  "Bugünü küçült":
    "Bugünü hafifletelim: sadece minimumlar. Ritmin bozulmuş sayılmaz. İstersen Bugün → Niyet'ten enerjini Düşük'e çek.",
  "Neden olmuyor?":
    "Kaçırmaların çoğu motivasyon değil zamanlama gibi görünüyor. Çapayı değiştirmek, bırakmaktan daha nazik bir çözüm.",
  "6 ay önceki ben":
    "Henüz yeterli kayıt yok — ama geri dönüşlerin başarı sayıldığı bir geçmiş kuruyoruz. 6 ay sonra buradan bakabileceksin.",
  "Kursu ne zaman bitiririm?":
    "Şu tempoyla kabaca 2–3 hafta. Bonus günler hızlandırır; minimum günler de sayılır.",
  "Haftamı özetle":
    "Dolu günlerin var, birkaç minimum hâliyle tamamladın. Suçluluk yok — ritim bozulmadı.",
  "Hedefimi böl":
    "Hedef → kilometre taşı → adım → minimum → bugünkü çapa. Atölye'deki araçlarla da derleyebilirsin.",
};

export default function YuvmiScreen() {
  const { user } = useAuth();
  const name = user?.displayName?.split(" ")[0] ?? "sen";
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>(() => [
    {
      role: "ai",
      text: `Merhaba ${name}. Ben Yuvmi. Planını, son 14 günlük ritmini ve örüntülerini görebiliyorum. Ne konuşalım?`,
    },
  ]);

  const placeholder = useMemo(() => "Yuvmi'ye yaz...", []);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const reply =
      REPLIES[trimmed] ??
      "Not aldım. Bu bir önizleme — tam sürümde yalnızca izin verdiğin verilerle konuşurum. Şimdilik Bugün ve Yolculuk'tan devam edebilirsin.";
    setMsgs((prev) => [...prev, { role: "user", text: trimmed }, { role: "ai", text: reply }]);
    setInput("");
  }

  function handleVoiceStart() {
    if (isRecording) {
      setIsRecording(false);
      setMsgs((prev) => [
        ...prev,
        {
          role: "user",
          text: "🎙️ Ses kaydı: 'Bugün sabah yürüyüşümü yaptım, işteki sunumu tamamladım. Akşam okumasını ise yorgunluktan yapamadım.'",
        },
        {
          role: "ai",
          text: "Kaydını dinledim! Sabah yürüyüşünü ve iş sunumunu tamamlandı olarak işaretledim. Akşam okumanı yarına nazikçe erteledim. Harika bir gün geçirdin!",
        },
      ]);
    } else {
      setIsRecording(true);
      setTimeout(() => {
        setIsRecording(false);
        setMsgs((prev) => [
          ...prev,
          {
            role: "user",
            text: "🎙️ Ses kaydı: 'Bugün sabah yürüyüşümü yaptım, işteki sunumu tamamladım. Akşam okumasını ise yorgunluktan yapamadım.'",
          },
          {
            role: "ai",
            text: "Kaydını dinledim! Sabah yürüyüşünü ve iş sunumunu tamamlandı olarak işaretledim. Akşam okumanı yarına nazikçe erteledim. Harika bir gün geçirdin!",
          },
        ]);
      }, 3500);
    }
  }

  return (
    <Screen tabBar>
      <PageHeader
        eyebrow="Yapay zekâ"
        eyebrowRight="Önizleme"
        title="Yuvmi"
        subtitle="Sakin ve destekleyici plan motoru. Planını, ritmini ve örüntülerini görerek sana eşlik eder."
      />

      {/* Konuşarak Kapat Voice Card */}
      <Glass style={styles.voiceCard}>
        <Text style={styles.voiceKicker}>KONUŞARAK KAPAT</Text>
        <Text style={styles.voiceDescription}>
          Kutucuklarla uğraşmak istemiyorsan 20 saniye anlat. Yuvmi, işaretlerini düzenler.
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.voiceButton,
            isRecording && styles.voiceButtonActive,
            pressed && { opacity: 0.8 },
          ]}
          onPress={handleVoiceStart}
        >
          <Ionicons
            name={isRecording ? "stop-circle" : "mic"}
            size={18}
            color={isRecording ? "#DC2626" : theme.color.blue}
          />
          <Text style={[styles.voiceButtonText, isRecording && styles.voiceButtonTextActive]}>
            {isRecording ? "Dinleniyor... (Tamamla)" : "Konuşmayı başlat"}
          </Text>
        </Pressable>
      </Glass>

      <Glass style={styles.chatbox}>
        <View style={styles.chat}>
          {msgs.map((m, i) => (
            <View key={`${i}-${m.role}`} style={[styles.msg, m.role === "user" ? styles.user : styles.ai]}>
              <Text style={[styles.msgText, m.role === "user" && styles.userText]}>{m.text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.chips}>
          {CHIPS.map((c) => (
            <Pressable key={c} onPress={() => send(c)} style={styles.chip}>
              <Text style={styles.chipText}>{c}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.inrow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={placeholder}
            placeholderTextColor={theme.color.ink40}
            onSubmitEditing={() => send(input)}
            returnKeyType="send"
          />
          <Pressable onPress={() => send(input)} style={styles.send}>
            <Text style={styles.sendText}>↑</Text>
          </Pressable>
        </View>
      </Glass>

      <Text style={styles.note}>
        Bu bir önizleme — yanıtlar örnek. Tam sürümde Yuvmi yalnızca izin verdiğin verileri kullanır; geçmişin otomatik paylaşılmaz.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  voiceCard: {
    padding: 16,
    marginBottom: 14,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.85)",
  },
  voiceKicker: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    letterSpacing: 1.4,
    color: theme.color.ink40,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  voiceDescription: {
    fontFamily: theme.font.sans,
    fontSize: 14.5,
    lineHeight: 21,
    color: theme.color.ink,
    marginBottom: 14,
  },
  voiceButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: theme.color.blue,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 18,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  voiceButtonActive: {
    borderColor: "#DC2626",
    backgroundColor: "rgba(220, 38, 38, 0.08)",
  },
  voiceButtonText: {
    fontFamily: theme.font.sansBold,
    fontWeight: theme.font.weight.bold,
    fontSize: 14.5,
    color: theme.color.blue,
  },
  voiceButtonTextActive: {
    color: "#DC2626",
  },
  chatbox: { padding: 14, marginBottom: 12 },
  chat: { gap: 10, marginBottom: 12 },
  msg: { maxWidth: "92%", borderRadius: 16, paddingVertical: 10, paddingHorizontal: 12 },
  ai: { alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.7)", borderWidth: 1, borderColor: theme.color.edge },
  user: { alignSelf: "flex-end", backgroundColor: theme.color.blue },
  msgText: { fontFamily: theme.font.sans, fontSize: 13.5, lineHeight: 19, color: theme.color.ink },
  userText: { color: "#fff" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 12 },
  chip: {
    backgroundColor: "rgba(37,99,235,0.12)",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  chipText: {
    fontFamily: theme.font.sansSemibold,
    fontWeight: theme.font.weight.semibold,
    fontSize: 12,
    color: theme.color.blueDeep,
  },
  inrow: { flexDirection: "row", gap: 8, alignItems: "center" },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.color.ink15,
    backgroundColor: "rgba(255,255,255,0.65)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontFamily: theme.font.sans,
    fontSize: 14,
    color: theme.color.ink,
  },
  send: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.color.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  sendText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  note: {
    fontFamily: theme.font.sans,
    fontSize: 11.5,
    lineHeight: 17,
    color: theme.color.ink40,
    textAlign: "center",
    marginTop: 4,
  },
});
