import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";
import { router } from "expo-router";

import { BRAND_NAME, colors, radius, spacing } from "@/src/theme";
import { useAuth } from "@/src/context/AuthContext";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { status, signIn } = useAuth();
  const [busy, setBusy] = useState(false);

  // If user becomes authenticated during this screen, pop back
  useEffect(() => {
    if (status === "authenticated") {
      // Small timeout to allow state to settle before navigating
      const t = setTimeout(() => {
        if (router.canGoBack()) router.back();
        else router.replace("/(tabs)");
      }, 100);
      return () => clearTimeout(t);
    }
  }, [status]);

  const handleSignIn = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await signIn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.lg }]}>
      <Pressable style={styles.close} onPress={() => router.back()} testID="login-close">
        <Ionicons name="close" size={22} color={colors.onSurface} />
      </Pressable>

      <View style={styles.center}>
        <Image
          source={{ uri: "https://images.unsplash.com/photo-1520639888713-7851133b1ed0?crop=entropy&cs=srgb&fm=jpg&q=85&w=800" }}
          style={styles.hero}
        />
        <Text style={styles.brand}>{BRAND_NAME}</Text>
        <Text style={styles.title}>Sign in to your account</Text>
        <Text style={styles.subtitle}>
          Save your bag, track orders, and check out faster next time.
        </Text>
      </View>

      <View style={styles.footer}>
        <Pressable
          style={[styles.gBtn, busy && { opacity: 0.7 }]}
          onPress={handleSignIn}
          disabled={busy}
          testID="google-signin-btn"
        >
          {busy ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="logo-google" size={18} color="#FFF" />
              <Text style={styles.gBtnText}>Continue with Google</Text>
            </>
          )}
        </Pressable>
        <Pressable onPress={() => router.back()} testID="continue-as-guest">
          <Text style={styles.guest}>Continue as guest</Text>
        </Pressable>
        <Text style={styles.legal}>
          By continuing you agree to our Terms and acknowledge our Privacy Policy.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
  },
  close: { alignSelf: "flex-end", padding: spacing.sm },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md },
  hero: {
    width: 220,
    height: 220,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSecondary,
  },
  brand: {
    marginTop: spacing.lg,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 2,
    color: colors.onSurface,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.onSurface,
    textAlign: "center",
    marginTop: spacing.sm,
    letterSpacing: -0.3,
  },
  subtitle: {
    color: colors.muted,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
    lineHeight: 20,
  },
  footer: { gap: spacing.md, alignItems: "center" },
  gBtn: {
    backgroundColor: colors.brand,
    width: "100%",
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  gBtnText: {
    color: colors.onBrand,
    fontWeight: "800",
    fontSize: 15,
    letterSpacing: 0.4,
  },
  guest: {
    color: colors.muted,
    fontWeight: "700",
    padding: spacing.sm,
  },
  legal: {
    color: colors.muted,
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
  },
});
