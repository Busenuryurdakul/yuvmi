import { StyleSheet, Text, View } from "react-native";
import { APP_NAME } from "@yuvmi/shared";
import { theme } from "@/theme";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  showBrand?: boolean;
};

export function PageHeader({ title, subtitle, showBrand = false }: PageHeaderProps) {
  return (
    <View style={styles.container}>
      {showBrand ? (
        <View style={styles.brandRow}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>y</Text>
          </View>
          <Text style={styles.brand}>{APP_NAME}</Text>
        </View>
      ) : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.space.xl,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space.sm,
    marginBottom: theme.space.xl,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.color.brand.rose,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: theme.font.weight.semibold,
  },
  brand: {
    fontSize: theme.font.size.xl,
    fontWeight: theme.font.weight.semibold,
    color: theme.color.text.primary,
  },
  title: {
    fontSize: theme.font.size.xxl,
    fontWeight: theme.font.weight.semibold,
    color: theme.color.text.primary,
    lineHeight: 34,
  },
  subtitle: {
    marginTop: theme.space.sm,
    fontSize: theme.font.size.md,
    lineHeight: 24,
    color: theme.color.text.secondary,
  },
});
