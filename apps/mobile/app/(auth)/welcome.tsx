import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { APP_NAME, APP_TAGLINE } from "@yuvmi/shared";
import { Screen } from "@/components/ui/Screen";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/context/AuthContext";
import { theme } from "@/theme";

export default function WelcomeScreen() {
  const { signInWithGoogle, signInWithApple, signInWithEmail, isGoogleConfigured } = useAuth();
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  async function handleSignIn(provider: "google" | "apple") {
    setLoadingProvider(provider);
    const result = provider === "google" ? await signInWithGoogle() : await signInWithApple();
    if (!result.ok && result.message) Alert.alert("Giriş yapılamadı", result.message);
    else if (result.message) Alert.alert("Bilgi", result.message);
    setLoadingProvider(null);
  }

  async function handleEmail() {
    setLoadingProvider("email");
    const result = await signInWithEmail({
      email: email.trim(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      mode,
    });
    if (!result.ok && result.message) Alert.alert("Giriş yapılamadı", result.message);
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
        </View>

        <Card title={mode === "login" ? "Giriş yap" : "Hesap oluştur"}>
          {mode === "register" ? (
            <>
              <Input label="Ad" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
              <Input label="Soyad" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
            </>
          ) : null}
          <Input
            label="E-posta"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Input label="Şifre" value={password} onChangeText={setPassword} secureTextEntry />
          <Button
            label={mode === "login" ? "Giriş yap" : "Kayıt ol"}
            loading={loadingProvider === "email"}
            onPress={() => void handleEmail()}
          />
          <Pressable onPress={() => setMode(mode === "login" ? "register" : "login")}>
            <Text style={styles.switchMode}>
              {mode === "login" ? "Hesabın yok mu? Kayıt ol" : "Zaten hesabın var mı? Giriş yap"}
            </Text>
          </Pressable>
          {mode === "login" ? (
            <Pressable onPress={() => router.push("/settings/forgot-password")}>
              <Text style={styles.switchMode}>Şifreni mi unuttun?</Text>
            </Pressable>
          ) : null}
        </Card>

        <Card title="veya" subtitle="OAuth ile devam">
          <View style={styles.actions}>
            <Button
              label="Google ile devam et"
              variant="google"
              loading={loadingProvider === "google"}
              disabled={loadingProvider !== null && loadingProvider !== "google"}
              onPress={() => void handleSignIn("google")}
            />
            <Button
              label="Apple ile devam et"
              variant="apple"
              loading={loadingProvider === "apple"}
              disabled={loadingProvider !== null && loadingProvider !== "apple"}
              onPress={() => void handleSignIn("apple")}
            />
          </View>
          {!isGoogleConfigured ? (
            <Text style={styles.hint}>OAuth dev modunda backend oturumu açılır.</Text>
          ) : null}
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: theme.space.xl,
    paddingVertical: theme.space.xxxl,
    gap: theme.space.lg,
  },
  hero: { alignItems: "center", marginBottom: theme.space.md },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.color.brand.rose,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.space.lg,
  },
  logoText: { color: "#fff", fontSize: 28, fontWeight: theme.font.weight.semibold },
  brand: {
    fontSize: theme.font.size.display,
    fontWeight: theme.font.weight.semibold,
    color: theme.color.text.primary,
  },
  tagline: {
    fontSize: theme.font.size.md,
    color: theme.color.brand.roseText,
    textAlign: "center",
    marginTop: theme.space.sm,
  },
  actions: { gap: theme.space.md },
  hint: { marginTop: theme.space.md, fontSize: theme.font.size.xs, color: theme.color.text.tertiary, textAlign: "center" },
  switchMode: {
    textAlign: "center",
    color: theme.color.brand.roseText,
    fontSize: theme.font.size.sm,
    marginTop: theme.space.sm,
  },
});
