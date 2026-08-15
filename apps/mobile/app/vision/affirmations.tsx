import { useCallback, useEffect, useState } from "react";
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { router, useFocusEffect, type Href } from "expo-router";
import { AmbientBackground, Eyebrow } from "@/components/ui/Glass";
import { SubpageBar } from "@/components/ui/SubpageBar";
import { useAuth } from "@/context/AuthContext";
import { fetchFutureSelf } from "@/lib/api/yuvmi";
import { loadExtraAffirmations } from "@/lib/local";
import { theme } from "@/theme";

const YUVMI = [
  { text: "Yavaş ilerlemek, durmak değildir.", who: "Yuvmi" },
  { text: "Bugün küçük hâliyle yaptığım şey de sayılır.", who: "Yuvmi" },
  { text: "Geri dönmek, baştan başlamak değildir.", who: "Yuvmi" },
];

type Card = { text: string; who: string };

export default function AffirmationsScreen() {
  const { height } = useWindowDimensions();
  const { user } = useAuth();
  const [cards, setCards] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const paneH = Math.max(320, height - 180);

  const load = useCallback(async () => {
    const extra = await loadExtraAffirmations();
    let mine: Card[] = extra.map((a) => ({ text: a.text, who: a.who }));
    if (user?.token) {
      try {
        const profile = await fetchFutureSelf(user.token);
        mine = [
          ...profile.affirmations.map((t) => ({ text: t, who: "Senin olumlaman" })),
          ...extra.map((a) => ({ text: a.text, who: a.who })),
        ];
      } catch {
        /* keep extra */
      }
    }
    const seen = new Set(mine.map((c) => c.text.toLocaleLowerCase("tr")));
    const defaults = YUVMI.filter((c) => !seen.has(c.text.toLocaleLowerCase("tr")));
    setCards(mine.length ? [...mine, ...defaults] : [{ text: "Her gün kendim için bir adım atıyorum.", who: "Senin olumlaman" }, ...YUVMI]);
  }, [user?.token]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    void load();
  }, [load]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.y / paneH);
    setIndex(Math.min(Math.max(i, 0), Math.max(cards.length - 1, 0)));
  };

  return (
    <View style={styles.root}>
      <AmbientBackground />
      <SubpageBar title="Olumlamalar" right={`${index + 1} / ${Math.max(cards.length, 1)}`} />
      <ScrollView
        pagingEnabled
        snapToInterval={paneH}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        style={styles.deck}
      >
        {cards.map((card) => (
          <View key={`${card.who}-${card.text}`} style={[styles.aff, { height: paneH }]}>
            <Text style={styles.quote}>{card.text}</Text>
            <Eyebrow style={styles.who}>{card.who}</Eyebrow>
          </View>
        ))}
      </ScrollView>
      <Text style={styles.hint}>↑ kaydır</Text>
      <Pressable style={styles.fab} onPress={() => router.push("/vision/affirmation-new" as Href)}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.color.mist,
  },
  deck: {
    flex: 1,
    zIndex: 2,
  },
  aff: {
    justifyContent: "center",
    paddingHorizontal: 34,
  },
  quote: {
    fontFamily: theme.font.sansBold,
    fontSize: 27,
    fontWeight: theme.font.weight.bold,
    lineHeight: 36,
    letterSpacing: -0.5,
    color: theme.color.ink,
  },
  who: {
    marginTop: 18,
    letterSpacing: 1.4,
  },
  hint: {
    position: "absolute",
    bottom: 92,
    left: 0,
    right: 0,
    textAlign: "center",
    fontFamily: theme.font.mono,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: theme.color.ink40,
    zIndex: 3,
  },
  fab: {
    position: "absolute",
    right: 18,
    bottom: 22,
    zIndex: 5,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.color.blue,
    alignItems: "center",
    justifyContent: "center",
    ...theme.shadow.blue,
  },
  fabText: {
    color: "#fff",
    fontSize: 25,
    lineHeight: 28,
  },
});
