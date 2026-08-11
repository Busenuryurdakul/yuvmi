import { StyleSheet, Text, View } from "react-native";
import { SPACE_TYPES, type SpaceType } from "@yuvmi/shared";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { theme } from "@/theme";

const spaceOrder: SpaceType[] = ["personal", "couple", "friends", "family"];

export default function SpacesScreen() {
  return (
    <Screen>
      <PageHeader
        title="Alanlar"
        subtitle="Kişisel yolculuğundan ortak alanlara — ne paylaşacağına sen karar ver."
      />

      {spaceOrder.map((type) => (
        <Card
          key={type}
          title={SPACE_TYPES[type].label.tr}
          subtitle={SPACE_TYPES[type].description.tr}
          style={styles.card}
        >
          {type === "personal" ? (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>Varsayılan alanın</Text>
            </View>
          ) : (
            <Button
              label="Alan oluştur / davet et"
              variant="secondary"
              onPress={() => {}}
            />
          )}
        </Card>
      ))}

      <Text style={styles.note}>
        Ortak alanlar karşılıklı onayla açılır. Kişisel günlük ve notların otomatik
        paylaşılmaz.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: theme.space.lg,
  },
  activeBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(91, 138, 138, 0.12)",
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.sm,
  },
  activeBadgeText: {
    fontSize: theme.font.size.sm,
    fontWeight: theme.font.weight.medium,
    color: theme.color.brand.tealText,
  },
  note: {
    marginTop: theme.space.sm,
    fontSize: theme.font.size.xs,
    lineHeight: 18,
    color: theme.color.text.tertiary,
    textAlign: "center",
  },
});
