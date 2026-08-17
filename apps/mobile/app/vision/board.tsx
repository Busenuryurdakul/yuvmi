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
  Animated,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { AmbientBackground, Glass } from "@/components/ui/Glass";
import { SubpageBar } from "@/components/ui/SubpageBar";
import { loadBoard, saveBoard, type BoardItem } from "@/lib/local";
import { theme } from "@/theme";

const STICKER_LIST = [
  "🐚", "🪸", "⚓️", "🐋", "🐳", "🐬", "🦈", "🪼", "🦀", "🐙", "🐢", "🐠", "🌊", "🫧",
  "🎯", "⭐", "🔥", "🌙", "🌱", "✨", "💎", "🔮"
];

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function VisionBoardScreen() {
  const [items, setItems] = useState<BoardItem[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ kind: "note" | "word"; text: string } | null>(null);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [stickerEditId, setStickerEditId] = useState<string | null>(null);
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
      
      {/* Board wrapper view without intercepting touch responders */}
      <View style={styles.board}>
        {/* Deselect on clicking empty background */}
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelected(null)} />
        
        <DotGrid />
        
        {items.length === 0 ? (
          <View style={styles.empty} pointerEvents="none">
            <Text style={styles.emptyText}>
              Panon boş.{"\n"}Aşağıdan fotoğraf, not veya sticker ekle —{"\n"}ya da bir görsel kopyalayıp buraya yapıştır.
              {"\n\n"}Her öğeye "bu neden burada?" notu ekleyebilirsin.
            </Text>
          </View>
        ) : null}

        {items.map((item) => (
          <BoardPiece
            key={item.id}
            item={item}
            selected={selected === item.id}
            onSelect={() => setSelected(item.id)}
            onEditSticker={(id) => {
              setStickerEditId(id);
              setShowStickerPicker(true);
            }}
            onMove={(x, y) => {
              setItems((prev) =>
                prev.map((it) => (it.id === item.id ? { ...it, x, y, z: ++zRef.current } : it))
              );
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
        <Tool
          label="✨ Sticker"
          onPress={() => {
            setStickerEditId(null);
            setShowStickerPicker(true);
          }}
        />
        <Tool label="🎗 Bant" onPress={() => add({ kind: "tape" })} />
        <Tool label="🗑 Sil" danger onPress={removeSelected} />
      </ScrollView>

      {/* Floating Sticker Picker Overlay Modal */}
      {showStickerPicker && (
        <View style={styles.pickerOverlay}>
          <Glass style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>
              {stickerEditId ? "Stickerı Değiştir ✏️" : "Sticker Seçin ✨"}
            </Text>
            <View style={styles.pickerGrid}>
              {STICKER_LIST.map((sticker) => (
                <Pressable
                  key={sticker}
                  style={styles.pickerItem}
                  onPress={() => {
                    if (stickerEditId) {
                      setItems((prev) =>
                        prev.map((it) => (it.id === stickerEditId ? { ...it, text: sticker } : it))
                      );
                    } else {
                      add({ kind: "sticker", text: sticker });
                    }
                    setShowStickerPicker(false);
                    setStickerEditId(null);
                  }}
                >
                  <Text style={styles.pickerItemText}>{sticker}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={styles.pickerCloseBtn}
              onPress={() => {
                setShowStickerPicker(false);
                setStickerEditId(null);
              }}
            >
              <Text style={styles.pickerCloseBtnText}>Vazgeç</Text>
            </Pressable>
          </Glass>
        </View>
      )}
    </View>
  );
}

function DotGrid() {
  const COLS = 20;
  const ROWS = 35;
  const SPACING = 17;
  const dots: React.ReactNode[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      dots.push(
        <View
          key={`${r}-${c}`}
          style={{
            position: "absolute",
            left: c * SPACING,
            top: r * SPACING,
            width: 2,
            height: 2,
            borderRadius: 1,
            backgroundColor: "rgba(11,18,32,0.13)",
          }}
        />,
      );
    }
  }
  return <View style={styles.dotGrid} pointerEvents="none">{dots}</View>;
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
  onEditSticker,
  onMove,
}: {
  item: BoardItem;
  selected: boolean;
  onSelect: () => void;
  onEditSticker: (id: string) => void;
  onMove: (x: number, y: number) => void;
}) {
  const start = useRef({ x: item.x, y: item.y });
  const moveRef = useRef(onMove);
  const itemRef = useRef(item);
  moveRef.current = onMove;
  itemRef.current = item;

  // Track position using Animated.ValueXY for smooth 60fps local translation without parent re-render lag
  const panXY = useRef(new Animated.ValueXY({ x: item.x, y: item.y })).current;

  // Sync animation value if prop values change from outside
  useEffect(() => {
    panXY.setValue({ x: item.x, y: item.y });
  }, [item.x, item.y]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          panXY.setOffset({ x: itemRef.current.x, y: itemRef.current.y });
          panXY.setValue({ x: 0, y: 0 });
          start.current = { x: itemRef.current.x, y: itemRef.current.y };
          onSelect();
        },
        onPanResponderMove: Animated.event(
          [null, { dx: panXY.x, dy: panXY.y }],
          { useNativeDriver: false }
        ),
        onPanResponderRelease: (_, g) => {
          panXY.flattenOffset();
          const finalX = Math.max(-14, start.current.x + g.dx);
          const finalY = Math.max(-14, start.current.y + g.dy);
          moveRef.current(finalX, finalY);
        },
      }),
    [onSelect],
  );

  return (
    <Animated.View
      {...pan.panHandlers}
      style={[
        styles.item,
        item.kind === "photo" && styles.photo,
        item.kind === "note" && styles.note,
        item.kind === "word" && styles.word,
        item.kind === "sticker" && styles.sticker,
        item.kind === "tape" && styles.tape,
        selected && styles.sel,
        {
          transform: [
            { translateX: panXY.x },
            { translateY: panXY.y },
            { rotate: `${item.rotate}deg` },
          ],
          zIndex: item.z,
        },
      ]}
    >
      {item.kind === "photo" && item.uri ? <Image source={{ uri: item.uri }} style={styles.img} /> : null}
      {item.kind === "note" ? <Text style={styles.noteText}>{item.text}</Text> : null}
      {item.kind === "word" ? <Text style={styles.wordText}>{item.text}</Text> : null}
      {item.kind === "sticker" ? <Text style={styles.stickerText}>{item.text}</Text> : null}

      {/* Show edit badge on selected stickers */}
      {item.kind === "sticker" && selected && (
        <Pressable
          style={styles.editBadge}
          onPress={(e) => {
            e.stopPropagation();
            onEditSticker(item.id);
          }}
        >
          <Text style={styles.editBadgeText}>✏️</Text>
        </Pressable>
      )}
    </Animated.View>
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
  dotGrid: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
    fontFamily: theme.font.sans,
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
  
  // Custom Styles Added
  pickerOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(11, 23, 44, 0.4)",
    zIndex: 999,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  pickerCard: {
    width: "100%",
    maxWidth: 320,
    padding: 20,
    alignItems: "center",
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
  },
  pickerTitle: {
    fontFamily: theme.font.sansBold,
    fontSize: 16,
    color: theme.color.ink,
    marginBottom: 16,
  },
  pickerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    marginBottom: 20,
  },
  pickerItem: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(11, 18, 32, 0.06)",
    justifyContent: "center",
    alignItems: "center",
  },
  pickerItemText: {
    fontSize: 24,
  },
  pickerCloseBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: theme.color.blue,
  },
  pickerCloseBtnText: {
    fontFamily: theme.font.sansSemibold,
    color: "#fff",
    fontSize: 13,
  },
  editBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: theme.color.blue,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 10,
  },
  editBadgeText: {
    fontSize: 11,
  },
});
