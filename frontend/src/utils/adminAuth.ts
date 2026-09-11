import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const KEY = "sorayaco_admin_secret";

export const adminStorage = {
  async get(): Promise<string | null> {
    if (Platform.OS === "web") {
      try {
        return typeof window !== "undefined" ? window.localStorage.getItem(KEY) : null;
      } catch {
        return null;
      }
    }
    try {
      return await SecureStore.getItemAsync(KEY);
    } catch {
      return null;
    }
  },
  async set(secret: string) {
    if (Platform.OS === "web") {
      try {
        window.localStorage.setItem(KEY, secret);
      } catch {}
      return;
    }
    try {
      await SecureStore.setItemAsync(KEY, secret);
    } catch {}
  },
  async clear() {
    if (Platform.OS === "web") {
      try {
        window.localStorage.removeItem(KEY);
      } catch {}
      return;
    }
    try {
      await SecureStore.deleteItemAsync(KEY);
    } catch {}
  },
};
