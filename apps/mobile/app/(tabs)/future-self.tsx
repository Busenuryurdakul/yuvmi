import { StyleSheet, Text, View } from "react-native";
import { LIFE_DOMAINS } from "@yuvmi/shared";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { theme } from "@/theme";

const featuredDomains = ["personal_growth", "peace", "creativity"] as const;

export default function FutureSelfScreen() {
  const hasProfile = false;

  return (
    <Screen>
      <PageHeader
        title="Gelecekteki Ben"
        subtitle="Hayalindeki halini tanımla — kendi kelimelerinle, kendi hızında."
      />

      {hasProfile ? (
        <Card title="Profilin">
          <Text style={styles.placeholder}>Profil detayları burada görünecek.</Text>
        </Card>
      ) : (
        <Card>
          <EmptyState
            emoji="✦"
            title="Gelecekteki halini henüz tanımlamadın"
            description="Vizyonunu, önem verdiğin alanları ve kendine söylediğin olumlamaları burada oluşturacaksın."
          />
          <Button label="Profil oluştur" onPress={() => {}} />
        </Card>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Yaşam alanları</Text>
        <Text style={styles.sectionHint}>
          Sana en yakın hissettiren alanları seç. Hepsini doldurmak zorunda değilsin.
        </Text>
        <View style={styles.chips}>
          {featuredDomains.map((domain) => (
            <View key={domain} style={styles.chip}>
              <Text style={styles.chipText}>
                {LIFE_DOMAINS[domain].emoji} {LIFE_DOMAINS[domain].label.tr}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <Card title="Olumlamalar" subtitle="Gelecekteki senin sesi — kısa ve samimi.">
        <EmptyState
          emoji="💬"
          title="Henüz olumlama yok"
          description="Kendine söylemek istediğin birkaç cümle ekleyebilirsin."
        />
      </Card>

      <Card title="Vizyon panosu" subtitle="Görsel referanslar — ileride eklenecek.">
        <EmptyState
          emoji="🖼️"
          title="Henüz görsel yok"
          description="İlham veren görselleri burada toplayacaksın."
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    marginVertical: theme.space.xl,
  },
  sectionTitle: {
    fontSize: theme.font.size.md,
    fontWeight: theme.font.weight.semibold,
    color: theme.color.text.primary,
    marginBottom: theme.space.xs,
  },
  sectionHint: {
    fontSize: theme.font.size.sm,
    color: theme.color.text.secondary,
    lineHeight: 20,
    marginBottom: theme.space.lg,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.space.sm,
  },
  chip: {
    backgroundColor: theme.color.surface.raised,
    borderWidth: 1,
    borderColor: theme.color.line.soft,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.sm,
  },
  chipText: {
    fontSize: theme.font.size.sm,
    color: theme.color.text.primary,
  },
  placeholder: {
    color: theme.color.text.secondary,
  },
});
