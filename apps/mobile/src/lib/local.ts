import AsyncStorage from "@react-native-async-storage/async-storage";

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

export type WaveItem = {
  id: string;
  name: string;
  count: number;
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
  dailyCard: "yuvmi.daily-card",
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
 */
export async function clearLocalUserData(): Promise<void> {
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

export async function loadDailyCard(): Promise<{ date: string; text: string } | null> {
  return readJson(KEYS.dailyCard, null);
}

export async function saveDailyCard(card: { date: string; text: string }) {
  await writeJson(KEYS.dailyCard, card);
}

export async function loadExtraDomains(): Promise<string[]> {
  return readJson(KEYS.extraDomains, []);
}

export async function saveExtraDomains(domains: string[]) {
  await writeJson(KEYS.extraDomains, domains);
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
