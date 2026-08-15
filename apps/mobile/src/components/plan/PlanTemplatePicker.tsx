import { Pressable, StyleSheet, Text, View } from "react-native";
import { PLAN_TEMPLATES, type PlanTemplate } from "@yuvmi/shared";
import { theme } from "@/theme";

type PlanTemplatePickerProps = {
  selectedId?: string;
  onSelect: (template: PlanTemplate) => void;
};

export function PlanTemplatePicker({ selectedId, onSelect }: PlanTemplatePickerProps) {
  return (
    <View style={styles.list}>
      {PLAN_TEMPLATES.map((template) => {
        const active = selectedId === template.id;
        return (
          <Pressable
            key={template.id}
            onPress={() => onSelect(template)}
            style={[styles.card, active && styles.cardActive]}
          >
            <Text style={styles.title}>{template.title}</Text>
            <Text style={styles.description}>{template.description}</Text>
            <Text style={styles.meta}>{template.steps.length} adım iskeleti</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: theme.space.md },
  card: {
    borderWidth: 1,
    borderColor: theme.color.line.soft,
    borderRadius: theme.radius.lg,
    padding: theme.space.lg,
    backgroundColor: theme.color.surface.raised,
  },
  cardActive: {
    borderColor: theme.color.brand.rose,
    backgroundColor: theme.color.surface.sunken,
  },
  title: {
    fontSize: theme.font.size.md,
    fontWeight: theme.font.weight.semibold,
    color: theme.color.text.primary,
    marginBottom: theme.space.xs,
  },
  description: {
    fontSize: theme.font.size.sm,
    color: theme.color.text.secondary,
    lineHeight: 20,
  },
  meta: {
    marginTop: theme.space.sm,
    fontSize: theme.font.size.xs,
    color: theme.color.text.tertiary,
  },
});
