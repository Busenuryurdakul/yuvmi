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

export type AppPrefs = {
  quietWeek: boolean;
  darkMode: boolean;
  appLock: boolean;
  morningReminder: string;
  eveningReminder: string;
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
};

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
  return readJson(KEYS.prefs, {
    quietWeek: false,
    darkMode: false,
    appLock: true,
    morningReminder: "08:00",
    eveningReminder: "21:30",
  });
}

export async function savePrefs(prefs: AppPrefs) {
  await writeJson(KEYS.prefs, prefs);
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
