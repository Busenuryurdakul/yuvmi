import { ActivityIndicator, StyleSheet, View } from "react-native";
import { theme } from "@/theme";

export function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={theme.color.brand.rose} />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.color.surface.base,
  },
});
