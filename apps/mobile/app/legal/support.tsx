import { Linking, Platform, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import Constants from "expo-constants";
import { Screen } from "@/components/ui/Screen";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Glass, Eyebrow } from "@/components/ui/Glass";
import { supportEmail } from "@/lib/links";
import { alert } from "@/lib/alert";
import { theme } from "@/theme";

/**
 * The support destination reachable from Profil → Destek.
 *
 * The self-service answers come first on purpose: every one of them is
 * something the user can finish here in a few seconds, and a support round trip
 * for "how do I export my data" costs them a day. The mailbox appears only when
 * EXPO_PUBLIC_SUPPORT_EMAIL is configured — see @/lib/links.
 */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Glass style={styles.section}>
      <Eyebrow style={styles.eyebrow}>{title}</Eyebrow>
      {children}
    </Glass>
  );
}

function Answer({ question, children }: { question: string; children: React.ReactNode }) {
  return (
    <View style={styles.answer}>
      <Text style={styles.question}>{question}</Text>
      <Text style={styles.body}>{children}</Text>
    </View>
  );
}

/** Prefilled so a report arrives with the two facts every debug session starts
 *  from, instead of a follow-up asking for them. */
function diagnostics(): string {
  const version = Constants.expoConfig?.version ?? "bilinmiyor";
  return `Sürüm: ${version} · Platform: ${Platform.OS}`;
}

export default function SupportScreen() {
  const email = supportEmail();

  async function handleMail() {
    if (!email) return;
    const subject = encodeURIComponent("Yuvmi geri bildirim");
    const body = encodeURIComponent(`\n\n---\n${diagnostics()}`);
    const url = `mailto:${email}?subject=${subject}&body=${body}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        // No mail client configured — the address itself is still actionable,
        // so show it rather than failing silently.
        alert("E-posta uygulaması bulunamadı", `Bize şu adresten yazabilirsin: ${email}`);
        return;
      }
      await Linking.openURL(url);
    } catch {
      alert("E-posta açılamadı", `Bize şu adresten yazabilirsin: ${email}`);
    }
  }

  return (
    <Screen>
      <Button label="← Geri" variant="ghost" fullWidth={false} onPress={() => router.back()} />
      <PageHeader
        eyebrow="Destek"
        title="Yardım ve geri bildirim"
        subtitle="Önce buraya bak — çoğu şeyi kendin, hemen çözebilirsin."
      />

      <Section title="Sık sorulanlar">
        <Answer question="Verilerimi nasıl indiririm?">
          Profil → Veriler → Verilerimi dışa aktar. Hedeflerin, planların ve kontrollerin tek bir
          dosyada iner.
        </Answer>
        <Answer question="Hesabımı nasıl silerim?">
          Profil → Hesabı sil. Tüm içeriğin kalıcı olarak silinir, işlem geri alınamaz.
        </Answer>
        <Answer question="Yapay zekâ verilerimi okuyor mu?">
          Sen izin verene kadar hayır. İzinler kapsam kapsamdır, varsayılan olarak kapalıdır ve
          istediğin an geri alınabilir.
        </Answer>
        <Answer question="Planım bana ağır geliyor.">
          Bugün → Plan üzerinden enerjini düşük moda çekebilir ya da haftalık değerlendirmede planı
          yeniden düzenleyebilirsin. Eski sürümlerin korunur.
        </Answer>
        <Answer question="Seri tutulması hoşuma gitmiyor.">
          Profil → Kullanım modu → Nazik. Seri gösterimi kapanır, yerine dolu gün ve geri dönüş
          sayısı gelir.
        </Answer>
      </Section>

      {email ? (
        <Section title="Bize yaz">
          <Text style={styles.body}>
            Cevabını bulamadıysan yaz — sürüm bilgini mesaja kendimiz ekliyoruz, ayrıca yazmana
            gerek yok.
          </Text>
          <Button label="E-posta gönder" onPress={() => void handleMail()} />
          <Text style={styles.meta}>{diagnostics()}</Text>
        </Section>
      ) : (
        <Section title="Bize yaz">
          <Text style={styles.body}>
            Doğrudan iletişim kanalı bu sürümde yapılandırılmadı. Sorunu uygulama mağazasındaki
            değerlendirme bölümünden iletebilirsin.
          </Text>
          <Text style={styles.meta}>{diagnostics()}</Text>
        </Section>
      )}

      <Section title="Gizlilik">
        <Text style={styles.body}>
          Hangi verini neden tuttuğumuzu gizlilik politikasında madde madde yazdık.
        </Text>
        <Button
          label="Gizlilik politikasını oku"
          variant="secondary"
          onPress={() => router.push("/legal/privacy")}
        />
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    paddingVertical: 15,
    marginBottom: 9,
  },
  eyebrow: {
    marginBottom: 10,
  },
  answer: {
    marginBottom: 14,
  },
  question: {
    fontFamily: theme.font.sansSemibold,
    fontWeight: theme.font.weight.semibold,
    fontSize: 14.5,
    color: theme.color.ink,
    marginBottom: 4,
  },
  body: {
    fontFamily: theme.font.sans,
    fontSize: 14,
    lineHeight: 22,
    color: theme.color.ink70,
    marginBottom: 12,
  },
  meta: {
    marginTop: 12,
    fontFamily: theme.font.mono,
    fontSize: 11,
    color: theme.color.ink40,
  },
});
