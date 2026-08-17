import { router } from "expo-router";
import { ApiError } from "@/lib/api/client";
import { alert } from "@/lib/alert";
import { isPremiumRequiredError } from "@/hooks/useSubscription";

type UpsellOptions = {
  feature?: string;
  onCancel?: () => void;
};

export function promptPremiumUpsell(err: unknown, options: UpsellOptions = {}) {
  if (!(err instanceof ApiError) || !isPremiumRequiredError(err.code)) {
    return false;
  }

  const feature = options.feature ?? "Bu özellik";
  alert(
    "Premium gerekli",
    `${feature} Premium plana dahil. Premium'a geçerek devam edebilirsin.`,
    [
      { text: "Vazgeç", style: "cancel", onPress: options.onCancel },
      { text: "Premium'u keşfet", onPress: () => router.push("/premium") },
    ],
  );
  return true;
}
