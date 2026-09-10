import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { API } from "@/src/theme";
import { authStorage } from "@/src/utils/authStorage";

WebBrowser.maybeCompleteAuthSession();

export type AuthUser = {
  user_id: string;
  email: string;
  name?: string | null;
  picture?: string | null;
};

type AuthState = {
  status: "loading" | "authenticated" | "unauthenticated";
  user: AuthUser | null;
  token: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  authFetch: (path: string, init?: RequestInit) => Promise<Response>;
};

const AuthContext = createContext<AuthState | null>(null);

function extractSessionId(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(/[?#&]session_id=([^&#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthState["status"]>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  const processedSessionIds = useRef<Set<string>>(new Set());
  const capturedDeepLinkUrlRef = useRef<string | null>(null);

  const applySession = useCallback(async (newToken: string, newUser: AuthUser) => {
    tokenRef.current = newToken;
    await authStorage.set(newToken);
    setToken(newToken);
    setUser(newUser);
    setStatus("authenticated");
  }, []);

  const clearSession = useCallback(async () => {
    tokenRef.current = null;
    await authStorage.clear();
    setToken(null);
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const exchangeSessionId = useCallback(
    async (sessionId: string) => {
      if (processedSessionIds.current.has(sessionId)) return;
      processedSessionIds.current.add(sessionId);
      try {
        const res = await fetch(`${API}/api/auth/session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.session_token && data?.user) {
          await applySession(data.session_token, data.user);
        }
      } catch {}
    },
    [applySession],
  );

  // Bootstrap: check web URL for session_id first, else validate stored token
  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      // Web: detect session_id in URL first (hash or query)
      if (Platform.OS === "web" && typeof window !== "undefined") {
        const fullUrl = window.location.href;
        const sid = extractSessionId(fullUrl);
        if (sid) {
          await exchangeSessionId(sid);
          // Clean session_id from URL preserving other params
          try {
            const url = new URL(window.location.href);
            url.searchParams.delete("session_id");
            let hash = url.hash;
            if (hash.includes("session_id")) {
              hash = hash
                .replace(/(^|[#&])session_id=[^&]*/g, "")
                .replace(/^#&/, "#")
                .replace(/^#$/, "");
            }
            window.history.replaceState(
              window.history.state,
              "",
              `${url.pathname}${url.search}${hash}`,
            );
          } catch {}
          if (!cancelled) return;
        }
      }

      // Mobile: check cold-start deep link
      if (Platform.OS !== "web") {
        try {
          const initial = await Linking.getInitialURL();
          const sid = extractSessionId(initial);
          if (sid) {
            await exchangeSessionId(sid);
            if (!cancelled) return;
          }
        } catch {}
      }

      // Otherwise validate stored token
      const stored = await authStorage.get();
      if (!stored) {
        if (!cancelled) setStatus("unauthenticated");
        return;
      }
      try {
        const res = await fetch(`${API}/api/auth/me`, {
          headers: { Authorization: `Bearer ${stored}` },
        });
        if (res.ok) {
          const u = await res.json();
          if (!cancelled) {
            tokenRef.current = stored;
            setToken(stored);
            setUser(u);
            setStatus("authenticated");
          }
        } else {
          await authStorage.clear();
          if (!cancelled) setStatus("unauthenticated");
        }
      } catch {
        if (!cancelled) setStatus("unauthenticated");
      }
    };

    bootstrap();

    // Mobile: register listener for hot deep links (also capture before openAuthSessionAsync returns)
    const sub =
      Platform.OS !== "web"
        ? Linking.addEventListener("url", ({ url }) => {
            capturedDeepLinkUrlRef.current = url;
            const sid = extractSessionId(url);
            if (sid) exchangeSessionId(sid);
          })
        : null;

    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [exchangeSessionId]);

  const signIn = useCallback(async () => {
    const redirectUrl =
      Platform.OS === "web"
        ? `${window.location.origin}/`
        : Linking.createURL("");
    const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(
      redirectUrl,
    )}`;

    if (Platform.OS === "web") {
      window.location.href = authUrl;
      return;
    }

    capturedDeepLinkUrlRef.current = null;
    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

    // Try result.url, then captured deep link, then getInitialURL
    let callbackUrl: string | null = (result as any)?.url ?? null;
    if (!callbackUrl) callbackUrl = capturedDeepLinkUrlRef.current;
    if (!callbackUrl) {
      try {
        callbackUrl = await Linking.getInitialURL();
      } catch {
        callbackUrl = null;
      }
    }
    const sid = extractSessionId(callbackUrl);
    if (sid) {
      await exchangeSessionId(sid);
    }
  }, [exchangeSessionId]);

  const signOut = useCallback(async () => {
    const t = tokenRef.current;
    if (t) {
      try {
        await fetch(`${API}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${t}` },
        });
      } catch {}
    }
    await clearSession();
  }, [clearSession]);

  const authFetch = useCallback(
    async (path: string, init: RequestInit = {}) => {
      const t = tokenRef.current;
      const headers = new Headers(init.headers || {});
      if (t) headers.set("Authorization", `Bearer ${t}`);
      const res = await fetch(`${API}${path}`, { ...init, headers });
      if (res.status === 401) {
        await clearSession();
      }
      return res;
    },
    [clearSession],
  );

  return (
    <AuthContext.Provider
      value={{ status, user, token, signIn, signOut, authFetch }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
