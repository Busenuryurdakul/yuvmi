import { StyleSheet, Text, View } from "react-native";
import { LIFE_DOMAINS } from "@yuvmi/shared";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { theme } from "@/theme";

const previewDomains = ["career", "relationships", "peace"] as const;

export default function TodayScreen() {
  const hasCheckIn = false;

  return (
    <Screen>
      <PageHeader
        title="Bugün"
        subtitle="Ruh hâlini, enerjini ve minnettarlığını kaydet. Baskı yok — sadece farkındalık."
      />

      {hasCheckIn ? (
        <Card title="Bugünkü check-in">
          <Text style={styles.placeholder}>Check-in verisi burada görünecek.</Text>
        </Card>
      ) : (
        <Card>
          <EmptyState
            emoji="☀️"
            title="Henüz bugünkü kaydın yok"
            description="Kısa bir check-in ile gününe başla. İstersen sadece bir cümle yeter."
          />
          <Button label="Check-in başlat" onPress={() => {}} />
        </Card>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Odak alanların</Text>
        {previewDomains.map((domain) => (
          <View key={domain} style={styles.domainRow}>
            <Text style={styles.domainLabel}>
              {LIFE_DOMAINS[domain].emoji} {LIFE_DOMAINS[domain].label.tr}
            </Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: "0%" }]} />
            </View>
            <Text style={styles.domainHint}>Henüz kayıt yok</Text>
          </View>
        ))}
      </View>

      <Card title="Günün adımı" subtitle="Kendi belirlediğin tempoda ilerle.">
        <EmptyState
          emoji="👣"
          title="Henüz bir adım tanımlanmadı"
          description="Yolculuk sekmesinden kendine küçük bir adım ekleyebilirsin."
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: theme.space.xl,
    marginBottom: theme.space.xl,
    backgroundColor: "rgba(255,255,255,0.88)",
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.color.line.soft,
    padding: theme.space.xl,
  },
  sectionTitle: {
    fontSize: theme.font.size.md,
    fontWeight: theme.font.weight.semibold,
    color: theme.color.text.primary,
    marginBottom: theme.space.lg,
  },
  domainRow: {
    marginBottom: theme.space.lg,
  },
  domainLabel: {
    fontSize: theme.font.size.sm,
    color: theme.color.text.primary,
    marginBottom: theme.space.xs,
  },
  barTrack: {
    height: 8,
    backgroundColor: theme.color.surface.sunken,
    borderRadius: theme.radius.sm,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    backgroundColor: theme.color.brand.rose,
    borderRadius: theme.radius.sm,
  },
  domainHint: {
    marginTop: theme.space.xs,
    fontSize: theme.font.size.xs,
    color: theme.color.text.tertiary,
  },
  placeholder: {
    color: theme.color.text.secondary,
  },
});
