import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const KEY = "brodo_session_token";

export const authStorage = {
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
  async set(token: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        window.localStorage.setItem(KEY, token);
      } catch {}
      return;
    }
    try {
      await SecureStore.setItemAsync(KEY, token);
    } catch {}
  },
  async clear(): Promise<void> {
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
