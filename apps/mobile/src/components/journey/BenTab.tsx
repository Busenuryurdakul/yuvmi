import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Eyebrow, Glass } from "@/components/ui/Glass";
import { SelfEditSheet, type SelfEditTarget } from "@/components/journey/SelfEditSheet";
import {
  persistSelfPhoto,
  saveSelfProfile,
  type SelfBubble,
  type SelfProfile,
} from "@/lib/local";
import { alert } from "@/lib/alert";
import { theme } from "@/theme";

/**
 * Fotoğrafın iki yanındaki sütunlara kaç baloncuk sığdığı. Kalanlar mottonun
 * altındaki sarmalayan sıraya düşüyor — böylece kullanıcı istediği kadar
 * baloncuk ekleyebilirken üstteki kompozisyon bozulmuyor.
 */
const FLANK_COUNT = 4;

type BenTabProps = {
  displayName: string;
  profile: SelfProfile;
  onChange: (next: SelfProfile) => void;
};

export function BenTab({ displayName, profile, onChange }: BenTabProps) {
  const [target, setTarget] = useState<SelfEditTarget | null>(null);
  const [picking, setPicking] = useState(false);

  const firstName = displayName.trim().split(/\s+/)[0] || "Sen";
  const shownName = profile.name?.trim() || firstName;
  const initial = shownName.slice(0, 1).toLocaleUpperCase("tr-TR");

  // Fotoğrafın solunda ve sağında ikişer baloncuk; sağ sütun aşağı kaydırılmış
  // olduğu için ikisi asla aynı hizada durmuyor.
  const flank = profile.bubbles.slice(0, FLANK_COUNT);
  const rest = profile.bubbles.slice(FLANK_COUNT);
  const left = flank.filter((_, i) => i % 2 === 0);
  const right = flank.filter((_, i) => i % 2 === 1);

  const commit = useCallback(
    (next: SelfProfile) => {
      onChange(next);
      void saveSelfProfile(next);
    },
    [onChange],
  );

  const saveBubble = useCallback(
    (id: string, question: string, answer: string) => {
      commit({
        ...profile,
        bubbles: profile.bubbles.map((b) => (b.id === id ? { ...b, question, answer } : b)),
      });
      setTarget(null);
    },
    [commit, profile],
  );

  const deleteBubble = useCallback(
    (id: string) => {
      commit({ ...profile, bubbles: profile.bubbles.filter((b) => b.id !== id) });
      setTarget(null);
    },
    [commit, profile],
  );

  const saveName = useCallback(
    (name: string) => {
      commit({ ...profile, name });
      setTarget(null);
    },
    [commit, profile],
  );

  const saveMotto = useCallback(
    (motto: string) => {
      commit({ ...profile, motto });
      setTarget(null);
    },
    [commit, profile],
  );

  const addBubble = useCallback(() => {
    const fresh: SelfBubble = { id: `s${Date.now()}`, question: "Yeni soru", answer: "" };
    commit({ ...profile, bubbles: [...profile.bubbles, fresh] });
    setTarget({ kind: "bubble", id: fresh.id, question: fresh.question, answer: "" });
  }, [commit, profile]);

  const pickPhoto = useCallback(async () => {
    if (picking) return;
    setPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.55,
        allowsEditing: true,
        aspect: [1, 1],
        base64: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.uri) return;
      const stored = await persistSelfPhoto(asset.uri, profile.photoUri, {
        base64: asset.base64,
        mimeType: asset.mimeType,
      });
      commit({ ...profile, photoUri: stored });
    } catch {
      alert("Fotoğraf seçilemedi", "Bir sorun oldu. Biraz sonra tekrar dene.");
    } finally {
      setPicking(false);
    }
  }, [commit, picking, profile]);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Adını değiştir"
        onPress={() => setTarget({ kind: "name", name: shownName === "Sen" ? "" : shownName })}
      >
        <Text style={styles.name}>{shownName}</Text>
      </Pressable>
      <Text style={styles.lede}>Ada dokunarak değiştir. Baloncuklar zorunlu değil.</Text>

      <View style={styles.hero}>
        <View style={[styles.col, styles.colUp]}>
          {left.map((b) => (
            <BubbleChip
              key={b.id}
              bubble={b}
              onPress={() => setTarget(toTarget(b))}
              hug="photo-right"
            />
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={profile.photoUri ? "Profil fotoğrafını değiştir" : "Profil fotoğrafı ekle"}
          onPress={() => void pickPhoto()}
          style={styles.photoWrap}
        >
          <View style={styles.ring}>
            {profile.photoUri ? (
              <Image source={{ uri: profile.photoUri }} style={styles.photo} contentFit="cover" />
            ) : (
              <View style={[styles.photo, styles.photoEmpty]}>
                <Text style={styles.photoInitial}>{initial}</Text>
              </View>
            )}
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>+</Text>
          </View>
        </Pressable>

        <View style={[styles.col, styles.colDown]}>
          {right.map((b) => (
            <BubbleChip
              key={b.id}
              bubble={b}
              onPress={() => setTarget(toTarget(b))}
              hug="photo-left"
            />
          ))}
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Hayat mottonu düzenle"
        onPress={() => setTarget({ kind: "motto", motto: profile.motto })}
      >
        <Glass style={styles.motto}>
          <Eyebrow style={styles.mottoLabel}>Hayat mottom</Eyebrow>
          {profile.motto ? (
            <Text style={styles.mottoText}>“{profile.motto}”</Text>
          ) : (
            <Text style={styles.mottoEmpty}>Seni taşıyan cümleyi yazmak için dokun</Text>
          )}
        </Glass>
      </Pressable>

      <View style={styles.wrapRow}>
        {rest.map((b) => (
          <BubbleChip key={b.id} bubble={b} onPress={() => setTarget(toTarget(b))} wide />
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kendi sorunu ekle"
          onPress={addBubble}
          style={styles.addChip}
        >
          <Text style={styles.addChipText}>Kendi sorunu ekle +</Text>
        </Pressable>
      </View>

      <Text style={styles.privacy}>
        Bu sayfa yalnızca sende. Paylaşmadığın sürece kimse göremez.
      </Text>

      <SelfEditSheet
        target={target}
        onClose={() => setTarget(null)}
        onSaveBubble={saveBubble}
        onDeleteBubble={deleteBubble}
        onSaveMotto={saveMotto}
        onSaveName={saveName}
      />
    </>
  );
}

function toTarget(b: SelfBubble): SelfEditTarget {
  return { kind: "bubble", id: b.id, question: b.question, answer: b.answer };
}

/** Sütun genişliğinin %86–100’ü — fark görünür, sütunu bozmaz. */
const CHIP_SPANS = [1, 0.88, 0.94, 0.9] as const;

function spanFor(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i++) n += id.charCodeAt(i) * (i + 3);
  return CHIP_SPANS[n % CHIP_SPANS.length];
}

type BubbleChipProps = {
  bubble: SelfBubble;
  onPress: () => void;
  wide?: boolean;
  /** Fotoğrafın solundaki sütun sağa, sağındaki sola yaslanır. */
  hug?: "photo-right" | "photo-left";
};

function BubbleChip({ bubble, onPress, wide, hug }: BubbleChipProps) {
  const filled = bubble.answer.trim().length > 0;
  const span = spanFor(bubble.id);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        filled ? `${bubble.question} ${bubble.answer}. Düzenle` : `${bubble.question} Doldur`
      }
      onPress={onPress}
      style={[
        styles.chip,
        wide && styles.chipWide,
        !filled && styles.chipEmpty,
        hug === "photo-right" && styles.hugRight,
        hug === "photo-left" && styles.hugLeft,
        !wide && { width: `${Math.round(span * 100)}%` as `${number}%` },
        wide && { flexBasis: `${Math.round(38 + span * 12)}%` as `${number}%` },
      ]}
    >
      <Text style={styles.chipQ} numberOfLines={1}>
        {bubble.question}
      </Text>
      {filled ? (
        <View style={styles.chipRow}>
          {bubble.tint ? <View style={[styles.dot, { backgroundColor: bubble.tint }]} /> : null}
          <Text style={styles.chipA} numberOfLines={2}>
            {bubble.answer}
          </Text>
        </View>
      ) : (
        <Text style={styles.chipHint}>dokun</Text>
      )}
    </Pressable>
  );
}

const PHOTO = 104;

const styles = StyleSheet.create({
  name: {
    fontFamily: theme.font.sansExtra,
    fontWeight: theme.font.weight.extra,
    fontSize: 26,
    letterSpacing: -0.5,
    color: theme.color.ink,
    textAlign: "center",
    marginTop: 4,
  },
  lede: {
    fontFamily: theme.font.sans,
    fontSize: 12.5,
    color: theme.color.ink30,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 18,
    paddingHorizontal: 12,
    lineHeight: 18,
  },
  /* Üç sütunlu satır: baloncuk sütunları `flex: 1` — fotoğrafla yatay çakışma yok.
     Kademe yalnızca sağ sütunun paddingTop'u; negatif translateY isim/lede'nin
     üstüne biniyordu çünkü yerleşim kutusunu değiştirmiyordu. */
  hero: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 2,
    marginBottom: 16,
    overflow: "visible",
  },
  col: {
    flex: 1,
    gap: 8,
    zIndex: 1,
  },
  colUp: {
    paddingTop: 0,
  },
  colDown: {
    paddingTop: 22,
  },
  photoWrap: {
    width: PHOTO,
    height: PHOTO,
    marginTop: 10,
    zIndex: 0,
  },
  ring: {
    width: PHOTO,
    height: PHOTO,
    borderRadius: PHOTO / 2,
    borderWidth: 2.5,
    borderColor: theme.color.blue,
    padding: 3,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  photo: {
    flex: 1,
    borderRadius: PHOTO / 2,
  },
  photoEmpty: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(37,99,235,0.12)",
  },
  photoInitial: {
    fontFamily: theme.font.sansExtra,
    fontWeight: theme.font.weight.extra,
    fontSize: 34,
    color: theme.color.blueDeep,
  },
  badge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.color.blue,
    borderWidth: 3,
    borderColor: theme.color.mist,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontFamily: theme.font.sansBold,
    fontWeight: theme.font.weight.bold,
    fontSize: 15,
    lineHeight: 17,
    color: "#fff",
  },
  chip: {
    minHeight: 46,
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.58)",
    borderWidth: 1,
    borderColor: theme.color.edge,
    borderRadius: 16,
    paddingVertical: 9,
    paddingHorizontal: 11,
    maxWidth: "100%",
  },
  hugRight: {
    alignSelf: "flex-end",
  },
  hugLeft: {
    alignSelf: "flex-start",
  },
  chipWide: {
    flexGrow: 1,
  },
  chipEmpty: {
    backgroundColor: "rgba(255,255,255,0.3)",
    borderStyle: "dashed",
    borderColor: theme.color.blueLight,
  },
  chipQ: {
    fontFamily: theme.font.sans,
    fontSize: 10,
    color: theme.color.ink40,
  },
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 3,
  },
  dot: {
    width: 11,
    height: 11,
    borderRadius: 6,
  },
  chipA: {
    flex: 1,
    fontFamily: theme.font.sansSemibold,
    fontWeight: theme.font.weight.semibold,
    fontSize: 12.5,
    color: theme.color.ink,
  },
  chipHint: {
    fontFamily: theme.font.mono,
    fontSize: 10,
    letterSpacing: 0.6,
    color: theme.color.ink30,
    marginTop: 3,
  },
  motto: {
    padding: 14,
    marginBottom: 12,
  },
  mottoLabel: {
    marginBottom: 6,
  },
  mottoText: {
    fontFamily: theme.font.sans,
    fontWeight: theme.font.weight.regular,
    fontSize: 15,
    lineHeight: 21,
    color: theme.color.ink,
  },
  mottoEmpty: {
    fontFamily: theme.font.sans,
    fontSize: 13,
    color: theme.color.ink40,
  },
  wrapRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  addChip: {
    flexGrow: 1,
    flexBasis: "46%",
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: theme.color.blueLight,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.3)",
    paddingHorizontal: 11,
  },
  addChipText: {
    fontFamily: theme.font.sansSemibold,
    fontWeight: theme.font.weight.semibold,
    fontSize: 12.5,
    color: theme.color.blueDeep,
  },
  privacy: {
    fontFamily: theme.font.sans,
    fontSize: 11.5,
    lineHeight: 16,
    color: theme.color.ink40,
    textAlign: "center",
    marginBottom: 4,
  },
});
