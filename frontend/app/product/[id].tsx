import React, { useEffect, useMemo, useState } from "react";
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
import { CATEGORIES, colors, radius, spacing, API } from "@/src/theme";
import { formatPrice, Product, useCart } from "@/src/context/CartContext";
import { resolveImage } from "@/src/utils/image";

function categoryLabel(key: string) {
  const found = CATEGORIES.find((c) => c.key === key);
  return found?.label ?? key;
}

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { addItem, count } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`${API}/api/products/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setProduct(data);
        // default selection
        if (data?.variants?.length) setSelectedVariant(data.variants[0].name);
        if (data?.sizes?.length) setSelectedSize(data.sizes[0]);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const hasVariants = !!product?.variants?.length;
  const hasSizes = !!product?.sizes?.length;
  const primaryCategory = product?.categories?.[0];

  const stockForSelection = useMemo(() => {
    if (!product) return null;
    if (hasVariants) {
      return product.variants.find((v) => v.name === selectedVariant)?.stock ?? null;
    }
    return product.stock ?? null;
  }, [product, selectedVariant, hasVariants]);

  const skuForSelection = useMemo(() => {
    if (!product) return null;
    if (hasVariants) {
      return product.variants.find((v) => v.name === selectedVariant)?.sku ?? null;
    }
    return product.sku ?? null;
  }, [product, selectedVariant, hasVariants]);

  const imageForSelection = useMemo(() => {
    if (!product) return "";
    if (hasVariants) {
      const v = product.variants.find((vr) => vr.name === selectedVariant);
      if (v?.image) return resolveImage(v.image);
    }
    return resolveImage(product.image);
  }, [product, selectedVariant, hasVariants]);

  const handleAdd = () => {
    if (!product) return;
    addItem(product, { variant: selectedVariant, size: selectedSize });
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
          <ScrollView contentContainerStyle={{ paddingBottom: 160 }} showsVerticalScrollIndicator={false}>
            <View style={styles.gallery}>
              <Image source={{ uri: imageForSelection }} style={styles.image} />
            </View>
            <View style={{ padding: spacing.lg, gap: spacing.md }}>
              {primaryCategory ? (
                <Text style={styles.category}>
                  {categoryLabel(primaryCategory).toUpperCase()}
                </Text>
              ) : null}
              <Text style={styles.name}>{product.name}</Text>
              <View style={styles.priceRow}>
                <Text style={styles.priceNow}>{formatPrice(product.price)}</Text>
                {product.original_price ? (
                  <Text style={styles.priceOld}>{formatPrice(product.original_price)}</Text>
                ) : null}
              </View>

              {hasSizes ? (
                <View>
                  <Text style={styles.groupLabel}>Ukuran</Text>
                  <View style={styles.chipRow}>
                    {product.sizes.map((s) => {
                      const active = selectedSize === s;
                      return (
                        <Pressable
                          key={s}
                          onPress={() => setSelectedSize(s)}
                          style={[styles.chip, active && styles.chipActive]}
                          testID={`size-chip-${s}`}
                        >
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>{s}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              {hasVariants ? (
                <View>
                  <View style={styles.variantHead}>
                    <Text style={styles.groupLabel}>
                      Varian Warna / Motif ({product.variants.length})
                    </Text>
                    {selectedVariant ? (
                      <Text style={styles.variantSelected} testID="selected-variant-name">
                        {selectedVariant}
                      </Text>
                    ) : null}
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.variantRow}
                  >
                    {product.variants.map((v) => {
                      const active = selectedVariant === v.name;
                      return (
                        <Pressable
                          key={v.sku}
                          onPress={() => setSelectedVariant(v.name)}
                          style={[styles.variantPill, active && styles.variantPillActive]}
                          testID={`variant-${v.sku}`}
                        >
                          <Text
                            style={[styles.variantText, active && styles.variantTextActive]}
                            numberOfLines={1}
                          >
                            {v.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : null}

              {(skuForSelection || stockForSelection != null) ? (
                <View style={styles.metaRow}>
                  {skuForSelection ? (
                    <Text style={styles.meta} testID="product-sku">SKU · {skuForSelection}</Text>
                  ) : null}
                  {stockForSelection != null ? (
                    <Text style={styles.meta} testID="product-stock">
                      Stok · {stockForSelection}
                    </Text>
                  ) : null}
                </View>
              ) : null}

              <View style={styles.divider} />
              <Text style={styles.descHead}>Deskripsi</Text>
              <Text style={styles.desc}>{product.description}</Text>
            </View>
          </ScrollView>

          <View style={[styles.stickyFooter, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
            <Pressable
              style={[styles.cta, added && { backgroundColor: colors.success }]}
              onPress={handleAdd}
              testID="detail-add-to-cart"
            >
              <Text style={styles.ctaText}>{added ? "Ditambahkan ✓" : "Tambah ke Keranjang"}</Text>
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
  name: { fontSize: 22, fontWeight: "900", color: colors.onSurface, letterSpacing: -0.3, lineHeight: 28 },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: spacing.md },
  priceNow: { fontSize: 22, fontWeight: "800", color: colors.onSurface },
  priceOld: { fontSize: 15, color: colors.muted, textDecorationLine: "line-through" },

  groupLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    minWidth: 56,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  chipActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  chipText: { color: colors.onSurfaceSecondary, fontWeight: "700", fontSize: 13 },
  chipTextActive: { color: colors.onBrand },

  variantHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: spacing.sm,
  },
  variantSelected: {
    color: colors.onSurface,
    fontWeight: "700",
    fontSize: 13,
  },
  variantRow: {
    gap: spacing.sm,
    paddingVertical: 2,
  },
  variantPill: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    maxWidth: 160,
  },
  variantPillActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  variantText: { color: colors.onSurfaceSecondary, fontSize: 13, fontWeight: "600" },
  variantTextActive: { color: colors.onBrand },

  metaRow: { flexDirection: "row", gap: spacing.lg },
  meta: { fontSize: 12, color: colors.muted, fontWeight: "600" },

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
