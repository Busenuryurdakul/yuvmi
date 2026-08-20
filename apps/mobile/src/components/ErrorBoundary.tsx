import { Component, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "@/theme";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <View style={styles.root}>
          <Text style={styles.title}>Bir şeyler ters gitti</Text>
          <Text style={styles.message}>{this.state.error.message || "Beklenmeyen bir hata oluştu."}</Text>
          <Pressable accessibilityRole="button" onPress={this.reset} style={styles.button}>
            <Text style={styles.buttonText}>Yeniden dene</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.color.mist,
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.color.ink,
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    color: theme.color.ink70,
    textAlign: "center",
    marginBottom: 20,
  },
  button: {
    backgroundColor: theme.color.blue,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
