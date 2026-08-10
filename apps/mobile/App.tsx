import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { APP_NAME, APP_TAGLINE, LIFE_DOMAINS } from "@yuvmi/shared";

const domains = ["career", "relationships", "health", "peace"] as const;

export default function App() {
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#fdf8f5", "#f3e0e3", "#fdf8f5"]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.logoRow}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>y</Text>
          </View>
          <Text style={styles.brand}>{APP_NAME}</Text>
        </View>

        <Text style={styles.tagline}>{APP_TAGLINE}</Text>
        <Text style={styles.subtitle}>
          Bugünkü halinle gelecekteki sen arasındaki mesafeyi gör. Kişisel,
          çift veya arkadaş alanlarında yolculuğuna devam et.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Bugünün özeti</Text>
          {domains.map((domain) => (
            <View key={domain} style={styles.domainRow}>
              <Text style={styles.domainLabel}>
                {LIFE_DOMAINS[domain].emoji} {LIFE_DOMAINS[domain].label.tr}
              </Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width:
                        domain === "career"
                          ? "70%"
                          : domain === "relationships"
                            ? "55%"
                            : domain === "health"
                              ? "80%"
                              : "62%",
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.primaryButton} activeOpacity={0.85}>
          <Text style={styles.primaryButtonText}>Günlük check-in yap</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.85}>
          <Text style={styles.secondaryButtonText}>Gelecekteki seni tanımla</Text>
        </TouchableOpacity>
      </ScrollView>
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 40,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 32,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#c4717b",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
  },
  brand: {
    fontSize: 24,
    fontWeight: "600",
    color: "#2d2a26",
  },
  tagline: {
    fontSize: 28,
    fontWeight: "600",
    lineHeight: 36,
    color: "#2d2a26",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: "#6b6560",
    marginBottom: 28,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 20,
    padding: 20,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: "rgba(45,42,38,0.08)",
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b6560",
    marginBottom: 16,
  },
  domainRow: {
    marginBottom: 14,
  },
  domainLabel: {
    fontSize: 14,
    marginBottom: 6,
    color: "#2d2a26",
  },
  barTrack: {
    height: 8,
    backgroundColor: "rgba(45,42,38,0.06)",
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: "#c4717b",
  },
  primaryButton: {
    backgroundColor: "#c4717b",
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(45,42,38,0.12)",
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  secondaryButtonText: {
    color: "#2d2a26",
    fontSize: 16,
    fontWeight: "600",
  },
});
