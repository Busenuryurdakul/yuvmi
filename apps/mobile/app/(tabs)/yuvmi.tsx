import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { Glass } from "@/components/ui/Glass";
import { SegmentBar } from "@/components/today/SegmentBar";
import { CompanionCard } from "@/components/companion/CompanionCard";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api/client";
import { fetchConsents, sendCompanionChat, updateConsent, type CompanionChatTurn } from "@/lib/api/yuvmi";
import {
  loadCompanionStore,
  saveCompanionStore,
  type CompanionMsg,
  type CompanionStore,
  type CompanionThread,
} from "@/lib/local";
import { longDate } from "@/lib/formatDate";
import { theme } from "@/theme";

type Msg = CompanionMsg;

const CHIPS = [
  "Planımı gözden geçir",
  "Bugünü küçült",
  "Neden olmuyor?",
  "6 ay önceki ben",
  "Kursu ne zaman bitiririm?",
  "Haftamı özetle",
  "Hedefimi böl",
] as const;

const SCOPE = "ai_companion" as const;

function newId() {
  return `c-${Date.now()}`;
}

function previewOf(thread: CompanionThread) {
  const userLine = thread.messages.find((m) => m.role === "user")?.text.trim();
  if (userLine) return userLine;
  const aiLine = [...thread.messages].reverse().find((m) => m.role === "ai")?.text.trim();
  return aiLine || "Boş sohbet";
}

function hasUserTurn(msgs: Msg[]) {
  return msgs.some((m) => m.role === "user");
}

export default function YuvmiScreen() {
  const { user } = useAuth();
  const name = user?.displayName?.split(" ")[0] ?? "sen";
  const greeting = useMemo(
    () =>
      `Merhaba ${name}. Ben Yuvmi. Planın ve ritminle konuşurum — senin adına işaretlemem, kaydetmem.`,
    [name],
  );
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [store, setStore] = useState<CompanionStore>({ activeId: "", threads: [] });
  const [hydrated, setHydrated] = useState(false);
  const [pane, setPane] = useState<"chat" | "history">("chat");
  const chatRef = useRef<ScrollView>(null);
  const activeIdRef = useRef("");
  const [consent, setConsent] = useState<"unknown" | "needed" | "granted">("unknown");
  const [busy, setBusy] = useState(false);

  const placeholder = useMemo(() => (busy ? "Yuvmi düşünüyor..." : "Yuvmi'ye yaz..."), [busy]);

  useEffect(() => {
    let live = true;
    void loadCompanionStore().then((loaded) => {
      if (!live) return;
      const active = loaded.threads.find((t) => t.id === loaded.activeId);
      activeIdRef.current = loaded.activeId || "";
      setStore(loaded);
      setMsgs(active?.messages?.length ? active.messages : [{ role: "ai", text: greeting }]);
      setHydrated(true);
    });
    return () => {
      live = false;
    };
  }, [greeting]);

  useEffect(() => {
    if (!hydrated) return;
    setStore((prev) => {
      const id = activeIdRef.current || prev.activeId || newId();
      activeIdRef.current = id;
      const archived = prev.threads.filter((t) => t.id !== id && hasUserTurn(t.messages));
      const threads = hasUserTurn(msgs)
        ? [{ id, updatedAt: new Date().toISOString(), messages: msgs }, ...archived]
        : archived;
      const next: CompanionStore = { activeId: id, threads };
      void saveCompanionStore(next);
      return next;
    });
  }, [hydrated, msgs]);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      void fetchConsents()
        .then((rows) => {
          if (!live) return;
          setConsent(rows.some((c) => c.scope === SCOPE && c.granted) ? "granted" : "needed");
        })
        .catch(() => {
          if (!live) return;
          setConsent("needed");
        });
      return () => {
        live = false;
      };
    }, []),
  );

  async function grant() {
    setBusy(true);
    try {
      await updateConsent(SCOPE, true);
      setConsent("granted");
    } catch (err) {
      const detail =
        err instanceof ApiError && err.code === 422
          ? "Bu sohbet izni henüz sunucuda yok — API’yi yeniden başlatman gerekebilir."
          : "İzni kaydedemedim. Bağlantını kontrol edip tekrar dene.";
      setMsgs((prev) => [...prev, { role: "ai", text: detail }]);
    } finally {
      setBusy(false);
    }
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    if (consent !== "granted") {
      setMsgs((prev) => [
        ...prev,
        { role: "user", text: trimmed },
        { role: "ai", text: "Önce sohbet iznini aç — yukarıdaki düğmeye dokun." },
      ]);
      setInput("");
      return;
    }

    const history: CompanionChatTurn[] = msgs
      .filter((m) => m.text.trim().length > 0)
      .slice(-8)
      .map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        text: [...m.text.trim()].slice(0, 800).join(""),
      }));

    setMsgs((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    setBusy(true);
    try {
      const res = await sendCompanionChat(trimmed, history);
      setMsgs((prev) => [
        ...prev,
        {
          role: "ai",
          text: res.reply,
          playbookId: res.playbookId,
          playbookTitle: res.playbookTitle,
        },
      ]);
    } catch (err) {
      let note = "Şu an yanıtlayamadım. Biraz sonra tekrar dene.";
      if (err instanceof ApiError) {
        if (err.code === 403) {
          setConsent("needed");
          note = "Sohbet izni kapalı. Yukarıdan tekrar açabilirsin.";
        } else if (err.code === 429) {
          note = "Bugünkü sohbet hakkın doldu. Yarın yine buradayım.";
        } else if (err.code === 501) {
          note = "AI bu ortamda kapalı. Anahtar sunucuda yoksa yanıt üretemem.";
        } else if (err.code === 422) {
          note = "Bu turu gönderemedim (biçim). Kısa yazıp tekrar dene.";
        }
      }
      setMsgs((prev) => [...prev, { role: "ai", text: note }]);
    } finally {
      setBusy(false);
    }
  }

  function openThread(thread: CompanionThread) {
    activeIdRef.current = thread.id;
    setStore((prev) => ({ ...prev, activeId: thread.id }));
    setMsgs(thread.messages.length ? thread.messages : [{ role: "ai", text: greeting }]);
    setPane("chat");
  }

  function startNewChat() {
    activeIdRef.current = newId();
    setStore((prev) => ({ ...prev, activeId: activeIdRef.current }));
    setMsgs([{ role: "ai", text: greeting }]);
    setPane("chat");
  }

  const historyThreads = store.threads.filter((t) => hasUserTurn(t.messages));
  const lastCardIdx = (() => {
    for (let i = msgs.length - 1; i >= 0; i--) {
      const m = msgs[i];
      if (m.role === "ai" && m.playbookTitle && !m.cardDismissed) return i;
    }
    return -1;
  })();

  function keepCard(index: number) {
    setMsgs((prev) => prev.map((m, i) => (i === index ? { ...m, cardDismissed: true } : m)));
  }

  return (
    <Screen tabBar scroll={false}>
      <View style={styles.head}>
        <Text style={styles.title}>Yuvmi</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Yeni sohbet"
          onPress={startNewChat}
          style={styles.newChat}
        >
          <Text style={styles.newChatText}>Yeni sohbet</Text>
        </Pressable>
      </View>
      <SegmentBar
        index={pane === "history" ? 1 : 0}
        onChange={(i) => setPane(i === 1 ? "history" : "chat")}
        labels={["Sohbet", "Geçmiş"]}
        style={styles.seg}
      />

      {consent === "needed" ? (
        <Glass style={styles.consentCard}>
          <Text style={styles.consentTitle}>Sohbet için izin</Text>
          <Text style={styles.consentBody}>
            Yanıt üretirken plan adımların, son 7 günün özeti ve bugünün niyeti okunur. Sohbet hiçbir şey işaretlemez. İstediğin an kapatabilirsin.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sohbet iznini ver"
            onPress={() => void grant()}
            disabled={busy}
            style={styles.consentButton}
          >
            <Text style={styles.consentButtonText}>{busy ? "Kaydediliyor…" : "Sohbete izin ver"}</Text>
          </Pressable>
        </Glass>
      ) : null}

      <Glass style={styles.chatbox}>
        {pane === "history" ? (
          <ScrollView style={styles.chatScroll} contentContainerStyle={styles.historyList} showsVerticalScrollIndicator={false}>
            <Text style={styles.historyHint}>
              Sohbet · Geçmiş — Bugün’deki sekmeler gibi. Bir satıra dokununca o yazışmaya dönersin.
            </Text>
            {historyThreads.length === 0 ? (
              <Text style={styles.historyEmpty}>
                Henüz kayıtlı sohbet yok. Bir şey yaz; Geçmiş sekmesinde görünür.
              </Text>
            ) : (
              historyThreads.map((thread) => {
                const on = thread.id === store.activeId;
                const when = thread.updatedAt ? longDate(new Date(thread.updatedAt)) : "";
                return (
                  <Pressable
                    key={thread.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Sohbet: ${previewOf(thread)}`}
                    onPress={() => openThread(thread)}
                    style={[styles.histRow, on && styles.histRowOn]}
                  >
                    <Text style={styles.histWhen}>{when}</Text>
                    <Text style={styles.histPreview} numberOfLines={2}>
                      {previewOf(thread)}
                    </Text>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        ) : (
          <>
            <ScrollView
              ref={chatRef}
              style={styles.chatScroll}
              contentContainerStyle={styles.chat}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => chatRef.current?.scrollToEnd({ animated: true })}
            >
              {msgs.map((m, i) => (
                <View key={`${i}-${m.role}`} style={[styles.msg, m.role === "user" ? styles.user : styles.ai]}>
                  {m.role === "user" ? (
                    <Text style={[styles.msgText, styles.userText]}>{m.text}</Text>
                  ) : (
                    <CompanionCard
                      title={m.playbookTitle}
                      text={m.text}
                      showActions={i === lastCardIdx}
                      busy={busy}
                      onShrink={() => void send("Bugünü küçült")}
                      onKeep={() => keepCard(i)}
                    />
                  )}
                </View>
              ))}
              {busy ? (
                <View style={[styles.msg, styles.ai, styles.thinking]}>
                  <ActivityIndicator size="small" color={theme.color.blue} />
                  <Text style={styles.msgText}>Düşünüyorum…</Text>
                </View>
              ) : null}
            </ScrollView>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
              style={styles.chipsRow}
            >
              {CHIPS.map((c) => (
                <Pressable
                  key={c}
                  accessibilityRole="button"
                  accessibilityLabel={c}
                  onPress={() => void send(c)}
                  disabled={busy}
                  style={styles.chip}
                >
                  <Text style={styles.chipText}>{c}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.inrow}>
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder={placeholder}
                placeholderTextColor={theme.color.ink70}
                onSubmitEditing={() => void send(input)}
                returnKeyType="send"
                editable={!busy}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Gönder"
                onPress={() => void send(input)}
                disabled={busy}
                style={styles.send}
              >
                <Text style={styles.sendText}>↑</Text>
              </Pressable>
            </View>
          </>
        )}
      </Glass>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 11,
  },
  title: {
    fontFamily: theme.font.sansExtra,
    fontSize: 22,
    fontWeight: theme.font.weight.extra,
    color: theme.color.ink,
    letterSpacing: -0.4,
  },
  newChat: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: theme.color.blueLight,
    backgroundColor: "rgba(37,99,235,0.08)",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  newChatText: {
    fontFamily: theme.font.sansSemibold,
    fontWeight: theme.font.weight.semibold,
    fontSize: 12,
    color: theme.color.blueDeep,
  },
  seg: { marginTop: 0, marginBottom: 8 },
  consentCard: { padding: 16, marginBottom: 12 },
  consentTitle: {
    fontFamily: theme.font.sansBold,
    fontWeight: theme.font.weight.bold,
    fontSize: 15,
    color: theme.color.ink,
    marginBottom: 6,
  },
  consentBody: {
    fontFamily: theme.font.sans,
    fontSize: 13,
    lineHeight: 19,
    color: theme.color.ink70,
    marginBottom: 12,
  },
  consentButton: {
    backgroundColor: theme.color.blue,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  consentButtonText: {
    color: "#fff",
    fontFamily: theme.font.sansSemibold,
    fontWeight: theme.font.weight.semibold,
    fontSize: 14,
  },
  chatbox: { flex: 1, padding: 12, marginBottom: 8, minHeight: 0 },
  chatScroll: { flex: 1, minHeight: 0 },
  chat: { gap: 10, paddingBottom: 8 },
  historyList: { gap: 8, paddingBottom: 12 },
  historyHint: {
    fontFamily: theme.font.sans,
    fontSize: 13,
    lineHeight: 19,
    color: theme.color.ink70,
    marginBottom: 4,
  },
  historyEmpty: {
    fontFamily: theme.font.sans,
    fontSize: 14,
    lineHeight: 21,
    color: theme.color.ink,
    paddingVertical: 18,
  },
  histRow: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.55)",
    borderWidth: 1,
    borderColor: theme.color.edge,
  },
  histRowOn: {
    borderColor: theme.color.blue,
    backgroundColor: "rgba(37,99,235,0.08)",
  },
  histWhen: {
    fontFamily: theme.font.mono,
    fontSize: 11,
    color: theme.color.ink40,
    marginBottom: 4,
  },
  histPreview: {
    fontFamily: theme.font.sans,
    fontSize: 14,
    lineHeight: 20,
    color: theme.color.ink,
  },
  msg: { maxWidth: "92%", borderRadius: 16, paddingVertical: 10, paddingHorizontal: 12 },
  ai: { alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.7)", borderWidth: 1, borderColor: theme.color.edge },
  user: { alignSelf: "flex-end", backgroundColor: theme.color.blue },
  thinking: { flexDirection: "row", alignItems: "center", gap: 8 },
  msgText: { fontFamily: theme.font.sans, fontSize: 13.5, lineHeight: 19, color: theme.color.ink },
  userText: { color: "#fff" },
  chipsRow: { flexGrow: 0, marginBottom: 8, maxHeight: 40 },
  chips: { flexDirection: "row", alignItems: "center", gap: 7, paddingRight: 8 },
  chip: {
    height: 34,
    justifyContent: "center",
    backgroundColor: "rgba(37,99,235,0.12)",
    borderRadius: 999,
    paddingHorizontal: 12,
  },
  chipText: {
    fontFamily: theme.font.sansSemibold,
    fontWeight: theme.font.weight.semibold,
    fontSize: 12,
    color: theme.color.blueDeep,
  },
  inrow: { flexDirection: "row", gap: 8, alignItems: "center" },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.color.ink15,
    backgroundColor: "rgba(255,255,255,0.65)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontFamily: theme.font.sans,
    fontSize: 14,
    color: theme.color.ink,
  },
  send: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.color.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  sendText: { color: "#fff", fontSize: 18, fontWeight: "700" },
});
