import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { APP_NAME, APP_TAGLINE } from "@yuvmi/shared";
import { Screen } from "@/components/ui/Screen";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/context/AuthContext";
import { theme } from "@/theme";

export default function WelcomeScreen() {
  const { signInWithGoogle, signInWithApple, isGoogleConfigured } = useAuth();
  const [loadingProvider, setLoadingProvider] = useState<"google" | "apple" | null>(null);

  async function handleSignIn(provider: "google" | "apple") {
    setLoadingProvider(provider);
    const result =
      provider === "google" ? await signInWithGoogle() : await signInWithApple();

    if (!result.ok && result.message) {
      Alert.alert("Giriş yapılamadı", result.message);
    } else if (result.message) {
      Alert.alert("Bilgi", result.message);
    }

    setLoadingProvider(null);
  }

  return (
    <Screen scroll={false} padded={false}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>y</Text>
          </View>
          <Text style={styles.brand}>{APP_NAME}</Text>
          <Text style={styles.tagline}>{APP_TAGLINE}</Text>
          <Text style={styles.description}>
            Kişisel yolculuğunu kendi hızında tanımla. Sabit süreler yok — süreç sana özel.
          </Text>
        </View>

        <Card title="Başla" subtitle="Google veya Apple ile devam et.">
          <View style={styles.actions}>
            <Button
              label="Google ile devam et"
              variant="google"
              loading={loadingProvider === "google"}
              disabled={loadingProvider !== null && loadingProvider !== "google"}
              onPress={() => handleSignIn("google")}
            />
            <Button
              label="Apple ile devam et"
              variant="apple"
              loading={loadingProvider === "apple"}
              disabled={loadingProvider !== null && loadingProvider !== "apple"}
              onPress={() => handleSignIn("apple")}
            />
          </View>
          {!isGoogleConfigured ? (
            <Text style={styles.hint}>
              Google istemci kimliği tanımlı değil — geliştirme modunda oturum açılır.
            </Text>
          ) : null}
        </Card>

        <Text style={styles.footer}>
          Yuvmi terapi, fal veya rüya yorumu sunmaz. Verilerin varsayılan olarak özeldir.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: theme.space.xl,
    paddingTop: theme.space.xxxl * 2,
    paddingBottom: theme.space.xxxl,
  },
  hero: {
    alignItems: "center",
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.color.brand.rose,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.space.lg,
  },
  logoText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: theme.font.weight.semibold,
  },
  brand: {
    fontSize: theme.font.size.display,
    fontWeight: theme.font.weight.semibold,
    color: theme.color.text.primary,
    marginBottom: theme.space.sm,
  },
  tagline: {
    fontSize: theme.font.size.lg,
    fontWeight: theme.font.weight.medium,
    color: theme.color.brand.roseText,
    textAlign: "center",
    marginBottom: theme.space.lg,
  },
  description: {
    fontSize: theme.font.size.md,
    lineHeight: 24,
    color: theme.color.text.secondary,
    textAlign: "center",
    maxWidth: 320,
  },
  actions: {
    gap: theme.space.md,
  },
  hint: {
    marginTop: theme.space.lg,
    fontSize: theme.font.size.xs,
    lineHeight: 18,
    color: theme.color.text.tertiary,
    textAlign: "center",
  },
  footer: {
    fontSize: theme.font.size.xs,
    lineHeight: 18,
    color: theme.color.text.tertiary,
    textAlign: "center",
  },
});
