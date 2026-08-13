import { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { AmbientBackground } from "@/components/ui/Glass";
import { SubpageBar } from "@/components/ui/SubpageBar";
import { loadBoard, saveBoard, type BoardItem } from "@/lib/local";
import { theme } from "@/theme";

const STICKERS = ["🌱", "⭐️", "🔥", "🌊", "🕊", "🎯", "💎", "🌙"];

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function VisionBoardScreen() {
  const [items, setItems] = useState<BoardItem[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ kind: "note" | "word"; text: string } | null>(null);
  const zRef = useRef(1);

  useEffect(() => {
    void loadBoard().then((list) => {
      setItems(list);
      zRef.current = list.reduce((m, i) => Math.max(m, i.z), 1);
    });
  }, []);

  useEffect(() => {
    void saveBoard(items);
  }, [items]);

  function add(partial: Omit<BoardItem, "id" | "x" | "y" | "rotate" | "z"> & Partial<BoardItem>) {
    const item: BoardItem = {
      id: uid(),
      x: 20 + Math.random() * 120,
      y: 20 + Math.random() * 180,
      rotate: Math.random() * 10 - 5,
      z: ++zRef.current,
      kind: partial.kind,
      text: partial.text,
      uri: partial.uri,
    };
    setItems((prev) => [...prev, item]);
    setSelected(item.id);
  }

  async function addPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (result.canceled) return;
    for (const asset of result.assets) add({ kind: "photo", uri: asset.uri });
  }

  function removeSelected() {
    if (!selected) return;
    setItems((prev) => prev.filter((i) => i.id !== selected));
    setSelected(null);
  }

  return (
    <View style={styles.root}>
      <AmbientBackground />
      <SubpageBar title="Vizyon panosu" right="sürükle" />
      <View style={styles.board} onStartShouldSetResponder={() => true} onResponderGrant={() => setSelected(null)}>
        {items.length === 0 ? (
          <View style={styles.empty} pointerEvents="none">
            <Text style={styles.emptyText}>
              Panon boş.{"\n"}Aşağıdan fotoğraf, not veya sticker ekle.
            </Text>
          </View>
        ) : null}
        {items.map((item) => (
          <BoardPiece
            key={item.id}
            item={item}
            selected={selected === item.id}
            onSelect={() => setSelected(item.id)}
            onMove={(x, y) => {
              setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, x, y, z: ++zRef.current } : it)));
            }}
          />
        ))}
      </View>
      {draft ? (
        <View style={styles.prompt}>
          <TextInput
            autoFocus
            style={styles.promptInput}
            value={draft.text}
            onChangeText={(t) => setDraft({ ...draft, text: t })}
            placeholder={draft.kind === "note" ? "yavaş ama her gün" : "ODAK"}
            placeholderTextColor={theme.color.ink40}
          />
          <View style={styles.promptRow}>
            <Pressable onPress={() => setDraft(null)} style={styles.tl}>
              <Text style={styles.tlText}>Vazgeç</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (draft.text.trim()) add({ kind: draft.kind, text: draft.text.trim() });
                setDraft(null);
              }}
              style={styles.tl}
            >
              <Text style={styles.tlText}>Ekle</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tools} style={styles.toolsWrap}>
        <Tool label="🖼 Fotoğraf" onPress={() => void addPhoto()} />
        <Tool label="📝 Not" onPress={() => setDraft({ kind: "note", text: "" })} />
        <Tool label="💬 Kelime" onPress={() => setDraft({ kind: "word", text: "" })} />
        <Tool label="✨ Sticker" onPress={() => add({ kind: "sticker", text: STICKERS[Math.floor(Math.random() * STICKERS.length)] })} />
        <Tool label="🎗 Bant" onPress={() => add({ kind: "tape" })} />
        <Tool label="🗑 Sil" danger onPress={removeSelected} />
      </ScrollView>
    </View>
  );
}

function Tool({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} style={styles.tl}>
      <Text style={[styles.tlText, danger && styles.del]}>{label}</Text>
    </Pressable>
  );
}

function BoardPiece({
  item,
  selected,
  onSelect,
  onMove,
}: {
  item: BoardItem;
  selected: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
}) {
  const start = useRef({ x: item.x, y: item.y });
  const moveRef = useRef(onMove);
  const itemRef = useRef(item);
  moveRef.current = onMove;
  itemRef.current = item;
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          start.current = { x: itemRef.current.x, y: itemRef.current.y };
          onSelect();
        },
        onPanResponderMove: (_, g) => {
          moveRef.current(Math.max(-14, start.current.x + g.dx), Math.max(-14, start.current.y + g.dy));
        },
      }),
    [onSelect],
  );

  return (
    <View
      {...pan.panHandlers}
      style={[
        styles.item,
        item.kind === "photo" && styles.photo,
        item.kind === "note" && styles.note,
        item.kind === "word" && styles.word,
        item.kind === "sticker" && styles.sticker,
        item.kind === "tape" && styles.tape,
        selected && styles.sel,
        { left: item.x, top: item.y, zIndex: item.z, transform: [{ rotate: `${item.rotate}deg` }] },
      ]}
    >
      {item.kind === "photo" && item.uri ? <Image source={{ uri: item.uri }} style={styles.img} /> : null}
      {item.kind === "note" ? <Text style={styles.noteText}>{item.text}</Text> : null}
      {item.kind === "word" ? <Text style={styles.wordText}>{item.text}</Text> : null}
      {item.kind === "sticker" ? <Text style={styles.stickerText}>{item.text}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.color.mist,
  },
  board: {
    flex: 1,
    marginHorizontal: 14,
    marginBottom: 12,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.5)",
    borderWidth: 1,
    borderColor: theme.color.edge,
    zIndex: 2,
  },
  empty: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  emptyText: {
    fontFamily: theme.font.sans,
    fontSize: 13,
    lineHeight: 21,
    color: theme.color.ink40,
    textAlign: "center",
  },
  item: {
    position: "absolute",
  },
  sel: {
    borderWidth: 2,
    borderColor: theme.color.blue,
  },
  photo: {
    width: 112,
    height: 132,
    backgroundColor: "#fff",
    padding: 7,
    paddingBottom: 24,
    borderRadius: 4,
  },
  img: {
    width: "100%",
    height: "100%",
    borderRadius: 3,
  },
  note: {
    width: 118,
    minHeight: 88,
    padding: 11,
    borderRadius: 3,
    backgroundColor: "#FFF3B0",
  },
  noteText: {
    fontFamily: theme.font.hand,
    fontSize: 19,
    lineHeight: 24,
    color: "#3A2E10",
  },
  word: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 999,
    backgroundColor: theme.color.blue,
  },
  wordText: {
    color: "#fff",
    fontFamily: theme.font.sansBold,
    fontWeight: theme.font.weight.bold,
    fontSize: 14,
  },
  sticker: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  stickerText: {
    fontSize: 31,
  },
  tape: {
    width: 86,
    height: 26,
    backgroundColor: "rgba(37,99,235,0.28)",
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: "rgba(255,255,255,0.6)",
    borderStyle: "dashed",
  },
  toolsWrap: {
    flexGrow: 0,
    zIndex: 3,
  },
  tools: {
    paddingHorizontal: 14,
    paddingBottom: 16,
    gap: 6,
  },
  tl: {
    backgroundColor: "rgba(255,255,255,0.62)",
    borderWidth: 1,
    borderColor: theme.color.edge,
    borderRadius: 13,
    paddingVertical: 10,
    paddingHorizontal: 13,
  },
  tlText: {
    fontFamily: theme.font.sansSemibold,
    fontSize: 12,
    fontWeight: theme.font.weight.semibold,
    color: theme.color.ink,
  },
  del: {
    color: theme.color.danger,
  },
  prompt: {
    marginHorizontal: 14,
    marginBottom: 8,
    backgroundColor: "rgba(255,255,255,0.86)",
    borderRadius: 16,
    padding: 12,
    zIndex: 4,
    borderWidth: 1,
    borderColor: theme.color.edge,
  },
  promptInput: {
    fontFamily: theme.font.sans,
    fontSize: 16,
    color: theme.color.ink,
    minHeight: 44,
  },
  promptRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end",
  },
});
