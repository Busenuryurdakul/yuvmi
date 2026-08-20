import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: unknown) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export type MoodLevel = 0 | 1 | 2 | 3 | 4;

export type IntentionPick = "full" | "small" | "none";

export type BoardItem = {
  id: string;
  kind: "photo" | "note" | "word" | "sticker" | "tape";
  x: number;
  y: number;
  rotate: number;
  z: number;
  text?: string;
  uri?: string;
};

export type AreaNote = {
  now: string;
  want: string;
  savedAt?: string;
};

export type LetterDraft = {
  body: string;
  openIn: "3m" | "6m" | "1y";
  sealedAt?: string;
};

export type ExtraAffirmation = {
  text: string;
  who: string;
};

export type UserMode = "soft" | "hard";
export type EnergyLevel = "lo" | "mid" | "hi";

export type AppPrefs = {
  quietWeek: boolean;
  darkMode: boolean;
  appLock: boolean;
  morningReminder: string;
  eveningReminder: string;
  mode: UserMode;
  energy: EnergyLevel;
  tohum: number;
  survivalMode: boolean;
};

export type RitualDraft = {
  id: string;
  name: string;
  blocks: string[];
};

export type DeckCard = {
  id: string;
  text: string;
};

export type WaveSpan = 7 | 14 | 21;

export type WaveItem = {
  id: string;
  name: string;
  count: number;
  /** İstiridye döngüsü — bırakılan şey bu kadar gün kabukta büyür. */
  spanDays?: WaveSpan;
  closedAt?: string;
};

/** Yolculuk › Ben sekmesindeki tek bir soru-cevap baloncuğu. */
export type SelfBubble = {
  id: string;
  question: string;
  answer: string;
  /** Cevabın önünde gösterilen renk noktası — "en sevdiğin renk" gibi sorular için. */
  tint?: string;
};

export type SelfProfile = {
  photoUri?: string;
  /** Ben sekmesinde görünen ad. Yoksa hesap adının ilk kelimesi. */
  name?: string;
  motto: string;
  bubbles: SelfBubble[];
};

const KEYS = {
  mood: "yuvmi.mood-history",
  picks: "yuvmi.intention-log",
  board: "yuvmi.vision-board",
  letter: "yuvmi.letter",
  notes: "yuvmi.area-notes",
  aff: "yuvmi.extra-affirmations",
  prefs: "yuvmi.prefs",
  extraDomains: "yuvmi.extra-domains",
  rituals: "yuvmi.rituals",
  deck: "yuvmi.deck",
  waves: "yuvmi.waves",
  self: "yuvmi.self-profile",
  companion: "yuvmi.companion-chat",
  shop: "yuvmi.shop-inventory",
};

/**
 * Bu dosyanın dışında tanımlanan, yine kullanıcıya özel anahtarlar.
 * Sahibi olan modüller kendi sabitlerinden okumaya devam ediyor; buradaki
 * kopyanın tek amacı çıkışta temizlenmelerini garanti etmek.
 */
const EXTERNAL_USER_KEYS = [
  // src/hooks/useOfflineQueue.ts → QUEUE_KEY
  "yuvmi_offline_queue",
  // app/atolye/notifications.tsx → STORAGE_KEYS
  "yuvmi_noti_sabah_time",
  "yuvmi_noti_aksam_time",
  "yuvmi_noti_gunun_niyeti",
  "yuvmi_noti_aksam_ozet",
  "yuvmi_noti_haftalik_deg",
  "yuvmi_noti_geri_donus",
  "yuvmi_noti_motivasyon_on",
  "yuvmi_noti_motivasyon_freq",
  "yuvmi_noti_custom_list",
  // Kaldırılan Günün Kartı — cihazda kalmış kayıtları da sil.
  "yuvmi.daily-card",
];

/**
 * Oturum kapatılırken silinmesi gereken TÜM kullanıcıya özel AsyncStorage
 * anahtarları. Yeni bir anahtar eklerken ya yukarıdaki `KEYS` nesnesine ya da
 * `EXTERNAL_USER_KEYS` listesine ekle — `clearLocalUserData()` yalnızca burayı
 * okuyor, dolayısıyla listeye girmeyen anahtar cihazda kalır ve bir sonraki
 * kullanıcıya görünür.
 */
export const USER_SCOPED_STORAGE_KEYS: readonly string[] = [
  ...Object.values(KEYS),
  ...EXTERNAL_USER_KEYS,
];

/**
 * Çıkışta çağrılır (src/context/AuthContext.tsx → signOut). Cihazda kalan
 * kişisel veriyi — ruh hâli geçmişi, vizyon panosu, mektup, alan notları,
 * bekleyen çevrimdışı kuyruk, bildirim tercihleri — siler.
 *
 * AsyncStorage'ın yanı sıra diske yazılan dosyalar da buradan temizlenmeli:
 * Ben sekmesinin profil fotoğrafı documentDirectory'de duruyor ve anahtar
 * silinse bile dosya kalır, bir sonraki kullanıcıya görünürdü.
 */
export async function clearLocalUserData(): Promise<void> {
  const dir = selfPhotoDir();
  if (dir) {
    try {
      await FileSystem.deleteAsync(dir, { idempotent: true });
    } catch {
      // Dosya silinemezse bile anahtarları temizlemeye devam et.
    }
  }
  await AsyncStorage.removeMany([...USER_SCOPED_STORAGE_KEYS]);
}

export async function loadMoodHistory(): Promise<Record<string, MoodLevel>> {
  return readJson(KEYS.mood, {});
}

export async function saveMoodDay(date: string, level: MoodLevel) {
  const all = await loadMoodHistory();
  all[date] = level;
  await writeJson(KEYS.mood, all);
}

export async function loadIntentionLog(): Promise<Record<string, Record<string, IntentionPick>>> {
  return readJson(KEYS.picks, {});
}

export async function saveIntentionPick(stepId: string, date: string, pick: IntentionPick | undefined) {
  const all = await loadIntentionLog();
  const byDate = all[stepId] ?? {};
  if (!pick) delete byDate[date];
  else byDate[date] = pick;
  all[stepId] = byDate;
  await writeJson(KEYS.picks, all);
}

export async function loadBoard(): Promise<BoardItem[]> {
  return readJson(KEYS.board, []);
}

export async function saveBoard(items: BoardItem[]) {
  await writeJson(KEYS.board, items);
}

export async function loadLetter(): Promise<LetterDraft | null> {
  return readJson(KEYS.letter, null);
}

export async function saveLetter(letter: LetterDraft) {
  await writeJson(KEYS.letter, letter);
}

export async function loadAreaNote(domain: string): Promise<AreaNote> {
  const all = await readJson<Record<string, AreaNote>>(KEYS.notes, {});
  return all[domain] ?? { now: "", want: "" };
}

export async function saveAreaNote(domain: string, note: AreaNote) {
  const all = await readJson<Record<string, AreaNote>>(KEYS.notes, {});
  all[domain] = note;
  await writeJson(KEYS.notes, all);
}

export async function loadExtraAffirmations(): Promise<ExtraAffirmation[]> {
  return readJson(KEYS.aff, []);
}

export async function saveExtraAffirmations(items: ExtraAffirmation[]) {
  await writeJson(KEYS.aff, items);
}

export async function loadPrefs(): Promise<AppPrefs> {
  try {
    await AsyncStorage.removeItem("yuvmi.daily-card");
  } catch {
    /* retired key */
  }
  const raw = await readJson<Partial<AppPrefs>>(KEYS.prefs, {});
  return {
    quietWeek: Boolean(raw.quietWeek),
    darkMode: Boolean(raw.darkMode),
    appLock: raw.appLock ?? true,
    morningReminder: raw.morningReminder ?? "08:00",
    eveningReminder: raw.eveningReminder ?? "21:30",
    mode: raw.mode === "hard" ? "hard" : "soft",
    energy: raw.energy === "lo" || raw.energy === "hi" ? raw.energy : "mid",
    tohum: typeof raw.tohum === "number" ? raw.tohum : 48,
    survivalMode: Boolean(raw.survivalMode),
  };
}

export async function savePrefs(prefs: AppPrefs) {
  await writeJson(KEYS.prefs, prefs);
}

export async function loadRituals(): Promise<RitualDraft[]> {
  return readJson(KEYS.rituals, []);
}

export async function saveRituals(items: RitualDraft[]) {
  await writeJson(KEYS.rituals, items);
}

export type DailyCard = {
  date: string;
  text: string;
};

export async function loadDailyCard(): Promise<DailyCard | null> {
  return readJson<DailyCard | null>("yuvmi.daily-card", null);
}

export async function saveDailyCard(card: DailyCard) {
  await writeJson("yuvmi.daily-card", card);
}

export async function loadDeck(): Promise<DeckCard[]> {
  return readJson(KEYS.deck, [
    { id: "1", text: "Bugün kendine karşı nazik ol." },
    { id: "2", text: "Minimum hâli de sayılır." },
    { id: "3", text: "Bir adım yeter." },
    { id: "4", text: "Dönmek de ilerlemektir." },
  ]);
}

export async function saveDeck(items: DeckCard[]) {
  await writeJson(KEYS.deck, items);
}

export async function loadWaves(): Promise<WaveItem[]> {
  return readJson(KEYS.waves, [
    { id: "w1", name: "Sosyal medya scroll", count: 0 },
    { id: "w2", name: "Şeker", count: 0 },
  ]);
}

export async function saveWaves(items: WaveItem[]) {
  await writeJson(KEYS.waves, items);
}

export async function loadExtraDomains(): Promise<string[]> {
  return readJson(KEYS.extraDomains, []);
}

export async function saveExtraDomains(domains: string[]) {
  await writeJson(KEYS.extraDomains, domains);
}

/**
 * Ben sekmesi ilk açıldığında görünen boş baloncuklar. Kasıtlı olarak dört
 * tane: fotoğrafın iki yanındaki sütunları tam dolduruyorlar. Kullanıcı
 * silerse geri gelmezler — `loadSelfProfile` yalnızca anahtar hiç
 * yazılmamışken tohumluyor.
 */
const SELF_SEED_BUBBLES: readonly SelfBubble[] = [
  { id: "s-color", question: "En sevdiğin renk?", answer: "" },
  { id: "s-age", question: "Kaç yaşındasın?", answer: "" },
  { id: "s-emoji", question: "Seni anlatan emoji?", answer: "" },
  { id: "s-joy", question: "Seni mutlu eden?", answer: "" },
];

export async function loadSelfProfile(): Promise<SelfProfile> {
  const raw = await readJson<Partial<SelfProfile>>(KEYS.self, {});
  return {
    photoUri: raw.photoUri,
    name: raw.name,
    motto: raw.motto ?? "",
    // `?? ` — `|| ` değil: kullanıcı tüm baloncukları sildiyse boş dizi
    // korunmalı, yeniden tohumlanmamalı.
    bubbles: raw.bubbles ?? SELF_SEED_BUBBLES.map((b) => ({ ...b })),
  };
}

export async function saveSelfProfile(profile: SelfProfile) {
  await writeJson(KEYS.self, profile);
}

export type ShopTab = "garden" | "seal" | "sound";

export type ShopFind = {
  tab: ShopTab;
  name: string;
  emoji: string;
  boughtAt: string;
};

export function shopItemKey(tab: string, name: string) {
  return `${tab}:${name}`;
}

export async function loadShopInventory(): Promise<ShopFind[]> {
  const raw = await readJson<ShopFind[]>(KEYS.shop, []);
  return Array.isArray(raw) ? raw : [];
}

export async function addShopFind(find: ShopFind): Promise<ShopFind[]> {
  const all = await loadShopInventory();
  if (all.some((item) => item.tab === find.tab && item.name === find.name)) return all;
  const next = [...all, find];
  await writeJson(KEYS.shop, next);
  return next;
}

export type CompanionMsg = {
  role: "ai" | "user";
  text: string;
  playbookId?: string;
  playbookTitle?: string;
  cardDismissed?: boolean;
};

export type CompanionThread = {
  id: string;
  updatedAt: string;
  messages: CompanionMsg[];
};

export type CompanionStore = {
  activeId: string;
  threads: CompanionThread[];
};

const MAX_COMPANION_MSGS = 40;
const MAX_COMPANION_THREADS = 20;

function isCompanionMsg(value: unknown): value is CompanionMsg {
  if (!value || typeof value !== "object") return false;
  const row = value as CompanionMsg;
  return (row.role === "ai" || row.role === "user") && typeof row.text === "string";
}

function emptyCompanionStore(): CompanionStore {
  return { activeId: "", threads: [] };
}

export async function loadCompanionStore(): Promise<CompanionStore> {
  const raw = await readJson<unknown>(KEYS.companion, null);
  if (Array.isArray(raw) && raw.some(isCompanionMsg)) {
    const messages = raw.filter(isCompanionMsg).slice(-MAX_COMPANION_MSGS);
    const thread: CompanionThread = {
      id: "legacy",
      updatedAt: new Date().toISOString(),
      messages,
    };
    return { activeId: thread.id, threads: [thread] };
  }
  if (raw && typeof raw === "object" && "threads" in raw) {
    const parsed = raw as CompanionStore;
    const threads = (parsed.threads ?? []).filter((t) => t?.id && Array.isArray(t.messages));
    return {
      activeId: parsed.activeId ?? threads[0]?.id ?? "",
      threads,
    };
  }
  return emptyCompanionStore();
}

export async function saveCompanionStore(store: CompanionStore) {
  await writeJson(KEYS.companion, {
    activeId: store.activeId,
    threads: store.threads.slice(0, MAX_COMPANION_THREADS).map((t) => ({
      ...t,
      messages: t.messages.slice(-MAX_COMPANION_MSGS),
    })),
  });
}

/** Profil fotoğrafının kopyalandığı kalıcı klasör (documentDirectory altında). */
const SELF_PHOTO_DIR = "self-photo/";

function selfPhotoDir(): string | null {
  const docDir = FileSystem.documentDirectory;
  return docDir ? `${docDir}${SELF_PHOTO_DIR}` : null;
}

/**
 * Seçiciden gelen URI (özellikle web'de `blob:`) bellek ve sekme ömrüne bağlı;
 * bir süre sonra sessizce boşalır. Native'de dosyayı kalıcı dizine kopyalarız.
 * Web'de / kopya başarısızsa data URL yazarız — Image onu yeniden çizebilir.
 */
export async function persistSelfPhoto(
  sourceUri: string,
  previousUri?: string,
  picked?: { base64?: string | null; mimeType?: string | null },
): Promise<string> {
  if (picked?.base64) {
    const mime = picked.mimeType?.trim() || "image/jpeg";
    return `data:${mime};base64,${picked.base64}`;
  }

  const dir = selfPhotoDir();
  if (dir && !sourceUri.startsWith("blob:") && !sourceUri.startsWith("data:")) {
    try {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      const lastSegment = (sourceUri.split("/").pop() ?? "").split("?")[0];
      const ext = /\.([a-zA-Z0-9]{1,5})$/.exec(lastSegment)?.[1] ?? "jpg";
      const target = `${dir}profile-${Date.now()}.${ext}`;
      await FileSystem.copyAsync({ from: sourceUri, to: target });
      if (previousUri?.startsWith(dir)) {
        await FileSystem.deleteAsync(previousUri, { idempotent: true });
      }
      return target;
    } catch {
      // data URL'ye düş
    }
  }

  if (sourceUri.startsWith("data:")) return sourceUri;

  try {
    const res = await fetch(sourceUri);
    const blob = await res.blob();
    const dataUrl = await blobToDataUrl(blob);
    if (typeof URL !== "undefined" && sourceUri.startsWith("blob:")) {
      URL.revokeObjectURL(sourceUri);
    }
    return dataUrl;
  } catch {
    return sourceUri;
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("photo encode failed"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("photo encode failed"));
    reader.readAsDataURL(blob);
  });
}

export function moodFromCheckin(mood: number): MoodLevel {
  if (mood <= 1) return 1;
  if (mood <= 2) return 2;
  if (mood <= 3) return 2;
  if (mood <= 4) return 3;
  return 4;
}

export function moodFromScore(score: number): MoodLevel {
  if (score >= 80) return 4;
  if (score >= 55) return 3;
  if (score >= 30) return 2;
  if (score > 0) return 1;
  return 0;
}
