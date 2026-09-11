import React from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";
import { BRAND_NAME, PAYMENT_METHODS, colors, radius, spacing } from "@/src/theme";

const LINKS: { key: string; label: string; icon: React.ComponentProps<typeof Ionicons>["name"] }[] = [
  { key: "about", label: "About Us", icon: "information-circle-outline" },
  { key: "contact", label: "Contact", icon: "mail-outline" },
  { key: "track", label: "Track Order", icon: "cube-outline" },
  { key: "shipping", label: "Shipping & Returns", icon: "airplane-outline" },
  { key: "faq", label: "FAQ", icon: "help-circle-outline" },
];

export default function MenuScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.title}>Menu</Text>
        <Text style={styles.subtitle}>{BRAND_NAME} · Fashion rayon nyaman untuk keseharian.</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
        {LINKS.map((l) => (
          <Pressable key={l.key} style={styles.row} testID={`menu-${l.key}`}>
            <Ionicons name={l.icon} size={20} color={colors.onSurface} />
            <Text style={styles.rowText}>{l.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        ))}

        <Text style={styles.section}>Follow us</Text>
        <View style={styles.socialRow}>
          {(["logo-instagram", "logo-tiktok", "logo-twitter", "logo-youtube"] as const).map((n) => (
            <Pressable
              key={n}
              style={styles.socialBtn}
              onPress={() => Linking.openURL("https://instagram.com")}
              testID={`social-${n}`}
            >
              <Ionicons name={n} size={20} color={colors.onSurface} />
            </Pressable>
          ))}
        </View>

        <Text style={styles.section}>Payment methods</Text>
        <View style={styles.paymentsRow}>
          {PAYMENT_METHODS.map((p) => (
            <View key={p} style={styles.paymentPill} testID={`payment-${p}`}>
              <Text style={styles.paymentText}>{p}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.copy}>© 2026 {BRAND_NAME}. All rights reserved.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomColor: colors.divider,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 28, fontWeight: "900", color: colors.onSurface, letterSpacing: -0.5 },
  subtitle: { color: colors.muted, marginTop: 2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomColor: colors.divider,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.onSurface },
  section: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
    color: colors.muted,
  },
  socialRow: { flexDirection: "row", gap: spacing.md },
  socialBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentsRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  paymentPill: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
  paymentText: { fontWeight: "700", fontSize: 12, color: colors.onSurface, letterSpacing: 0.5 },
  copy: { color: colors.muted, fontSize: 11, marginTop: spacing.xxl, textAlign: "center" },
});
