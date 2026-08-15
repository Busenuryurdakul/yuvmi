import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { theme } from "@/theme";
import { Button } from "@/components/ui/Button";

type CheckInFormProps = {
  initial?: { mood?: number; energy?: number; gratitude?: string[]; reflection?: string };
  onSubmit: (data: { mood: number; energy: number; gratitude: string[]; reflection: string }) => void;
  loading?: boolean;
  tone?: "paper" | "ink";
};

function SliderRow({
  label,
  value,
  onChange,
  ink,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  ink: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, ink && styles.rowLabelInk]}>{label}</Text>
      <View style={styles.dots}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            style={[
              styles.dot,
              ink && styles.dotInk,
              value >= n && (ink ? styles.dotActiveInk : styles.dotActive),
            ]}
          />
        ))}
      </View>
      <Text style={[styles.value, ink && styles.valueInk]}>{value}/5</Text>
    </View>
  );
}

export function CheckInForm({ initial, onSubmit, loading, tone = "paper" }: CheckInFormProps) {
  const ink = tone === "ink";
  const [mood, setMood] = useState(initial?.mood ?? 3);
  const [energy, setEnergy] = useState(initial?.energy ?? 3);
  const [gratitude, setGratitude] = useState(initial?.gratitude?.join(", ") ?? "");
  const [reflection, setReflection] = useState(initial?.reflection ?? "");

  return (
    <View>
      <SliderRow label="Ruh hâlin" value={mood} onChange={setMood} ink={ink} />
      <SliderRow label="Enerjin" value={energy} onChange={setEnergy} ink={ink} />
      <Text style={[styles.rowLabel, ink && styles.rowLabelInk]}>Minnet (virgülle, en fazla 3)</Text>
      <TextInput
        style={[styles.input, ink && styles.inputInk]}
        value={gratitude}
        onChangeText={setGratitude}
        placeholder="Kahve, güneş, arkadaşım"
        placeholderTextColor={ink ? theme.color.inkMuted : theme.color.text.tertiary}
      />
      <Text style={[styles.rowLabel, ink && styles.rowLabelInk]}>Kısa yansıma (opsiyonel)</Text>
      <TextInput
        style={[styles.input, styles.textarea, ink && styles.inputInk]}
        value={reflection}
        onChangeText={setReflection}
        multiline
        placeholder="Bugün aklında kalan bir şey..."
        placeholderTextColor={ink ? theme.color.inkMuted : theme.color.text.tertiary}
      />
      <Button
        label={ink ? "KAYDET" : "Kaydet"}
        variant={ink ? "onInk" : "primary"}
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
    fontFamily: theme.font.sansMedium,
    fontSize: theme.font.size.sm,
    fontWeight: theme.font.weight.medium,
    color: theme.color.text.primary,
    marginBottom: theme.space.sm,
  },
  rowLabelInk: {
    color: theme.color.onInkMuted,
    letterSpacing: 0.6,
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
  dotInk: {
    borderColor: theme.color.inkLine,
    backgroundColor: "transparent",
  },
  dotActive: { backgroundColor: theme.color.brand.rose, borderColor: theme.color.brand.rose },
  dotActiveInk: { backgroundColor: theme.color.onInk, borderColor: theme.color.onInk },
  value: { marginTop: theme.space.xs, fontSize: theme.font.size.xs, color: theme.color.text.tertiary },
  valueInk: { color: theme.color.inkMuted },
  input: {
    borderWidth: 1,
    borderColor: theme.color.line.firm,
    borderRadius: theme.radius.md,
    padding: theme.space.md,
    fontFamily: theme.font.sans,
    fontSize: theme.font.size.md,
    color: theme.color.text.primary,
    backgroundColor: theme.color.surface.raised,
    marginBottom: theme.space.lg,
  },
  inputInk: {
    borderColor: theme.color.inkLine,
    backgroundColor: theme.color.inkRaised,
    color: theme.color.onInk,
  },
  textarea: { minHeight: 96, textAlignVertical: "top" },
});
