import { useAuth } from "@/context/AuthContext";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { usePushNotifications } from "@/hooks/usePushNotifications";

/** Side-effect hooks that must run once the user session is available. */
export function AppEffects() {
  const { user } = useAuth();
  usePushNotifications(user?.token);
  useOfflineQueue(user?.token);
  return null;
}
