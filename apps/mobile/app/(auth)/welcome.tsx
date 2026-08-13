import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { APP_NAME, APP_TAGLINE } from "@yuvmi/shared";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AmbientBackground, Glass } from "@/components/ui/Glass";
import { useAuth } from "@/context/AuthContext";
import { theme } from "@/theme";

function showMessage(title: string, message: string) {
  if (typeof window !== "undefined" && typeof window.alert === "function") {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { signInWithGoogle, signInWithApple, signInWithEmail, isGoogleConfigured } = useAuth();
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn(provider: "google" | "apple") {
    setError(null);
    setLoadingProvider(provider);
    const result = provider === "google" ? await signInWithGoogle() : await signInWithApple();
    if (!result.ok) {
      const message = result.message ?? "Giriş yapılamadı.";
      setError(message);
      showMessage("Giriş yapılamadı", message);
    } else {
      if (result.message) showMessage("Bilgi", result.message);
      router.replace("/");
    }
    setLoadingProvider(null);
  }

  async function handleEmail() {
    setError(null);

    if (!email.trim()) {
      setError("E-posta gerekli.");
      return;
    }
    if (password.length < 8) {
      setError("Şifre en az 8 karakter olmalı.");
      return;
    }
    if (mode === "register" && (!firstName.trim() || !lastName.trim())) {
      setError("Kayıt için ad ve soyad gerekli.");
      return;
    }

    setLoadingProvider("email");
    const result = await signInWithEmail({
      email: email.trim(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      mode,
    });
    if (!result.ok) {
      const message = result.message ?? "Giriş yapılamadı.";
      setError(message);
      showMessage("Giriş yapılamadı", message);
    } else {
      router.replace("/");
    }
    setLoadingProvider(null);
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + theme.space.xxl }]}>
      <AmbientBackground />
      <View style={styles.hero}>
        <Text style={styles.brand}>{APP_NAME}</Text>
        <Text style={styles.tagline}>{APP_TAGLINE}</Text>
      </View>

      <View style={[styles.sheetWrap, { paddingBottom: insets.bottom + theme.space.sm }]}>
        <Glass intensity={52} style={styles.sheet}>
          <Text style={styles.sheetTitle}>{mode === "login" ? "Giriş" : "Kayıt"}</Text>
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
          {error ? <Text style={styles.error}>{error}</Text> : null}
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

          <View style={styles.oauth}>
            <Button
              label="Google ile devam et"
              variant="secondary"
              loading={loadingProvider === "google"}
              disabled={loadingProvider !== null && loadingProvider !== "google"}
              onPress={() => void handleSignIn("google")}
            />
            <Button
              label="Apple ile devam et"
              variant="secondary"
              loading={loadingProvider === "apple"}
              disabled={loadingProvider !== null && loadingProvider !== "apple"}
              onPress={() => void handleSignIn("apple")}
            />
          </View>
          {!isGoogleConfigured ? (
            <Text style={styles.hint}>OAuth dev modunda backend oturumu açılır.</Text>
          ) : null}
        </Glass>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.color.mist,
    justifyContent: "space-between",
  },
  hero: {
    paddingHorizontal: 22,
  },
  brand: {
    fontFamily: theme.font.sansExtra,
    fontSize: 40,
    fontWeight: theme.font.weight.extra,
    color: theme.color.ink,
    letterSpacing: -1,
  },
  tagline: {
    marginTop: theme.space.sm,
    fontFamily: theme.font.sans,
    fontSize: 14.5,
    color: theme.color.ink70,
    lineHeight: 22,
  },
  sheetWrap: {
    paddingHorizontal: 14,
  },
  sheet: {
    paddingHorizontal: 19,
    paddingTop: 22,
    paddingBottom: 18,
    borderRadius: 28,
  },
  sheetTitle: {
    color: theme.color.ink,
    fontFamily: theme.font.sansExtra,
    fontSize: 21,
    fontWeight: theme.font.weight.extra,
    marginBottom: theme.space.lg,
    letterSpacing: -0.4,
  },
  oauth: {
    marginTop: theme.space.lg,
    gap: theme.space.sm,
  },
  hint: {
    marginTop: theme.space.md,
    fontFamily: theme.font.sans,
    fontSize: theme.font.size.xs,
    color: theme.color.ink40,
    textAlign: "center",
  },
  switchMode: {
    textAlign: "center",
    color: theme.color.ink70,
    fontFamily: theme.font.sans,
    fontSize: theme.font.size.sm,
    marginTop: theme.space.sm,
  },
  error: {
    color: theme.color.danger,
    fontFamily: theme.font.sans,
    fontSize: theme.font.size.sm,
    textAlign: "center",
    marginBottom: theme.space.sm,
  },
});
