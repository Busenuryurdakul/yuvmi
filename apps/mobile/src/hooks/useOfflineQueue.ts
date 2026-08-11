import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
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

async function loadQueue(): Promise<OfflineQueueItem[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as OfflineQueueItem[];
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
    } else if (item.type === "task_complete" || item.type === "task_skip") {
      taskActions.set(item.payload.taskId, item);
    }
  }

  const out: OfflineQueueItem[] = [];
  if (checkin) out.push(checkin);
  out.push(...taskActions.values());
  return out;
}

function isStaleError(error: unknown): boolean {
  return error instanceof ApiError && (error.code === 404 || error.code === 409);
}

export function useOfflineQueue(token: string | null | undefined) {
  const [pendingCount, setPendingCount] = useState(0);
  const [flushing, setFlushing] = useState(false);

  const refreshCount = useCallback(async () => {
    const items = dedupeQueue(await loadQueue());
    setPendingCount(items.length);
  }, []);

  const enqueue = useCallback(
    async (item: Omit<OfflineQueueItem, "id" | "createdAt">) => {
      const items = dedupeQueue(await loadQueue());
      const next: OfflineQueueItem = {
        ...item,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
      } as OfflineQueueItem;

      if (item.type === "checkin") {
        const withoutCheckins = items.filter((i) => i.type !== "checkin");
        await saveQueue(dedupeQueue([...withoutCheckins, next]));
      } else {
        const taskId = item.payload.taskId;
        const withoutTask = items.filter(
          (i) =>
            (i.type !== "task_complete" && i.type !== "task_skip") ||
            i.payload.taskId !== taskId,
        );
        await saveQueue(dedupeQueue([...withoutTask, next]));
      }
      await refreshCount();
    },
    [refreshCount],
  );

  const flush = useCallback(async () => {
    if (!token || flushing) return;
    const items = dedupeQueue(await loadQueue());
    if (items.length === 0) return;

    setFlushing(true);
    const remaining: OfflineQueueItem[] = [];

    for (const item of items) {
      try {
        if (item.type === "checkin") {
          await upsertCheckin(token, item.payload);
        } else if (item.type === "task_complete") {
          await completeTask(token, item.payload.taskId);
        } else if (item.type === "task_skip") {
          await skipTask(token, item.payload.taskId, item.payload.reason);
        }
      } catch (error) {
        if (isStaleError(error)) {
          continue;
        }
        remaining.push(item);
      }
    }

    await saveQueue(remaining);
    setPendingCount(remaining.length);
    setFlushing(false);
  }, [token, flushing]);

  useEffect(() => {
    void refreshCount();
  }, [refreshCount]);

  useEffect(() => {
    if (!token) return;
    void flush();
    const interval = setInterval(() => void flush(), 30_000);
    return () => clearInterval(interval);
  }, [token, flush]);

  return { pendingCount, flushing, enqueue, flush, refreshCount };
}

export async function enqueueOfflineItem(item: Omit<OfflineQueueItem, "id" | "createdAt">) {
  const items = dedupeQueue(await loadQueue());
  const next = {
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  } as OfflineQueueItem;

  if (item.type === "checkin") {
    await saveQueue(dedupeQueue([...items.filter((i) => i.type !== "checkin"), next]));
  } else {
    const taskId = item.payload.taskId;
    await saveQueue(
      dedupeQueue([
        ...items.filter(
          (i) =>
            (i.type !== "task_complete" && i.type !== "task_skip") ||
            i.payload.taskId !== taskId,
        ),
        next,
      ]),
    );
  }
}
