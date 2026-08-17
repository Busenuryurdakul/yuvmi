import { useCallback, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect, type Href } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { PageHeader } from "@/components/ui/PageHeader";
import { Eyebrow, Glass } from "@/components/ui/Glass";
import { TapRow } from "@/components/ui/TapRow";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useMode } from "@/context/ModeContext";
import { fetchPearlBalance } from "@/lib/api/yuvmi";
import { theme } from "@/theme";

export default function AtolyeScreen() {
  const { user } = useAuth();
  const { prefs, patchPrefs } = useMode();
  const tohum = prefs?.tohum ?? 48; // İnci balance — synced from backend, spent locally
  const [balanceSheetOpen, setBalanceSheetOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!user?.token) return;
      fetchPearlBalance()
        .then((res) => void patchPrefs({ tohum: res.balance }))
        .catch(() => {});
    }, [user?.token]),
  );

  return (
    <Screen tabBar>
      <PageHeader
        eyebrow="Atölyen"
        eyebrowRight={
          <Pressable onPress={() => setBalanceSheetOpen(true)} style={styles.balance}>
            <Text style={styles.balanceText}>🫧 {tohum} İnci</Text>
          </Pressable>
        }
        title="Atölye"
        subtitle="Kişisel gelişim sistemlerini ve niyet araçlarını tasarladığın alan."
      />

      <Modal
        visible={balanceSheetOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setBalanceSheetOpen(false)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setBalanceSheetOpen(false)}>
          <Pressable style={styles.sheetCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>İnci Göstergesi 🫧</Text>
            <Text style={styles.sheetBody}>
              Kıyıya vuranlar dükkanına mı yoksa Mercan Bahçesi'ne mi gitmek istersin?
            </Text>
            <Pressable
              style={styles.sheetOption}
              onPress={() => {
                setBalanceSheetOpen(false);
                router.push("/atolye/shop");
              }}
            >
              <Text style={styles.sheetOptionText}>Kıyıya Vuranlar (Dükkân)</Text>
            </Pressable>
            <Pressable
              style={styles.sheetOption}
              onPress={() => {
                setBalanceSheetOpen(false);
                router.push("/atolye/garden");
              }}
            >
              <Text style={styles.sheetOptionText}>Mercan Bahçesi</Text>
            </Pressable>
            <Pressable style={styles.sheetCancel} onPress={() => setBalanceSheetOpen(false)}>
              <Text style={styles.sheetCancelText}>İptal</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

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
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(11,18,32,0.35)",
    justifyContent: "flex-end",
  },
  sheetCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: theme.radius.sheet,
    borderTopRightRadius: theme.radius.sheet,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 34,
  },
  sheetTitle: {
    fontFamily: theme.font.sansBold,
    fontWeight: theme.font.weight.bold,
    fontSize: 16,
    color: theme.color.ink,
    marginBottom: 6,
  },
  sheetBody: {
    fontFamily: theme.font.sans,
    fontSize: 13.5,
    color: theme.color.ink70,
    lineHeight: 19,
    marginBottom: 16,
  },
  sheetOption: {
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: theme.color.edge,
  },
  sheetOptionText: {
    fontFamily: theme.font.sansSemibold,
    fontWeight: theme.font.weight.semibold,
    fontSize: 15,
    color: theme.color.blueDeep,
    textAlign: "center",
  },
  sheetCancel: {
    paddingVertical: 14,
    marginTop: 4,
  },
  sheetCancelText: {
    fontFamily: theme.font.sans,
    fontSize: 15,
    color: theme.color.ink40,
    textAlign: "center",
  },
});
