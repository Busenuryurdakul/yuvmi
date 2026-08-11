import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
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

export function useOfflineQueue(token: string | null | undefined) {
  const [pendingCount, setPendingCount] = useState(0);
  const [flushing, setFlushing] = useState(false);

  const refreshCount = useCallback(async () => {
    const items = await loadQueue();
    setPendingCount(items.length);
  }, []);

  const enqueue = useCallback(
    async (item: Omit<OfflineQueueItem, "id" | "createdAt">) => {
      const items = await loadQueue();
      items.push({
        ...item,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
      } as OfflineQueueItem);
      await saveQueue(items);
      setPendingCount(items.length);
    },
    [],
  );

  const flush = useCallback(async () => {
    if (!token || flushing) return;
    const items = await loadQueue();
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
      } catch {
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
  const items = await loadQueue();
  items.push({
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  } as OfflineQueueItem);
  await saveQueue(items);
}
