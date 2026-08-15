import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router, type Href } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { PageHeader } from "@/components/ui/PageHeader";
import { Eyebrow, Glass } from "@/components/ui/Glass";
import { TapRow } from "@/components/ui/TapRow";
import { Button } from "@/components/ui/Button";
import { useMode } from "@/context/ModeContext";
import { theme } from "@/theme";

export default function AtolyeScreen() {
  const { prefs, patchPrefs } = useMode();
  const tohum = prefs?.tohum ?? 48; // Treated as İnci balance

  function handleBalancePress() {
    Alert.alert(
      "İnci Göstergesi 🫧",
      "Kıyıya vuranlar dükkanına mı yoksa Mercan Bahçesi'ne mi gitmek istersin?",
      [
        { text: "Kıyıya Vuranlar (Dükkân)", onPress: () => router.push("/atolye/shop") },
        { text: "Mercan Bahçesi", onPress: () => router.push("/atolye/garden") },
        { text: "İptal", style: "cancel" },
      ]
    );
  }

  return (
    <Screen tabBar>
      <PageHeader
        eyebrow="Atölyen"
        eyebrowRight={
          <Pressable onPress={handleBalancePress} style={styles.balance}>
            <Text style={styles.balanceText}>🫧 {tohum} İnci</Text>
          </Pressable>
        }
        title="Atölye"
        subtitle="Kişisel gelişim sistemlerini ve niyet araçlarını tasarladığın alan."
      />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* 1. OLUŞTUR */}
        <Glass style={styles.card}>
          <Eyebrow style={styles.lbl}>🛠️ 1. OLUŞTUR</Eyebrow>
          <Text style={styles.cardTitle}>"Kendi sistemlerini tasarla"</Text>
          <View style={styles.rows}>
            <TapRow
              title="🔔 Bildirim tasarla"
              subtitle="Yuvmi sana ne zaman ne desin — sen yaz"
              nested
              onPress={() => router.push("/atolye/notifications")}
            />
            <TapRow title="💬 Olumlamalar" subtitle="Kendi motive edici olumlama cümlelerin" nested onPress={() => router.push("/vision/affirmations")} />
            <TapRow title="🖼️ Vizyon panosu" subtitle="Gelecekteki benliğini yansıtan pano duvarı" nested onPress={() => router.push("/vision/board")} />
          </View>
        </Glass>

        {/* 2. YAZ */}
        <Glass style={styles.card}>
          <Eyebrow style={styles.lbl}>✍️ 2. YAZ</Eyebrow>
          <Text style={styles.cardTitle}>"Düşüncelerini dışa vur"</Text>
          <View style={styles.rows}>
            <TapRow title="✉️ Mektup kutusu" subtitle="Yaz, mühürle, gelecekteki bir tarihte aç" nested onPress={() => router.push("/vision/letter")} />
            <TapRow title="🍾 Şişeye koy ve bırak" subtitle="Yaz ve denize bırak, akıntıyla uzaklaşsın" nested onPress={() => router.push("/atolye/release")} />
          </View>
        </Glass>

        {/* 3. ODAK */}
        <Glass style={styles.card}>
          <Eyebrow style={styles.lbl}>🧘 3. ODAK</Eyebrow>
          <Text style={styles.cardTitle}>"Şimdiye dön"</Text>
          <View style={styles.rows}>
            <TapRow title="🤿 Gerçek Dalış" subtitle="Metreler indikçe derinleşen odak sayacı" nested onPress={() => router.push("/atolye/focus")} />
            <TapRow title="🌬️ Nefes molası" subtitle="Kutucuklu nefes egzersizi (4-4-4)" nested onPress={() => router.push("/atolye/breath")} />
            <TapRow title="🕯️ Niyet feneri" subtitle="Niyetini fenerin ışığına bağlayıp odaklan" nested onPress={() => router.push("/atolye/candle")} />
          </View>
        </Glass>

        {/* 4. ORTAK ALAN */}
        <Glass style={styles.card}>
          <Eyebrow style={styles.lbl}>👥 4. ORTAK ALAN</Eyebrow>
          <Text style={styles.cardTitle}>"Yakınlarınla paylaş"</Text>
          
          <Glass style={[styles.innerCard, { padding: 14 }]}>
            <Eyebrow style={{ fontSize: 10.5, marginBottom: 8 }}>ORTAK ALAN</Eyebrow>
            <Text style={styles.sharedText}>
              Partner, arkadaş ya da aile — alan karşılıklı onayla açılır. Neyi paylaşacağını sen seçersin.
            </Text>
            <Button
              label="Davet gönder"
              onPress={() => router.push("/atolye/invite")}
              style={{ marginTop: 14 }}
            />
          </Glass>
        </Glass>
      </ScrollView>
    </Screen>
  );
}

// Styling matching Yuvmi's premium design language
import { ScrollView } from "react-native";

const styles = StyleSheet.create({
  container: {
    paddingBottom: 110,
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
  card: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  lbl: {
    marginBottom: 6,
  },
  cardTitle: {
    fontFamily: theme.font.sansSemibold,
    fontWeight: theme.font.weight.semibold,
    fontSize: 12.5,
    color: theme.color.ink70,
    fontStyle: "italic",
    marginBottom: 12,
  },
  rows: {
    gap: 8,
  },
  innerCard: {
    backgroundColor: "rgba(255,255,255,0.4)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.color.edge,
    marginTop: 8,
  },
  sharedText: {
    fontFamily: theme.font.sans,
    fontSize: 13,
    color: theme.color.ink70,
    lineHeight: 19,
  },
});
