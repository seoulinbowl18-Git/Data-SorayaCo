import React, { useState } from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";

import { API, colors, radius, spacing } from "@/src/theme";
import { formatPrice, useCart } from "@/src/context/CartContext";

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const { items, subtotal, count, increment, decrement, removeItem, clear } = useCart();
  const [busy, setBusy] = useState(false);
  const lines = Object.values(items);

  const checkout = async () => {
    if (busy || lines.length === 0) return;
    setBusy(true);
    try {
      const payload = {
        items: lines.map((l) => ({ product_id: l.product.id, quantity: l.quantity })),
      };
      const res = await fetch(`${API}/api/checkout/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail ?? "Checkout failed");

      if (Platform.OS === "web") {
        window.location.assign(data.checkout_url);
      } else {
        await WebBrowser.openBrowserAsync(data.checkout_url);
      }
    } catch (e: any) {
      Alert.alert("Checkout error", e?.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.title}>Cart</Text>
        <Text style={styles.subtitle}>{count} item{count === 1 ? "" : "s"}</Text>
      </View>

      {lines.length === 0 ? (
        <View style={styles.empty} testID="empty-cart">
          <Ionicons name="bag-outline" size={64} color={colors.muted} />
          <Text style={styles.emptyTitle}>Your bag is empty</Text>
          <Text style={styles.emptyText}>Discover minimalist fashion built to last.</Text>
          <Pressable
            style={styles.continue}
            onPress={() => router.push("/(tabs)")}
            testID="continue-shopping-btn"
          >
            <Text style={styles.continueText}>Continue Shopping</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={{ padding: spacing.lg, paddingBottom: 220 }}
            showsVerticalScrollIndicator={false}
          >
            {lines.map((line) => (
              <View key={line.product.id} style={styles.row} testID={`cart-line-${line.product.id}`}>
                <Image source={{ uri: line.product.image }} style={styles.thumb} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={2}>{line.product.name}</Text>
                  <Text style={styles.price}>{formatPrice(line.product.price)}</Text>
                  <View style={styles.qtyRow}>
                    <Pressable
                      style={styles.qtyBtn}
                      onPress={() => decrement(line.product.id)}
                      testID={`decrement-${line.product.id}`}
                    >
                      <Ionicons name="remove" size={16} color={colors.onSurface} />
                    </Pressable>
                    <Text style={styles.qtyText}>{line.quantity}</Text>
                    <Pressable
                      style={styles.qtyBtn}
                      onPress={() => increment(line.product.id)}
                      testID={`increment-${line.product.id}`}
                    >
                      <Ionicons name="add" size={16} color={colors.onSurface} />
                    </Pressable>
                    <View style={{ flex: 1 }} />
                    <Pressable
                      onPress={() => removeItem(line.product.id)}
                      testID={`remove-${line.product.id}`}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.muted} />
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
            <Pressable onPress={clear} style={{ padding: spacing.md, alignItems: "center" }}>
              <Text style={{ color: colors.muted, fontWeight: "600" }}>Clear cart</Text>
            </Pressable>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: spacing.md }]}>
            <View style={styles.subRow}>
              <Text style={styles.subLabel}>Subtotal</Text>
              <Text style={styles.subValue} testID="cart-subtotal">{formatPrice(subtotal)}</Text>
            </View>
            <Pressable
              style={[styles.checkoutBtn, busy && { opacity: 0.7 }]}
              onPress={checkout}
              disabled={busy}
              testID="checkout-btn"
            >
              <Text style={styles.checkoutText}>{busy ? "Opening Stripe…" : "Checkout with Stripe"}</Text>
              {!busy ? <Ionicons name="arrow-forward" size={16} color={colors.onBrand} /> : null}
            </Pressable>
            <Text style={styles.footerNote}>Secure payments powered by Stripe · Test mode</Text>
          </View>
        </>
      )}
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

  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: colors.onSurface, marginTop: spacing.md },
  emptyText: { color: colors.muted, textAlign: "center" },
  continue: {
    marginTop: spacing.lg,
    backgroundColor: colors.brand,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  continueText: { color: colors.onBrand, fontWeight: "800", letterSpacing: 0.4 },

  row: {
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomColor: colors.divider,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thumb: {
    width: 88,
    height: 110,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.sm,
  },
  name: { fontSize: 14, fontWeight: "700", color: colors.onSurface },
  price: { marginTop: 4, fontSize: 14, fontWeight: "800", color: colors.onSurface },

  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: { minWidth: 20, textAlign: "center", fontWeight: "700" },

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopColor: colors.divider,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  subRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  subLabel: { color: colors.muted, fontSize: 14 },
  subValue: { fontSize: 22, fontWeight: "900", color: colors.onSurface },
  checkoutBtn: {
    backgroundColor: colors.brand,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  checkoutText: { color: colors.onBrand, fontWeight: "800", letterSpacing: 0.5, fontSize: 15 },
  footerNote: { color: colors.muted, fontSize: 11, textAlign: "center" },
});
