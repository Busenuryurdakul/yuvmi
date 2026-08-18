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

/**
 * Önizleme yanıtları — sabit örnek metinler. Yuvmi henüz senin verini okumuyor,
 * bu yüzden yanıtlar "şöyle görünecek" örneğidir; gerçek bir analiz değildir.
 * Buraya asla "işaretledim / güncelledim / kaydettim" gibi eylem iddiası yazma:
 * bu ekran hiçbir veri yazmıyor.
 */
const REPLIES: Record<string, string> = {
  "Planımı gözden geçir":
    "Tam sürümde plan gözden geçirme şöyle görünecek: hangi adımların hangi saatte tuttuğuna bakıp bir alternatif öneririm. Öneriyi kabul edersen plan v2 olur, geçmişin korunur.",
  "Bugünü küçült":
    "Günü hafifletmek demek: sadece minimumlar görünür, ritmin bozulmuş sayılmaz. Bunu şimdi kendin yapabilirsin — Bugün → Plan'dan enerjini Düşük'e çek.",
  "Neden olmuyor?":
    "Tam sürümde bu soruyu kaçırdığın günlerin saatine ve bağlamına bakarak yanıtlayacağım. Genelde sorun motivasyon değil zamanlama olur; çapayı değiştirmek bırakmaktan daha nazik bir çözümdür.",
  "6 ay önceki ben":
    "Tam sürümde geçmiş kayıtlarını yan yana koyup aradaki mesafeyi göstereceğim. Geri dönüşlerin de başarı sayıldığı bir geçmiş biriktiriyorsun.",
  "Kursu ne zaman bitiririm?":
    "Tam sürümde tempona bakıp bir aralık vereceğim. Bonus günler hızlandırır, minimum günler de sayılır — tahmin buna göre değişir.",
  "Haftamı özetle":
    "Tam sürümde haftanı dolu günler, minimum günler ve geri dönüşler olarak özetleyeceğim. Suçluluk dili kullanmam — özet bir karne değil.",
  "Hedefimi böl":
    "Hedefi bölmenin sırası şu: hedef → kilometre taşı → adım → minimum → bugünkü çapa. Bunu şimdi Atölye'deki araçlarla kendin de derleyebilirsin.",
};

export default function YuvmiScreen() {
  const { user } = useAuth();
  const name = user?.displayName?.split(" ")[0] ?? "sen";
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>(() => [
    {
      role: "ai",
      text: `Merhaba ${name}. Ben Yuvmi. Şu an önizleme hâlindeyim — verilerini henüz okumuyorum ve senin adına hiçbir şey işaretlemiyorum. Aşağıdaki başlıklara dokunarak tam sürümde neler yapacağımı görebilirsin.`,
    },
  ]);

  const placeholder = useMemo(() => "Yuvmi'ye yaz...", []);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const reply =
      REPLIES[trimmed] ??
      "Bu bir önizleme — henüz serbest metin anlamıyorum ve hiçbir şey kaydetmiyorum. Yukarıdaki başlıklardan birine dokunursan tam sürümde ne yapacağımı gösterebilirim.";
    setMsgs((prev) => [...prev, { role: "user", text: trimmed }, { role: "ai", text: reply }]);
    setInput("");
  }

  function handleVoiceInfo() {
    setMsgs((prev) => [
      ...prev,
      {
        role: "ai",
        text: "Sesle kapatma henüz açık değil — bu ekran mikrofonu kullanmıyor. Tam sürümde günü anlatabilecek, ne işaretlediğimi sana onaylatacağım. O zamana kadar Bugün sekmesinden niyetlerini elle işaretleyebilirsin.",
      },
    ]);
  }

  return (
    <Screen tabBar>
      <PageHeader
        eyebrow="Yapay zekâ"
        title="Yuvmi"
        subtitle="Sakin ve destekleyici plan motoru. Tam sürümde planını ve ritmini görerek sana eşlik edecek."
      />

      {/* Konuşarak Kapat Voice Card */}
      <Glass style={styles.voiceCard}>
        <Text style={styles.voiceKicker}>KONUŞARAK KAPAT</Text>
        <Text style={styles.voiceDescription}>
          Tam sürümde günü sesle anlatabilecek, Yuvmi&apos;nin ne işaretlediğini onaylayacaksın.
        </Text>
        <View style={styles.previewBadge}>
          <Text style={styles.previewBadgeText}>
            ÖNİZLEME · bu düğme kayıt yapmaz, hiçbir şey işaretlemez
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sesle kapatma hakkında bilgi al"
          accessibilityHint="Bu özellik henüz aktif değil, yalnızca bilgi mesajı gösterir"
          style={({ pressed }) => [styles.voiceButton, pressed && { opacity: 0.8 }]}
          onPress={handleVoiceInfo}
        >
          <Ionicons name="mic-off-outline" size={18} color={theme.color.ink40} />
          <Text style={styles.voiceButtonText}>Sesle kapatma — yakında</Text>
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
            <Pressable
              key={c}
              accessibilityRole="button"
              accessibilityLabel={c}
              onPress={() => send(c)}
              style={styles.chip}
            >
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
            placeholderTextColor={theme.color.ink70}
            onSubmitEditing={() => send(input)}
            returnKeyType="send"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Gönder"
            onPress={() => send(input)}
            style={styles.send}
          >
            <Text style={styles.sendText}>↑</Text>
          </Pressable>
        </View>
      </Glass>

      <Text style={styles.note}>
        Bu bir önizleme: yanıtlar sabit örneklerdir, verilerin okunmaz ve bu ekran hiçbir şey kaydetmez.
        Tam sürümde Yuvmi yalnızca izin verdiğin verileri kullanacak; geçmişin otomatik paylaşılmaz.
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
  previewBadge: {
    alignSelf: "flex-start",
    marginBottom: 12,
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    backgroundColor: "rgba(11,18,32,0.06)",
    borderWidth: 1,
    borderColor: theme.color.ink15,
  },
  previewBadgeText: {
    fontFamily: theme.font.monoMedium,
    fontSize: 10.5,
    letterSpacing: 0.6,
    lineHeight: 15,
    color: theme.color.ink70,
  },
  voiceButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 48,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: theme.color.ink15,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 18,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  voiceButtonText: {
    fontFamily: theme.font.sansSemibold,
    fontWeight: theme.font.weight.semibold,
    fontSize: 14.5,
    color: theme.color.ink70,
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
    minHeight: 44,
    justifyContent: "center",
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
    color: theme.color.ink70,
    textAlign: "center",
    marginTop: 4,
  },
});
