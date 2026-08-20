import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Glass, Eyebrow } from "@/components/ui/Glass";
import { theme } from "@/theme";

/**
 * The in-app privacy policy. It describes what the app actually stores, and
 * every claim here is checkable against the schema — the data list mirrors the
 * migrations, and the third parties mirror the configured integrations
 * (Stripe, Expo push, the selected AI vendor, Google/Apple sign-in). Changing
 * what the backend collects means changing this file in the same commit.
 *
 * It has not been through legal review. Treat it as an accurate engineering
 * description of the data flows that a lawyer should turn into the published
 * policy, not as the published policy itself.
 */

const LAST_UPDATED = "18 Ağustos 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Glass style={styles.section}>
      <Eyebrow style={styles.eyebrow}>{title}</Eyebrow>
      {children}
    </Glass>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <Text style={styles.body}>{children}</Text>;
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

export default function PrivacyPolicyScreen() {
  return (
    <Screen>
      <Button label="← Geri" variant="ghost" fullWidth={false} onPress={() => router.back()} />
      <PageHeader
        eyebrow="Yasal"
        title="Gizlilik politikası"
        subtitle={`Son güncelleme: ${LAST_UPDATED}`}
      />

      <Section title="Kısaca">
        <P>
          Yuvmi&apos;ye yazdıkların sana ait. Verilerini reklam için kullanmıyoruz, satmıyoruz ve
          üçüncü taraflara pazarlama amacıyla aktarmıyoruz. Yapay zekâ, sen açıkça izin verene kadar
          verilerine hiç dokunmaz. Hesabını sildiğinde içeriğin de silinir.
        </P>
      </Section>

      <Section title="Topladığımız veriler">
        <Bullet>
          <Text style={styles.strong}>Hesap:</Text> e-posta adresin, adın ve soyadın. Şifreyle
          kaydolduysan şifren yalnızca geri döndürülemez bir özet (hash) olarak saklanır. Google ya
          da Apple ile girdiysen o sağlayıcının döndürdüğü kimlik ve e-posta.
        </Bullet>
        <Bullet>
          <Text style={styles.strong}>Profil:</Text> görünen adın, varsa avatarın, dil ve saat
          dilimi tercihin.
        </Bullet>
        <Bullet>
          <Text style={styles.strong}>Yazdıkların:</Text> gelecek benlik profilin, hedeflerin,
          planların ve plan sürümlerin, günlük adımların, günlük kontrollerin (ruh hâli, enerji,
          şükran notların, serbest yazın, alan puanların), haftalık değerlendirmelerin ve
          niyetlerin.
        </Bullet>
        <Bullet>
          <Text style={styles.strong}>Yüklediklerin:</Text> arşivine ve vizyon panona eklediğin
          görseller ve belgeler.
        </Bullet>
        <Bullet>
          <Text style={styles.strong}>Ortak alanlar:</Text> davet ettiğin ya da seni davet eden
          kişiler ve onlarla paylaşmayı seçtiğin öğeler.
        </Bullet>
        <Bullet>
          <Text style={styles.strong}>Bildirimler:</Text> bildirim izni verdiysen cihazının bildirim
          jetonu, platformu ve gönderim kaydı.
        </Bullet>
        <Bullet>
          <Text style={styles.strong}>Abonelik:</Text> Premium&apos;a geçtiysen ödeme sağlayıcısının
          verdiği müşteri ve abonelik kimliği ile aboneliğin durumu.{" "}
          <Text style={styles.strong}>Kart bilgilerin bize hiç ulaşmaz</Text> — ödemeyi Stripe
          kendi sayfasında alır.
        </Bullet>
        <Bullet>
          <Text style={styles.strong}>Yapay zekâ:</Text> hangi kapsama izin verdiğin ve ne zaman
          verdiğin; her üretim için kullanılan model, harcanan token ve süre. Prompt&apos;un
          kendisi değil, yalnızca özeti (hash) saklanır.
        </Bullet>
        <Bullet>
          <Text style={styles.strong}>Teknik kayıtlar:</Text> oturum jetonların ve güvenlik
          denetimi için tutulan istek kayıtları.
        </Bullet>
      </Section>

      <Section title="Neden topluyoruz">
        <P>
          Tek amaç uygulamanın çalışması: planını hazırlamak, gününü takip etmek, hatırlatma
          göndermek, aboneliğini yönetmek ve hesabını güvende tutmak. Bunların dışında bir kullanım
          yok — profilleme yapmıyor, reklam ağlarına veri göndermiyoruz.
        </P>
      </Section>

      <Section title="Yapay zekâ">
        <P>
          Yapay zekâ özellikleri kapsam kapsam izne bağlıdır ve varsayılan olarak kapalıdır. İzin
          vermediğin bir kapsam için verin okunmaz, işlenmez ve sağlayıcıya gönderilmez.
        </P>
        <P>
          İzin verdiğinde, o özelliğin ihtiyaç duyduğu bağlam (örneğin gelecek benlik profilin ve
          hedefin) seçtiğimiz yapay zekâ sağlayıcısına gönderilir. Sağlayıcı bu veriyi kendi
          modellerini eğitmek için kullanmaz. İzni geri çektiğinde devam eden işler de iptal edilir.
        </P>
        <P>
          Yapay zekânın önerilerini ve senin bu önerilere verdiğin kararı (kabul, düzenleme, ret)
          Yuvmi&apos;yi geliştirmek için saklamak istiyoruz. Bu ayrı bir izindir, varsayılan
          olarak kapalıdır ve Profil → Yapay zekâ altından yönetilir. Kapattığında yalnızca
          toplama durmaz — o güne dek toplanan örnekler de silinir.
        </P>
      </Section>

      <Section title="Kimlerle paylaşıyoruz">
        <P>
          Verini satmıyoruz. Yalnızca uygulamanın çalışması için gereken hizmet sağlayıcılarla,
          gereken kadarını paylaşıyoruz:
        </P>
        <Bullet>Barındırma ve veritabanı sağlayıcımız (Render).</Bullet>
        <Bullet>
          Seçili yapay zekâ sağlayıcısı (Anthropic, OpenAI veya Google) — yalnızca izin verdiğin
          kapsamlarda.
        </Bullet>
        <Bullet>Bildirim gönderimi için Expo push servisi.</Bullet>
        <Bullet>Ödeme için Stripe.</Bullet>
        <Bullet>Giriş için Google ve Apple — yalnızca o yöntemi seçtiysen.</Bullet>
        <P>
          Ortak alanlara koyduğun öğeler, o alandaki kişilere görünür. Bunu sen seçersin ve
          paylaşımı geri alabilirsin.
        </P>
      </Section>

      <Section title="Ne kadar saklıyoruz">
        <P>
          İçeriğini hesabın açık olduğu sürece saklarız — geçmişin uygulamanın özü, otomatik
          silmiyoruz. Hesabını sildiğinde hedeflerin, planların, kontrollerin, yüklediklerin ve
          yapay zekâ kayıtların birlikte silinir. Yasal olarak tutmak zorunda olduğumuz fatura
          kayıtları bunun dışındadır.
        </P>
      </Section>

      <Section title="Haklarınız">
        <P>
          KVKK ve GDPR kapsamında verilerine erişme, düzeltme, silme, işlenmesine itiraz etme ve
          taşınabilir bir kopyasını alma hakkın var. Bunların çoğunu uygulamadan doğrudan
          kullanabilirsin:
        </P>
        <Bullet>
          <Text style={styles.strong}>Kopya al:</Text> Profil → Veriler → Verilerimi dışa aktar.
        </Bullet>
        <Bullet>
          <Text style={styles.strong}>Sil:</Text> Profil → Hesabı sil. İşlem geri alınamaz.
        </Bullet>
        <Bullet>
          <Text style={styles.strong}>İzin geri çek:</Text> yapay zekâ izinlerini istediğin an
          kapatabilirsin.
        </Bullet>
      </Section>

      <Section title="Çocuklar">
        <P>
          Yuvmi 13 yaşın altındaki çocuklara yönelik değildir ve bilerek onlardan veri toplamayız.
        </P>
      </Section>

      <Section title="Değişiklikler">
        <P>
          Bu metni güncellersek yukarıdaki tarihi değiştirir, önemli değişikliklerde uygulama
          içinden haber veririz.
        </P>
      </Section>

      <Section title="İletişim">
        <P>
          Gizlilikle ilgili sorularını Profil → Destek → Yardım ve geri bildirim üzerinden
          iletebilirsin.
        </P>
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
  body: {
    fontFamily: theme.font.sans,
    fontSize: 14,
    lineHeight: 22,
    color: theme.color.ink,
    marginBottom: 10,
  },
  strong: {
    fontFamily: theme.font.sansSemibold,
    fontWeight: theme.font.weight.semibold,
  },
  bulletRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  bulletDot: {
    fontFamily: theme.font.sans,
    fontSize: 14,
    lineHeight: 22,
    color: theme.color.ink40,
  },
  bulletText: {
    flex: 1,
    fontFamily: theme.font.sans,
    fontSize: 14,
    lineHeight: 22,
    color: theme.color.ink,
  },
});
