import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { z } from "zod";
import { ApiError } from "@/lib/api/client";
import { completeTask, skipTask, upsertCheckin } from "@/lib/api/yuvmi";
import type { LifeDomain } from "@yuvmi/shared";

const QUEUE_KEY = "yuvmi_offline_queue";

export type OfflineQueueItem =
  | {
      id: string;
      type: "checkin";
      payload: {
        mood: number;
        energy: number;
        gratitude: string[];
        reflection: string;
        domainScores?: Partial<Record<LifeDomain, number>>;
      };
      createdAt: string;
    }
  | { id: string; type: "task_complete"; payload: { taskId: string }; createdAt: string }
  | {
      id: string;
      type: "task_skip";
      payload: { taskId: string; reason?: string };
      createdAt: string;
    };

type OfflineQueueInput = Omit<OfflineQueueItem, "id" | "createdAt">;
type TaskQueueItem = Extract<
  OfflineQueueItem,
  { type: "task_complete" } | { type: "task_skip" }
>;
type TaskQueueInput = Omit<TaskQueueItem, "id" | "createdAt">;

function isTaskQueueInput(item: OfflineQueueInput): item is TaskQueueInput {
  return item.type === "task_complete" || item.type === "task_skip";
}

function isTaskQueueItem(item: OfflineQueueItem): item is TaskQueueItem {
  return item.type === "task_complete" || item.type === "task_skip";
}

const offlineQueueItemSchema = z.union([
  z.object({
    id: z.string(),
    type: z.literal("checkin"),
    payload: z.object({
      mood: z.number(),
      energy: z.number(),
      gratitude: z.array(z.string()),
      reflection: z.string(),
      domainScores: z.record(z.string(), z.number()).optional(),
    }),
    createdAt: z.string(),
  }),
  z.object({
    id: z.string(),
    type: z.literal("task_complete"),
    payload: z.object({ taskId: z.string() }),
    createdAt: z.string(),
  }),
  z.object({
    id: z.string(),
    type: z.literal("task_skip"),
    payload: z.object({ taskId: z.string(), reason: z.string().optional() }),
    createdAt: z.string(),
  }),
]) satisfies z.ZodType<OfflineQueueItem>;

/** Validates each entry and drops corrupted ones individually, instead of
 *  discarding the whole queue (or crashing) over one bad record. */
async function loadQueue(): Promise<OfflineQueueItem[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((entry) => {
      const result = offlineQueueItemSchema.safeParse(entry);
      return result.success ? [result.data] : [];
    });
  } catch {
    return [];
  }
}

async function saveQueue(items: OfflineQueueItem[]) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

/** Collapse duplicate items — latest check-in wins; one action per task id. */
function dedupeQueue(items: OfflineQueueItem[]): OfflineQueueItem[] {
  const sorted = [...items].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  let checkin: OfflineQueueItem | null = null;
  const taskActions = new Map<string, OfflineQueueItem>();

  for (const item of sorted) {
    if (item.type === "checkin") {
      checkin = item;
    } else if (isTaskQueueItem(item)) {
      taskActions.set(item.payload.taskId, item);
    }
  }

  const out: OfflineQueueItem[] = [];
  if (checkin) out.push(checkin);
  out.push(...taskActions.values());
  return out;
}

/** Whether a failed queued action never reached the server. Only these are
 *  worth retrying — anything the server actually responded to (validation,
 *  forbidden, "already done") will fail the same way every time, so retrying
 *  it forever every 30s just leaves a dead item sitting in the queue. */
function isNetworkError(error: unknown): boolean {
  return error instanceof ApiError && error.code === 0;
}

function filterOutTaskAction(items: OfflineQueueItem[], taskId: string): OfflineQueueItem[] {
  return items.filter((i) => {
    if (isTaskQueueItem(i)) {
      return i.payload.taskId !== taskId;
    }
    return true;
  });
}

export async function enqueueOfflineItem(item: OfflineQueueInput) {
  const items = dedupeQueue(await loadQueue());
  const next = {
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  } as OfflineQueueItem;

  if (item.type === "checkin") {
    await saveQueue(dedupeQueue([...items.filter((i) => i.type !== "checkin"), next]));
  } else if (isTaskQueueInput(item)) {
    const taskId = item.payload.taskId;
    await saveQueue(dedupeQueue([...filterOutTaskAction(items, taskId), next]));
  }
}

/** Module-level, not per-hook-instance: AppEffects and check-in.tsx each
 *  mount their own useOfflineQueue(), and without a shared guard both
 *  instances' 30s intervals can flush the same queued item at the same time,
 *  submitting it twice. */
let flushInFlight = false;

async function flushQueue(): Promise<OfflineQueueItem[]> {
  if (flushInFlight) return dedupeQueue(await loadQueue());
  flushInFlight = true;
  try {
    const items = dedupeQueue(await loadQueue());
    if (items.length === 0) return items;

    const remaining: OfflineQueueItem[] = [];
    for (const item of items) {
      try {
        if (item.type === "checkin") {
          await upsertCheckin(item.payload);
        } else if (item.type === "task_complete") {
          await completeTask(item.payload.taskId);
        } else if (item.type === "task_skip") {
          await skipTask(item.payload.taskId, item.payload.reason);
        }
      } catch (error) {
        if (isNetworkError(error)) {
          remaining.push(item);
        }
        // Non-network failure: the server already ruled on this item and
        // retrying won't change the answer, so drop it instead of retrying
        // forever.
      }
    }

    await saveQueue(remaining);
    return remaining;
  } finally {
    flushInFlight = false;
  }
}

export function useOfflineQueue(token: string | null | undefined) {
  const [pendingCount, setPendingCount] = useState(0);
  const [flushing, setFlushing] = useState(false);

  const refreshCount = useCallback(async () => {
    const items = dedupeQueue(await loadQueue());
    setPendingCount(items.length);
  }, []);

  const enqueue = useCallback(
    async (item: OfflineQueueInput) => {
      await enqueueOfflineItem(item);
      await refreshCount();
    },
    [refreshCount],
  );

  const flush = useCallback(async () => {
    if (!token || flushInFlight) return;
    setFlushing(true);
    try {
      const remaining = await flushQueue();
      setPendingCount(remaining.length);
    } finally {
      setFlushing(false);
    }
  }, [token]);

  useEffect(() => {
    void refreshCount();
  }, [refreshCount]);

  useEffect(() => {
    if (!token) return;

    let interval: ReturnType<typeof setInterval> | null = null;
    const startInterval = () => {
      if (interval) return;
      interval = setInterval(() => void flush(), 30_000);
    };
    const stopInterval = () => {
      if (interval) clearInterval(interval);
      interval = null;
    };

    void flush();
    startInterval();

    // Backgrounded polling just burns battery retrying a connection nobody's
    // waiting on. Pause it, and flush right away on return instead of
    // waiting up to 30s — that's when connectivity most often comes back.
    const subscription = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") {
        void flush();
        startInterval();
      } else {
        stopInterval();
      }
    });

    return () => {
      stopInterval();
      subscription.remove();
    };
  }, [token, flush]);

  return { pendingCount, flushing, enqueue, flush, refreshCount };
}
