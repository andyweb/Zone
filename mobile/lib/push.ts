// Registrazione notifiche push Expo (sezione 5.3).
//
// Chiede il permesso notifiche, configura il canale Android e ottiene l'Expo
// push token da inviare al backend (PUT /users/push-token). Se il permesso è
// negato o il token non è ottenibile (es. simulatore), ritorna null: l'app
// resta perfettamente usabile senza push.

import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Notifica in foreground: mostra il banner in lista (niente suono/badge per
// non disturbare). SDK 54: shouldShowBanner/shouldShowList sostituiscono
// shouldShowAlert.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Segnalazioni vicine",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  try {
    // projectId è richiesto sui dev/production build con EAS; in Expo Go è
    // facoltativo. Lo passiamo solo se presente.
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      (Constants as any)?.easConfig?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return tokenData.data;
  } catch {
    return null;
  }
}
