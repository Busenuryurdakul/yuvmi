import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, type Href } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { Eyebrow, Glass } from "@/components/ui/Glass";
import { TapRow } from "@/components/ui/TapRow";
import { useAuth } from "@/context/AuthContext";
import { fetchFutureSelf } from "@/lib/api/yuvmi";
import type { FutureSelfResponse } from "@/lib/api/types";
import { LIFE_DOMAINS, type LifeDomain } from "@yuvmi/shared";
import { loadExtraAffirmations, loadExtraDomains, loadLetter, saveExtraDomains } from "@/lib/local";
import { shortStamp } from "@/lib/formatDate";
import { theme } from "@/theme";

const ALL_DOMAINS = Object.keys(LIFE_DOMAINS) as LifeDomain[];

export default function FutureSelfScreen() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<FutureSelfResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [letterSealed, setLetterSealed] = useState(false);
  const [affCount, setAffCount] = useState(0);
  const [extraDomains, setExtraDomains] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!user?.token) return;
    try {
      const p = await fetchFutureSelf(user.token);
      setProfile(p);
      const extra = await loadExtraAffirmations();
      setAffCount(p.affirmations.length + extra.length + 2);
      const letter = await loadLetter();
      setLetterSealed(Boolean(letter?.sealedAt));
      setExtraDomains(await loadExtraDomains());
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [user?.token]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingScreen />;

  const domains = [...(profile?.domains ?? []), ...(extraDomains.filter((d) => !(profile?.domains ?? []).includes(d as LifeDomain)) as LifeDomain[])];
  const unused = ALL_DOMAINS.filter((d) => !domains.includes(d));

  return (
    <Screen tabBar>
      <PageHeader
        eyebrow="Gelecekteki Ben"
        eyebrowRight={
          profile?.status === "approved" ? `Onaylandı · ${shortStamp(profile.updatedAt)}` : "Taslak"
        }
        title="Vizyon"
        subtitle="Kendi cümlelerinle yazdın. Plan buradan besleniyor."
      />
      {profile ? (
        <>
          <Pressable onPress={() => setExpanded((v) => !v)}>
            <Glass style={[styles.bubble, expanded && styles.bubbleExp]}>
              <Text style={[styles.quote, expanded && styles.quoteExp]}>
                “{profile.description || profile.title}”
              </Text>
              <Text style={styles.hint}>{expanded ? "Küçültmek için dokun" : "Büyütmek için dokun"}</Text>
            </Glass>
          </Pressable>

          <Glass style={styles.stat}>
            <Eyebrow style={styles.lbl}>Yaşam alanları</Eyebrow>
            <View style={styles.chips}>
              {domains.map((d) => (
                <Pressable
                  key={d}
                  onPress={() => router.push(`/vision/area?domain=${d}` as Href)}
                  style={styles.chip}
                >
                  <Text style={styles.chipText}>{LIFE_DOMAINS[d]?.label.tr ?? d}</Text>
                </Pressable>
              ))}
              {unused.length > 0 ? (
                <Pressable
                  onPress={async () => {
                    const next = unused[0];
                    const list = [...extraDomains, next];
                    setExtraDomains(list);
                    await saveExtraDomains(list);
                  }}
                  style={styles.chipAdd}
                >
                  <Text style={styles.chipAddText}>+ Alan ekle</Text>
                </Pressable>
              ) : null}
            </View>
            <Text style={styles.chipHelp}>Her alana dokunup kendi notlarını yazabilirsin.</Text>
          </Glass>

          <TapRow
            title="Vizyon panosu"
            subtitle="Fotoğraf, not, sticker ve bantlarla kendi panonu kur"
            onPress={() => router.push("/vision/board" as Href)}
          />
          <TapRow
            title="Gelecekteki Ben'e mektup"
            subtitle={letterSealed ? "Mühürlendi" : "Henüz yazılmadı"}
            onPress={() => router.push("/vision/letter" as Href)}
          />
          <TapRow
            title="Olumlamalar"
            subtitle={`${Math.max(affCount, profile.affirmations.length || 1)} olumlama · kaydırarak oku`}
            onPress={() => router.push("/vision/affirmations" as Href)}
          />
        </>
      ) : (
        <Glass style={styles.bubble}>
          <EmptyState title="Profil bulunamadı" description="Onboarding'i tamamlaman gerekebilir." />
        </Glass>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  bubble: {
    paddingVertical: 22,
    paddingHorizontal: 19,
    marginBottom: 11,
  },
  bubbleExp: {
    paddingVertical: 34,
    paddingHorizontal: 22,
  },
  quote: {
    fontFamily: theme.font.sansBold,
    fontSize: 17,
    fontWeight: theme.font.weight.bold,
    fontStyle: "italic",
    lineHeight: 24,
    letterSpacing: -0.2,
    color: theme.color.ink,
  },
  quoteExp: {
    fontSize: 26,
    lineHeight: 33,
  },
  hint: {
    marginTop: 12,
    fontFamily: theme.font.mono,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: theme.color.ink40,
  },
  stat: {
    paddingVertical: 15,
    paddingHorizontal: 16,
    marginBottom: 9,
  },
  lbl: {
    marginBottom: 9,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  chip: {
    backgroundColor: "rgba(37,99,235,0.13)",
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  chipText: {
    fontFamily: theme.font.sansSemibold,
    fontSize: 12.5,
    fontWeight: theme.font.weight.semibold,
    color: theme.color.blueDeep,
  },
  chipAdd: {
    backgroundColor: "rgba(11,18,32,0.07)",
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  chipAddText: {
    fontFamily: theme.font.sansSemibold,
    fontSize: 12.5,
    color: theme.color.ink40,
  },
  chipHelp: {
    marginTop: 11,
    fontFamily: theme.font.sans,
    fontSize: 11.5,
    color: theme.color.ink40,
    lineHeight: 16,
  },
});
