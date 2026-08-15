import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { Button } from "@/components/ui/Button";
import { theme } from "@/theme";

export default function OnboardingCompleteScreen() {
  return (
    <Screen scroll={false}>
      <View style={styles.center}>
        <Text style={styles.emoji}>🌱</Text>
        <Text style={styles.title}>Yolculuğun başladı</Text>
        <Text style={styles.body}>
          Bugün ekranından check-in yapabilir ve ilk adımını tamamlayabilirsin.
        </Text>
        <Button label="Bugün'e git" onPress={() => router.replace("/(tabs)")} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: theme.space.xl,
    gap: theme.space.lg,
  },
  emoji: { fontSize: 48, textAlign: "center" },
  title: {
    fontSize: theme.font.size.xxl,
    fontWeight: theme.font.weight.semibold,
    color: theme.color.text.primary,
    textAlign: "center",
  },
  body: {
    fontSize: theme.font.size.md,
    lineHeight: 24,
    color: theme.color.text.secondary,
    textAlign: "center",
    marginBottom: theme.space.lg,
  },
});
