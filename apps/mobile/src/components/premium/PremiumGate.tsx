import { StyleSheet, Text, View, type ViewProps } from "react-native";
import { router } from "expo-router";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useSubscription } from "@/hooks/useSubscription";
import { theme } from "@/theme";

type PremiumGateProps = ViewProps & {
  feature: string;
  description?: string;
  children: React.ReactNode;
};

export function PremiumGate({ feature, description, children, style, ...props }: PremiumGateProps) {
  const { isPremium, loading } = useSubscription();

  if (loading || isPremium) {
    return (
      <View style={style} {...props}>
        {children}
      </View>
    );
  }

  return (
    <View style={style} {...props}>
      <Card title="Premium özellik" subtitle={feature}>
        <Text style={styles.description}>
          {description ??
            "Bu özellik Premium plana dahil. Birden fazla hedef, ek ortak alan ve veri dışa aktarma gibi avantajlarla yolculuğunu derinleştirebilirsin."}
        </Text>
        <Button label="Premium'u keşfet" onPress={() => router.push("/premium")} />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  description: {
    fontSize: theme.font.size.sm,
    lineHeight: 22,
    color: theme.color.text.secondary,
    marginBottom: theme.space.lg,
  },
});
