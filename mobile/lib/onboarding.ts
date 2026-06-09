// Persistenza del flag "onboarding completato" (disclaimer accettato).

import * as SecureStore from "expo-secure-store";

const KEY = "onboarding_done";

export async function isOnboardingDone(): Promise<boolean> {
  return (await SecureStore.getItemAsync(KEY)) === "1";
}

export async function setOnboardingDone(): Promise<void> {
  await SecureStore.setItemAsync(KEY, "1");
}
