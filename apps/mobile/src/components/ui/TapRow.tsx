import { Pressable, StyleSheet, Text, View } from "react-native";
import { Glass } from "@/components/ui/Glass";
import { theme } from "@/theme";

type TapRowProps = {
  title: string;
  subtitle?: string;
  arrow?: string;
  nested?: boolean;
  onPress?: () => void;
};

export function TapRow({ title, subtitle, arrow = "→", nested, onPress }: TapRowProps) {
  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <Glass style={[styles.tap, nested && styles.nested]}>
        <View style={styles.text}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
        </View>
        <Text style={styles.arrow}>{arrow}</Text>
      </Glass>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tap: {
    paddingVertical: 15,
    paddingHorizontal: 16,
    marginBottom: 9,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  nested: {
    marginBottom: 0,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  text: {
    flex: 1,
  },
  title: {
    fontFamily: theme.font.sansBold,
    fontSize: 15,
    fontWeight: theme.font.weight.bold,
    color: theme.color.ink,
  },
  sub: {
    marginTop: 3,
    fontFamily: theme.font.sans,
    fontSize: 12.5,
    color: theme.color.ink70,
    lineHeight: 18,
  },
  arrow: {
    color: theme.color.blue,
    fontSize: 17,
  },
});
