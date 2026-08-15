import { Pressable, StyleSheet, Text, View } from "react-native";
import { LIFE_DOMAINS, type LifeDomain, type PlanTemplate } from "@yuvmi/shared";
import { theme } from "@/theme";

/** TODO(AI): AI önerisi geldiğinde sectionLabel "Senin için öneriler" + AIBadge */

type PlanTemplatePickerProps = {
  templates: PlanTemplate[];
  selectedId?: string;
  onSelect: (template: PlanTemplate) => void;
  recommended?: boolean;
};

function domainLabel(domain: PlanTemplate["domain"]): string {
  if (domain === "generic") return "Genel";
  return LIFE_DOMAINS[domain as LifeDomain]?.label.tr ?? domain;
}

export function PlanTemplatePicker({
  templates,
  selectedId,
  onSelect,
  recommended = false,
}: PlanTemplatePickerProps) {
  if (templates.length === 0) {
    return (
      <Text style={styles.empty}>Henüz şablon yok — bir sonraki adımda planını sıfırdan kurabilirsin.</Text>
    );
  }

  return (
    <View style={styles.wrap}>
      {recommended ? (
        <Text style={styles.sectionLabel}>Seçtiğin alanlara göre önerilen planlar</Text>
      ) : null}
      <View style={styles.list}>
        {templates.map((template) => {
          const active = selectedId === template.id;
          return (
            <Pressable
              key={template.id}
              onPress={() => onSelect(template)}
              style={[styles.card, active && styles.cardActive]}
            >
              <View style={styles.cardTop}>
                <Text style={styles.title}>{template.title}</Text>
                <Text style={[styles.badge, active && styles.badgeActive]}>{domainLabel(template.domain)}</Text>
              </View>
              <Text style={styles.description}>{template.description}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.space.sm },
  sectionLabel: {
    fontSize: theme.font.size.xs,
    fontWeight: theme.font.weight.medium,
    color: theme.color.text.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: theme.space.xs,
  },
  list: { gap: theme.space.md },
  card: {
    borderWidth: 1,
    borderColor: theme.color.line.soft,
    borderRadius: theme.radius.lg,
    padding: theme.space.lg,
    backgroundColor: theme.color.surface.raised,
  },
  cardActive: {
    borderColor: theme.color.blue,
    backgroundColor: "rgba(37,99,235,0.06)",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.space.sm,
    marginBottom: theme.space.xs,
  },
  title: {
    flex: 1,
    fontSize: theme.font.size.md,
    fontWeight: theme.font.weight.semibold,
    color: theme.color.text.primary,
  },
  badge: {
    fontSize: theme.font.size.xs,
    color: theme.color.inkMuted,
    backgroundColor: theme.color.surface.sunken,
    paddingHorizontal: theme.space.sm,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
    overflow: "hidden",
  },
  badgeActive: {
    backgroundColor: theme.color.blue,
    color: "#fff",
  },
  description: {
    fontSize: theme.font.size.sm,
    color: theme.color.text.secondary,
    lineHeight: 20,
  },
  empty: {
    fontSize: theme.font.size.sm,
    color: theme.color.text.secondary,
    lineHeight: 20,
  },
});
