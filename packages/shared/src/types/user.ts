/** Unique identifier */
export type ID = string;

/** ISO 8601 date string (YYYY-MM-DD) */
export type DateString = string;

/** ISO 8601 datetime string */
export type DateTimeString = string;

/** Life domains the user tracks */
export type LifeDomain =
  | "career"
  | "relationships"
  | "health"
  | "finance"
  | "personal_growth"
  | "creativity"
  | "peace"
  | "freedom";

/** Mood / energy level for daily check-ins */
export type MoodLevel = 1 | 2 | 3 | 4 | 5;

export interface User {
  id: ID;
  email: string;
  displayName: string;
  avatarUrl?: string;
  locale: string;
  timezone: string;
  createdAt: DateTimeString;
  updatedAt: DateTimeString;
}

/** The user's envisioned future self — who they want to become */
export interface FutureSelf {
  id: ID;
  userId: ID;
  title: string;
  description: string;
  domains: LifeDomain[];
  /** Short affirmations in the voice of future self */
  affirmations: string[];
  /** Target vision images / references */
  visionItems: VisionItem[];
  createdAt: DateTimeString;
  updatedAt: DateTimeString;
}

export interface VisionItem {
  id: ID;
  domain: LifeDomain;
  title: string;
  imageUrl?: string;
  note?: string;
  sortOrder: number;
}

/** Daily "today" snapshot — where the user is right now */
export interface TodayEntry {
  id: ID;
  userId: ID;
  date: DateString;
  mood: MoodLevel;
  energy: MoodLevel;
  gratitude: string[];
  reflection: string;
  /** Self-assessment per domain (1-5) */
  domainScores: Partial<Record<LifeDomain, MoodLevel>>;
  createdAt: DateTimeString;
  updatedAt: DateTimeString;
}

/** @deprecated Prefer AlignmentSnapshot — includes transparent factor breakdown */
export interface SelfGapAnalysis {
  userId: ID;
  date: DateString;
  overallAlignment: number;
  domainGaps: Partial<
    Record<
      LifeDomain,
      {
        current: MoodLevel;
        target: MoodLevel;
        gap: number;
      }
    >
  >;
}

export interface DailyRitual {
  id: ID;
  userId: ID;
  type: "morning" | "evening";
  affirmationIds: ID[];
  completedAt?: DateTimeString;
  durationSeconds?: number;
}
