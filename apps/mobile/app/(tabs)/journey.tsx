import { StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { theme } from "@/theme";

export default function JourneyScreen() {
  const hasGoal = false;

  return (
    <Screen>
      <PageHeader
        title="Yolculuk"
        subtitle="Hedeflerini ve adımlarını sen belirle. Sabit süre yok — süreç sana özel."
      />

      {hasGoal ? (
        <Card title="Aktif hedefin">
          <Text style={styles.placeholder}>Hedef detayları burada görünecek.</Text>
        </Card>
      ) : (
        <Card>
          <EmptyState
            emoji="🧭"
            title="Henüz bir hedefin yok"
            description="Kendine anlamlı gelen bir hedef yaz. Ne zaman biteceğine sen karar ver."
          />
          <Button label="Hedef ekle" onPress={() => {}} />
        </Card>
      )}

      <Card
        title="Adımların"
        subtitle="Küçük, uygulanabilir adımlar. Atlama cezası yok."
        style={styles.cardSpacing}
      >
        <EmptyState
          emoji="📋"
          title="Henüz adım eklenmedi"
          description="Bugün veya bu hafta için kendine küçük bir adım tanımlayabilirsin."
        />
        <Button label="Adım ekle" variant="secondary" onPress={() => {}} />
      </Card>

      <Card title="Hizalanma" subtitle="Skor değil, anlayış — baskı veya suçluluk yok.">
        <View style={styles.alignmentBox}>
          <Text style={styles.alignmentScore}>—</Text>
          <Text style={styles.alignmentLabel}>Henüz hesaplanmadı</Text>
        </View>
        <Text style={styles.alignmentHint}>
          Tamamladığın küçük adımlar, geri dönüşlerin ve tutarlılığın burada açıklanacak.
          Ruh hâlin düşük diye puanın düşürülmeyecek.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardSpacing: {
    marginTop: theme.space.xl,
  },
  placeholder: {
    color: theme.color.text.secondary,
  },
  alignmentBox: {
    alignItems: "center",
    paddingVertical: theme.space.xl,
    marginBottom: theme.space.lg,
    backgroundColor: theme.color.surface.sunken,
    borderRadius: theme.radius.md,
  },
  alignmentScore: {
    fontSize: 40,
    fontWeight: theme.font.weight.semibold,
    color: theme.color.brand.tealText,
  },
  alignmentLabel: {
    marginTop: theme.space.xs,
    fontSize: theme.font.size.sm,
    color: theme.color.text.secondary,
  },
  alignmentHint: {
    fontSize: theme.font.size.sm,
    lineHeight: 22,
    color: theme.color.text.secondary,
  },
});
