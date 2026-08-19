import { useState } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Card } from "@/components/ui/Card";
import { domainDisplayLabel } from "@/components/future-self/DomainChipGrid";
import type { FutureSelfResponse } from "@/lib/api/types";
import { theme } from "@/theme";

type FutureSelfExpandableCardProps = {
  profile: FutureSelfResponse;
  style?: StyleProp<ViewStyle>;
};

export function FutureSelfExpandableCard({ profile, style }: FutureSelfExpandableCardProps) {
  const [open, setOpen] = useState(false);
  const preview = profile.description || profile.title;

  return (
    <Card style={style}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={styles.head}
      >
        <Text style={styles.title}>Gelecekteki Ben</Text>
        <View style={styles.headRight}>
          <Text style={styles.tapHint}>{open ? "Gizle" : "Detaylar"}</Text>
          <Text style={[styles.chev, open && styles.chevOpen]}>▾</Text>
        </View>
      </Pressable>

      {!open ? (
        <>
          <Text style={styles.preview} numberOfLines={2}>
            {preview}
          </Text>
          <View style={styles.tags}>
            {profile.domains.slice(0, 4).map((d) => (
              <Text key={d} style={styles.tag}>
                {domainDisplayLabel(d)}
              </Text>
            ))}
            {profile.domains.length > 4 ? (
              <Text style={styles.tagMore}>+{profile.domains.length - 4}</Text>
            ) : null}
          </View>
        </>
      ) : (
        <View style={styles.details}>
          {profile.title && profile.title !== "Gelecekteki Ben" ? (
            <View style={styles.block}>
              <Text style={styles.detailLabel}>Başlık</Text>
              <Text style={styles.detailBody}>{profile.title}</Text>
            </View>
          ) : null}

          {profile.description ? (
            <View style={styles.block}>
              <Text style={styles.detailLabel}>Hayalindeki halin</Text>
              <Text style={styles.detailBody}>{profile.description}</Text>
            </View>
          ) : null}

          {profile.domains.length > 0 ? (
            <View style={styles.block}>
              <Text style={styles.detailLabel}>Büyümek istediğin alanlar</Text>
              <View style={styles.tags}>
                {profile.domains.map((d) => (
                  <Text key={d} style={styles.tag}>
                    {domainDisplayLabel(d)}
                  </Text>
                ))}
              </View>
            </View>
          ) : null}

          {profile.affirmations?.[0] ? (
            <View style={styles.block}>
              <Text style={styles.detailLabel}>Olumlama</Text>
              <Text style={styles.affirmation}>“{profile.affirmations[0]}”</Text>
            </View>
          ) : null}

          {profile.visionItems.length > 0 ? (
            <View style={styles.block}>
              <Text style={styles.detailLabel}>Vizyon notları</Text>
              {profile.visionItems.map((item) => (
                <Text key={item.id} style={styles.visionItem}>
                  · {item.title}
                </Text>
              ))}
            </View>
          ) : null}

          <Text style={styles.footerHint}>Hedefini yazarken bu vizyonu referans al.</Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.space.sm,
    gap: theme.space.sm,
  },
  title: {
    fontFamily: theme.font.sansBold,
    fontSize: 16.5,
    fontWeight: theme.font.weight.bold,
    color: theme.color.ink,
    flex: 1,
  },
  headRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tapHint: {
    fontSize: theme.font.size.xs,
    color: theme.color.blueDeep,
    fontWeight: theme.font.weight.medium,
  },
  chev: {
    fontSize: 14,
    color: theme.color.blueDeep,
    transform: [{ rotate: "-90deg" }],
  },
  chevOpen: {
    transform: [{ rotate: "0deg" }],
  },
  preview: {
    fontSize: theme.font.size.sm,
    color: theme.color.text.secondary,
    lineHeight: 20,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.space.sm,
    marginTop: theme.space.md,
  },
  tag: {
    fontSize: theme.font.size.xs,
    color: theme.color.ink40,
    backgroundColor: theme.color.surface.sunken,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.xs,
    borderRadius: theme.radius.pill,
  },
  tagMore: {
    fontSize: theme.font.size.xs,
    color: theme.color.text.tertiary,
    alignSelf: "center",
  },
  details: {
    gap: theme.space.md,
    paddingTop: theme.space.xs,
  },
  block: {
    gap: theme.space.xs,
  },
  detailLabel: {
    fontSize: theme.font.size.xs,
    fontWeight: theme.font.weight.semibold,
    color: theme.color.text.tertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailBody: {
    fontSize: theme.font.size.sm,
    color: theme.color.text.primary,
    lineHeight: 22,
  },
  affirmation: {
    fontSize: theme.font.size.sm,
    color: theme.color.text.primary,
    lineHeight: 22,
  },
  visionItem: {
    fontSize: theme.font.size.sm,
    color: theme.color.text.secondary,
    lineHeight: 20,
  },
  footerHint: {
    fontSize: theme.font.size.xs,
    color: theme.color.text.secondary,
    lineHeight: 18,
    marginTop: theme.space.xs,
  },
});
