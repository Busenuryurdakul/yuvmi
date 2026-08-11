import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { theme } from "@/theme";
import { Button } from "@/components/ui/Button";

type CheckInFormProps = {
  initial?: { mood?: number; energy?: number; gratitude?: string[]; reflection?: string };
  onSubmit: (data: { mood: number; energy: number; gratitude: string[]; reflection: string }) => void;
  loading?: boolean;
};

function SliderRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.dots}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            style={[styles.dot, value >= n && styles.dotActive]}
          />
        ))}
      </View>
      <Text style={styles.value}>{value}/5</Text>
    </View>
  );
}

export function CheckInForm({ initial, onSubmit, loading }: CheckInFormProps) {
  const [mood, setMood] = useState(initial?.mood ?? 3);
  const [energy, setEnergy] = useState(initial?.energy ?? 3);
  const [gratitude, setGratitude] = useState(initial?.gratitude?.join(", ") ?? "");
  const [reflection, setReflection] = useState(initial?.reflection ?? "");

  return (
    <View>
      <SliderRow label="Ruh hâlin" value={mood} onChange={setMood} />
      <SliderRow label="Enerjin" value={energy} onChange={setEnergy} />
      <Text style={styles.rowLabel}>Minnet (virgülle, en fazla 3)</Text>
      <TextInput
        style={styles.input}
        value={gratitude}
        onChangeText={setGratitude}
        placeholder="Kahve, güneş, arkadaşım"
        placeholderTextColor={theme.color.text.tertiary}
      />
      <Text style={styles.rowLabel}>Kısa yansıma (opsiyonel)</Text>
      <TextInput
        style={[styles.input, styles.textarea]}
        value={reflection}
        onChangeText={setReflection}
        multiline
        placeholder="Bugün aklında kalan bir şey..."
        placeholderTextColor={theme.color.text.tertiary}
      />
      <Button
        label="Kaydet"
        loading={loading}
        onPress={() =>
          onSubmit({
            mood,
            energy,
            gratitude: gratitude
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
              .slice(0, 3),
            reflection,
          })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: theme.space.lg },
  rowLabel: {
    fontSize: theme.font.size.sm,
    fontWeight: theme.font.weight.medium,
    color: theme.color.text.primary,
    marginBottom: theme.space.sm,
  },
  dots: { flexDirection: "row", gap: theme.space.sm, alignItems: "center" },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.color.line.firm,
    backgroundColor: theme.color.surface.raised,
  },
  dotActive: { backgroundColor: theme.color.brand.rose, borderColor: theme.color.brand.rose },
  value: { marginTop: theme.space.xs, fontSize: theme.font.size.xs, color: theme.color.text.tertiary },
  input: {
    borderWidth: 1,
    borderColor: theme.color.line.firm,
    borderRadius: theme.radius.md,
    padding: theme.space.md,
    fontSize: theme.font.size.md,
    color: theme.color.text.primary,
    backgroundColor: theme.color.surface.raised,
    marginBottom: theme.space.lg,
  },
  textarea: { minHeight: 96, textAlignVertical: "top" },
});
