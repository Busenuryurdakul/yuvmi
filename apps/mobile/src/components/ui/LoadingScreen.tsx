import { ActivityIndicator, StyleSheet, View } from "react-native";
import { AmbientBackground } from "@/components/ui/Glass";
import { theme } from "@/theme";

type LoadingScreenProps = {
  tone?: "paper" | "ink";
};

export function LoadingScreen({ tone = "paper" }: LoadingScreenProps) {
  const ink = tone === "ink";
  return (
    <View style={[styles.loading, ink && styles.ink]}>
      {ink ? null : <AmbientBackground />}
      <ActivityIndicator size="large" color={ink ? theme.color.onInk : theme.color.blue} />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.color.mist,
  },
  ink: {
    backgroundColor: theme.color.ink,
  },
});
