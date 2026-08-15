import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { APP_NAME } from "@yuvmi/shared";
import { Eyebrow } from "@/components/ui/Glass";
import { theme } from "@/theme";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  eyebrowRight?: string | React.ReactNode;
  showBrand?: boolean;
};

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  eyebrowRight,
  showBrand = false,
}: PageHeaderProps) {
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
      {eyebrow || eyebrowRight ? (
        <View style={styles.toprow}>
          <Eyebrow>{eyebrow ?? " "}</Eyebrow>
          {eyebrowRight ? (
            typeof eyebrowRight === "string" ? (
              <Eyebrow>{eyebrowRight}</Eyebrow>
            ) : (
              eyebrowRight
            )
          ) : null}
        </View>
      ) : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
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
    backgroundColor: theme.color.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: "#fff",
    fontSize: 18,
    fontFamily: theme.font.sansBold,
    fontWeight: theme.font.weight.bold,
  },
  brand: {
    fontSize: theme.font.size.xl,
    fontFamily: theme.font.sansBold,
    fontWeight: theme.font.weight.bold,
    color: theme.color.ink,
  },
  toprow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 14,
  },
  title: {
    fontFamily: theme.font.sansExtra,
    fontSize: 30,
    fontWeight: theme.font.weight.extra,
    color: theme.color.ink,
    letterSpacing: -0.8,
    lineHeight: 34,
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 18,
    fontFamily: theme.font.sans,
    fontSize: 14,
    lineHeight: 22,
    color: theme.color.ink70,
  },
});
