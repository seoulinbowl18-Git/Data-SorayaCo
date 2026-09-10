import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";
import { API, colors, radius, spacing } from "@/src/theme";
import { formatPrice, Product, useCart } from "@/src/context/CartContext";

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { addItem, count } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`${API}/api/products/${id}`)
      .then((r) => r.json())
      .then((data) => !cancelled && setProduct(data))
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleAdd = () => {
    if (!product) return;
    addItem(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1000);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()} testID="back-btn">
          <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
        </Pressable>
        <Pressable
          style={styles.iconBtn}
          onPress={() => router.push("/(tabs)/cart")}
          testID="detail-cart-btn"
        >
          <Ionicons name="bag-outline" size={22} color={colors.onSurface} />
          {count > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{count > 9 ? "9+" : count}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {loading || !product ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
            <View style={styles.gallery}>
              <Image source={{ uri: product.image }} style={styles.image} />
            </View>
            <View style={{ padding: spacing.lg, gap: spacing.md }}>
              <Text style={styles.category}>{product.category.toUpperCase()}</Text>
              <Text style={styles.name}>{product.name}</Text>
              <View style={styles.priceRow}>
                <Text style={styles.priceNow}>{formatPrice(product.price)}</Text>
                {product.original_price ? (
                  <Text style={styles.priceOld}>{formatPrice(product.original_price)}</Text>
                ) : null}
              </View>
              <View style={styles.divider} />
              <Text style={styles.descHead}>Description</Text>
              <Text style={styles.desc}>{product.description}</Text>
            </View>
          </ScrollView>

          <View style={[styles.stickyFooter, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
            <Pressable
              style={[styles.cta, added && { backgroundColor: colors.success }]}
              onPress={handleAdd}
              testID="detail-add-to-cart"
            >
              <Text style={styles.ctaText}>{added ? "Added to Cart ✓" : "Add to Cart"}</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#FFF", fontSize: 9, fontWeight: "800" },
  gallery: { width: "100%", aspectRatio: 4 / 5, backgroundColor: colors.surfaceSecondary },
  image: { width: "100%", height: "100%" },
  category: { color: colors.muted, fontWeight: "700", letterSpacing: 2, fontSize: 11 },
  name: { fontSize: 26, fontWeight: "900", color: colors.onSurface, letterSpacing: -0.5 },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: spacing.md },
  priceNow: { fontSize: 22, fontWeight: "800", color: colors.onSurface },
  priceOld: { fontSize: 15, color: colors.muted, textDecorationLine: "line-through" },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.md },
  descHead: { fontSize: 13, fontWeight: "800", letterSpacing: 1, color: colors.muted },
  desc: { fontSize: 15, lineHeight: 22, color: colors.onSurfaceSecondary },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  stickyFooter: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopColor: colors.divider,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cta: {
    backgroundColor: colors.brand,
    paddingVertical: 16,
    alignItems: "center",
  },
  ctaText: { color: colors.onBrand, fontWeight: "800", fontSize: 15, letterSpacing: 0.5 },
});
